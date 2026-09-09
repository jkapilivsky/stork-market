-- Run after the party migration in an isolated PostgreSQL instance with
-- Supabase's anon, authenticated, and service_role roles. Leaves no test data.
begin;
do $$
begin
  assert not has_function_privilege('anon', 'public.stork_party_read(text)', 'EXECUTE');
  assert not has_function_privilege('authenticated', 'public.stork_party_commit(text,bigint,jsonb)', 'EXECUTE');
  assert has_function_privilege('service_role', 'public.stork_party_commit(text,bigint,jsonb)', 'EXECUTE');
  assert not has_table_privilege('anon', 'private.stork_party_events', 'SELECT');
  assert not has_table_privilege('authenticated', 'private.stork_party_events', 'UPDATE');
  assert (select relrowsecurity from pg_class where oid = 'private.stork_party_events'::regclass);
  assert public.stork_party_commit('migration-smoke-test', -1, '{"guests":[]}');
  assert not public.stork_party_commit('migration-smoke-test', -1, '{"guests":[99]}');
  assert public.stork_party_commit('migration-smoke-test', 0, '{"guests":[1]}');
  assert not public.stork_party_commit('migration-smoke-test', 0, '{"guests":[2]}');
  assert public.stork_party_read('migration-smoke-test') = '{"revision":1,"state":{"guests":[1]}}'::jsonb;
end;
$$;
rollback;
