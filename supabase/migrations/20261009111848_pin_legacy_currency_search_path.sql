-- The retained historical formatting function needs no caller-controlled search path.
-- Some installations never had it, so keep the migration compatible with those schemas.
do $$ begin
 if to_regprocedure('public.bg_eur_words(numeric)') is not null then
  alter function public.bg_eur_words(numeric) set search_path = '';
 end if;
end $$;
