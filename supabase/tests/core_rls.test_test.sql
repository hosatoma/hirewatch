begin;

create extension if not exists pgtap
with schema extensions;

select plan(10);


-- =========================================================
-- Test users
-- =========================================================

insert into auth.users (
  id,
  email
)
values
(
  '11111111-1111-4111-8111-111111111111',
  'owner-a@example.com'
),
(
  '22222222-2222-4222-8222-222222222222',
  'owner-b@example.com'
),
(
  '33333333-3333-4333-8333-333333333333',
  'member-a@example.com'
);


-- =========================================================
-- Workspaces
--
-- add_workspace_owner trigger will automatically create
-- the owner memberships for A and B.
-- =========================================================

insert into public.workspaces (
  id,
  name,
  created_by
)
values
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Workspace A',
  '11111111-1111-4111-8111-111111111111'
),
(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'Workspace B',
  '22222222-2222-4222-8222-222222222222'
);


-- User C is a normal member of Workspace A.
insert into public.workspace_members (
  workspace_id,
  user_id,
  role
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '33333333-3333-4333-8333-333333333333',
  'member'
);


-- =========================================================
-- Sheet sources
-- =========================================================

insert into public.sheet_sources (
  id,
  workspace_id,
  spreadsheet_id,
  spreadsheet_title,
  sheet_id,
  sheet_title,
  status
)
values
(
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'spreadsheet-a',
  'Spreadsheet A',
  1,
  'Candidates',
  'active'
),
(
  'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'spreadsheet-b',
  'Spreadsheet B',
  1,
  'Candidates',
  'active'
);


-- =========================================================
-- Stage rule
-- =========================================================

insert into public.stage_rules (
  workspace_id,
  stage_value,
  waiting_on,
  sla_business_days
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '一次面接済',
  'interviewer',
  1
);


-- =========================================================
-- Candidate state
-- =========================================================

insert into public.candidate_states (
  sheet_source_id,
  candidate_hmac,
  fingerprint,
  first_seen_at,
  last_seen_at,
  last_changed_at
)
values (
  'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  repeat('a', 64)::char(64),
  repeat('b', 64)::char(64),
  now(),
  now(),
  now()
);


-- =========================================================
-- User A: Workspace A owner
-- =========================================================

set local role authenticated;

set local request.jwt.claim.sub =
  '11111111-1111-4111-8111-111111111111';


-- 1. Owner A sees only Workspace A.
select is(
  (
    select count(*)
    from public.workspaces
  ),
  1::bigint,
  'Owner A sees only Workspace A'
);


-- 2. Owner A can see members of Workspace A.
-- owner + normal member = 2
select is(
  (
    select count(*)
    from public.workspace_members
  ),
  2::bigint,
  'Owner A sees Workspace A members'
);


-- 3. Owner A can update Workspace A.
select results_eq(
  $$
    update public.workspaces
    set name = 'Workspace A Updated'
    where id =
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    returning id
  $$,

  $$
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
    )
  $$,

  'Owner A can update Workspace A'
);


-- 4. Owner A cannot update Workspace B.
select is_empty(
  $$
    update public.workspaces
    set name = 'Hacked'
    where id =
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    returning id
  $$,

  'Owner A cannot update Workspace B'
);


-- 5. Owner A can create a stage rule.
select results_eq(
  $$
    insert into public.stage_rules (
      workspace_id,
      stage_value,
      waiting_on,
      sla_business_days
    )
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'オファー提示済',
      'candidate',
      3
    )
    returning stage_value
  $$,

  $$
    values ('オファー提示済'::text)
  $$,

  'Owner A can create stage rules'
);


-- =========================================================
-- User C: Workspace A normal member
-- =========================================================

set local request.jwt.claim.sub =
  '33333333-3333-4333-8333-333333333333';


-- 6. Normal member can read Workspace A rules.
select is(
  (
    select count(*)
    from public.stage_rules
    where workspace_id =
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  2::bigint,
  'Member can read Workspace A stage rules'
);


-- 7. Normal member cannot create rules.
select throws_ok(
  $$
    insert into public.stage_rules (
      workspace_id,
      stage_value,
      waiting_on,
      sla_business_days
    )
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '不正な変更',
      'candidate',
      1
    )
  $$,
  '42501',
  null,
  'Member cannot create stage rules'
);


-- =========================================================
-- User B
-- =========================================================

set local request.jwt.claim.sub =
  '22222222-2222-4222-8222-222222222222';


-- 8. Workspace B user cannot see Workspace A sheet source.
select is(
  (
    select count(*)
    from public.sheet_sources
    where workspace_id =
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  0::bigint,
  'Workspace B user cannot read Workspace A sheet sources'
);


-- =========================================================
-- Authenticated direct candidate_states access
-- =========================================================

set local request.jwt.claim.sub =
  '11111111-1111-4111-8111-111111111111';


-- 9. Browser-authenticated users cannot query candidate_states.
select throws_ok(
  $$
    select *
    from public.candidate_states
  $$,
  '42501',
  null,
  'Authenticated users cannot directly access candidate_states'
);


-- =========================================================
-- Anonymous
-- =========================================================

reset role;

set local role anon;


-- 10. Signed-out users cannot read workspaces.
select throws_ok(
  $$
    select *
    from public.workspaces
  $$,
  '42501',
  null,
  'Anonymous users cannot access workspaces'
);


select *
from finish();

rollback;