-- Additive event-day storage. Existing markets, wallets, and invitations are untouched.
create schema if not exists private;

create table if not exists private.stork_party_events (
  slug text primary key,
  revision bigint not null default 0,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);
alter table private.stork_party_events enable row level security;
revoke all on private.stork_party_events from public, anon, authenticated;

-- Only Next.js's server-side secret key can read the private answer / guest tokens.
create or replace function public.stork_party_read(p_slug text)
returns jsonb language sql security definer set search_path = ''
as $$
  select jsonb_build_object('revision', revision, 'state', state)
  from private.stork_party_events where slug = p_slug;
$$;

-- Compare-and-swap makes every mutation atomic across concurrent app instances.
create or replace function public.stork_party_commit(p_slug text, p_revision bigint, p_state jsonb)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare affected integer;
begin
  if p_revision = -1 then
    insert into private.stork_party_events (slug, state) values (p_slug, p_state)
    on conflict (slug) do nothing;
  else
    update private.stork_party_events
    set state = p_state, revision = revision + 1, updated_at = now()
    where slug = p_slug and revision = p_revision;
  end if;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.stork_party_read(text) from public, anon, authenticated;
revoke all on function public.stork_party_commit(text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.stork_party_read(text) to service_role;
grant execute on function public.stork_party_commit(text, bigint, jsonb) to service_role;
