begin;

create extension if not exists pgtap
with schema extensions;

select plan(1);


insert into auth.users (
  id,
  email
)
values (
  '44444444-4444-4444-8444-444444444444',
  'google-test@example.com'
);


insert into public.workspaces (
  id,
  name,
  created_by
)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'Google OAuth Test',
  '44444444-4444-4444-8444-444444444444'
);


insert into public.google_connections (
  workspace_id,
  refresh_token_encrypted,
  granted_scopes
)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'encrypted-test-value',
  array[
    'https://www.googleapis.com/auth/drive.file'
  ]
);


set local role authenticated;

set local request.jwt.claim.sub =
  '44444444-4444-4444-8444-444444444444';


select throws_ok(
  $$
    select *
    from public.google_connections
  $$,
  '42501',
  null,
  'Authenticated users cannot access google_connections'
);


select *
from finish();

rollback;