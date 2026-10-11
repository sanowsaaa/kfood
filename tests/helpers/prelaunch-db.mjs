// Local-only reconstruction of captured public metadata. Never connects to Supabase.
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

export const snapshot = JSON.parse(await readFile(new URL('../fixtures/prelaunch-production-schema.json', import.meta.url), 'utf8'));
const ident = value => '"' + value.replaceAll('"', '""') + '"';
export const admin = '10000000-0000-4000-8000-000000000001';
export const partner = '10000000-0000-4000-8000-000000000002';
export const stranger = '10000000-0000-4000-8000-000000000003';
export const company = '20000000-0000-4000-8000-000000000001';

export async function database() {
  let db;
  if (process.env.TEST_DATABASE_URL) {
    const url = new URL(process.env.TEST_DATABASE_URL);
    if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname) || url.pathname !== '/kfood_test') {
      throw new Error('Tests require a disposable loopback database named kfood_test');
    }
    const pool = new pg.Pool({ connectionString: url.href, max: 8 });
    db = {
      query: (q,p) => pool.query(q,p), exec: q => pool.query(q), close: () => pool.end(),
      transaction: async fn => {
        const client = await pool.connect();
        const tx = { query: (q,p) => client.query(q,p), exec: q => client.query(q) };
        try { await tx.exec('begin'); const result = await fn(tx); await tx.exec('commit'); return result; }
        catch (error) { await tx.exec('rollback'); throw error; }
        finally { client.release(); }
      },
    };
    // This branch is reachable only after the disposable loopback guard above.
    await db.exec('drop schema if exists storage cascade; drop schema if exists public cascade; drop schema if exists auth cascade; drop schema if exists private cascade; create schema public;');
  } else db = new PGlite();
  await db.exec(`
    do $$begin
      if not exists(select from pg_roles where rolname='anon') then create role anon nologin; end if;
      if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
      if not exists(select from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
    end$$;
    create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
    $$;
    create function auth.jwt() returns jsonb language sql stable as $$
      select jsonb_build_object('email',current_setting('request.jwt.claim.email',true));
    $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant select on auth.users to service_role;
  `);
  const sequenceNames = [...new Set(snapshot.sequence_grants.map(x => x.name))];
  for (const name of sequenceNames) await db.exec(`create sequence public.${ident(name)}`);
  for (const { table } of snapshot.rls) {
    const columns = snapshot.columns.filter(x => x.table === table).map(c => {
      if (c.identity) throw new Error('Identity column needs an explicit fixture implementation');
      return `${ident(c.name)} ${c.type}${c.default ? ' default ' + c.default : ''}${c.not_null ? ' not null' : ''}`;
    });
    await db.exec(`create table public.${ident(table)} (${columns.join(',')})`);
  }
  for (const c of [...snapshot.constraints.filter(c => c.type !== 'f'), ...snapshot.constraints.filter(c => c.type === 'f')])
    await db.exec(`alter table public.${ident(c.table)} add constraint ${ident(c.name)} ${c.definition}`);
  const constrained = new Set(snapshot.constraints.map(x => x.name));
  for (const i of snapshot.indexes) if (!constrained.has(i.name)) await db.exec(i.definition);
  for (const r of snapshot.rls) {
    if (r.enabled) await db.exec(`alter table public.${ident(r.table)} enable row level security`);
    if (r.forced) await db.exec(`alter table public.${ident(r.table)} force row level security`);
  }
  for (const p of snapshot.policies) await db.exec(`create policy ${ident(p.policyname)} on public.${ident(p.tablename)} as ${p.permissive} for ${p.cmd} to ${p.roles.map(ident).join(',')} ${p.qual ? 'using (' + p.qual + ')' : ''} ${p.with_check ? 'with check (' + p.with_check + ')' : ''}`);
  for (const g of snapshot.grants) await db.exec(`grant ${g.privilege} on public.${ident(g.table)} to ${ident(g.grantee)}`);
  for (const g of snapshot.sequence_grants) for (const right of ['usage','select','update'])
    if (g[right]) await db.exec(`grant ${right} on sequence public.${ident(g.name)} to ${ident(g.role)}`);
  if (snapshot.triggers.length) throw new Error('Captured trigger behavior must be implemented before this fixture can be trusted');
  await db.query(`insert into auth.users(id,email,email_confirmed_at) values
    ($1,'staff@example.invalid',now()),($2,'partner@example.invalid',now()),($3,'stranger@example.invalid',now())`,[admin,partner,stranger]);
  await db.query(`insert into public.user_roles(user_id,role) values($1,'admin')`,[admin]);
  await db.query(`insert into public.b2b_companies(id,company_name,email,status,user_id,internal_notes)
    values($1,'Synthetic Partner','partner@example.invalid','active',$2,'PRIVATE-SYNTHETIC-NOTE')`,[company,partner]);
  await db.exec(`insert into public.products(id,name,price,category,stock,in_stock,visibility,cost_price,wholesale_price,pieces_per_carton,carton_price)
    values(1,'Synthetic noodles',4.00,'Test',100,true,'retail',1.00,3.50,1,3.50),
    (2,'Last units',4.00,'Test',4,true,'retail',1.00,3.50,1,3.50);
    insert into public.orders(order_number,customer_email,total_amount,currency,status,items)
    values('HISTORICAL-SYNTHETIC','legacy@example.invalid',12.00,'EUR','delivered','[]');
  `);
  return db;
}

export async function asRole(db, role, actor, fn) {
  if (!['anon','authenticated','service_role'].includes(role)) throw new Error('Invalid test role');
  return db.transaction(async tx => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.email',$2,true)",
      [actor || '',actor === partner ? 'partner@example.invalid' : actor === admin ? 'staff@example.invalid' : 'stranger@example.invalid']);
    return fn(tx);
  });
}

export async function migrate(db, first = 'payment') {
  const payment = await readFile(new URL('../../supabase/migrations/20261011164628_checkout_payment_integrity.sql', import.meta.url),'utf8');
  const b2b = await readFile(new URL('../../supabase/migrations/20261011164713_b2b_access_and_requests.sql', import.meta.url),'utf8');
  await db.exec(first === 'payment' ? payment : b2b);
  await db.exec(first === 'payment' ? b2b : payment);
}
