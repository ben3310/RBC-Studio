-- 01 · extensions, enums, shared helpers
-- Milestone 1 scaffold. NOT YET APPLIED to any shared environment.
-- Taxonomy sets (roles, kinds, classes) are enums (stable). Workflow states are
-- text + check constraints (see later migrations) so a forward migration can
-- evolve a state machine without recreating a type. Rationale: docs/adr/0006.

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;     -- case-insensitive handles/slugs

-- application helper schema (RLS predicates, triggers, RPC live here)
create schema if not exists app;

-- ---- stable taxonomies (enums) --------------------------------------------
create type app.member_role as enum ('owner','operator','reviewer','analyst');
create type app.asset_kind as enum (
  'product_original','product_detail','owned_mood','licensed_mood',
  'generated_mood','persona','derivative'
);
create type app.rights_class as enum ('owned','licensed','generated','persona');
create type app.destination_kind as enum ('flagship','satellite','persona','archive','directory');
create type app.content_type as enum (
  'reel','grid','carousel','story','pin','short','thread','text_post',
  'blog','email','profile_post'
);
create type app.cta_type as enum ('dm_acquire','follow_flagship','save','enquire','profile_visit','none');
create type app.actor_type as enum ('user','worker','publisher','system','webhook');

-- ---- shared trigger: maintain updated_at ----------------------------------
create or replace function app.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---- shared trigger: optimistic version bump for operator-edited rows ------
create or replace function app.bump_version()
returns trigger language plpgsql as $$
begin
  if new.version is not distinct from old.version then
    new.version = old.version + 1;
  end if;
  return new;
end $$;

comment on schema app is 'RBC control-plane helpers: RLS predicates, triggers, RPCs.';
