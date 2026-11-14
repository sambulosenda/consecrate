-- Minimal stand-in for the parts of Supabase the migrations rely on, so the
-- schema and its access rules can be tested against plain Postgres.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
