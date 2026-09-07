-- Enough of Supabase to run the migrations against a stock Postgres image.
--
-- The migrations depend on three things a plain Postgres does not have: the `auth` schema with
-- a users table, `auth.uid()` reading the caller out of the request, and the anon/authenticated
-- roles that PostgREST connects as. This stands those up so the schema and every policy in
-- supabase/migrations can be applied and attacked locally, without waiting on the full stack.
--
-- It is a test fixture. Nothing here ships: the real project gets these from Supabase itself.

create extension if not exists pgcrypto;

create schema if not exists auth;

create table if not exists auth.users (
  id                  uuid primary key,
  instance_id         uuid,
  aud                 text,
  role                text,
  email               text unique,
  encrypted_password  text,
  -- What sign-up carries: the name and phone the person typed into the form. 0011's trigger
  -- reads it to fill in their profile, so the fixture has to have it too.
  raw_user_meta_data  jsonb default '{}'::jsonb,
  raw_app_meta_data   jsonb default '{}'::jsonb,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- The same resolution order Supabase uses: the individual claim setting first, then the whole
-- claims blob. Both are ordinary session settings, which is what lets a test become somebody.
create or replace function auth.uid() returns uuid
language sql stable as $fn$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$fn$;

create or replace function auth.role() returns text
language sql stable as $fn$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    'anon'
  )
$fn$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

grant usage on schema public, auth to anon, authenticated, service_role;

-- Supabase grants these by default on everything in public, which is what makes RLS the thing
-- actually deciding access rather than table privileges.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
