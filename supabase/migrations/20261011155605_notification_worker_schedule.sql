-- Internal worker credentials never appear in frontend config or cron SQL.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$begin
  if not exists(select 1 from vault.secrets where name='kfood_checkout_worker') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'kfood_checkout_worker');
  end if;
end$$;
create function public.checkout_worker_secret() returns text language sql stable
security definer set search_path='' as $$
  select decrypted_secret from vault.decrypted_secrets where name='kfood_checkout_worker';
$$;
revoke all on function public.checkout_worker_secret() from public,anon,authenticated;
grant execute on function public.checkout_worker_secret() to service_role;

-- Deployment supplies the verified project URL as a transaction-local setting.
-- A fresh CLI installation may configure the URL later without rotating the key.
do $$declare v_url text:=current_setting('kfood.worker_url',true); v_id uuid;
begin
  if v_url is not null and v_url<>'' then
    if v_url !~ '^https://[a-z]{20}\.supabase\.co/functions/v1/reconcile-checkouts$' then
      raise exception 'Invalid worker URL';
    end if;
    select id into v_id from vault.secrets where name='kfood_checkout_worker_url';
    if v_id is null then perform vault.create_secret(v_url,'kfood_checkout_worker_url');
    else perform vault.update_secret(v_id,v_url); end if;
    perform cron.schedule('kfood-reconcile-notifications','*/2 * * * *',
      $job$select net.http_post(
        url:=(select decrypted_secret from vault.decrypted_secrets where name='kfood_checkout_worker_url'),
        headers:=jsonb_build_object('Content-Type','application/json','x-checkout-worker-secret',
          (select decrypted_secret from vault.decrypted_secrets where name='kfood_checkout_worker')),
        body:='{}'::jsonb, timeout_milliseconds:=110000);$job$);
  end if;
end$$;
revoke all on vault.secrets,vault.decrypted_secrets from public,anon,authenticated;
-- Queue headers contain the worker credential. Restrict both queue and results.
revoke all on all tables in schema net from public,anon,authenticated;
revoke all on all tables in schema cron from public,anon,authenticated;
