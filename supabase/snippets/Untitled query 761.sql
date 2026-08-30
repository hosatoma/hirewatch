-- =========================================================
-- HireWatch
-- Initial core schema
-- =========================================================


-- =========================================================
-- Helper: updated_at
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- =========================================================
-- workspaces
-- =========================================================

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  timezone text not null default 'Asia/Tokyo',

  notification_time time not null default '09:00:00',

  notification_enabled boolean not null default false,

  trial_started_at timestamptz,
  trial_ends_at timestamptz,

  created_by uuid not null
    references auth.users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create trigger workspaces_set_updated_at
before update
on public.workspaces
for each row
execute function public.set_updated_at();


-- =========================================================
-- workspace_members
-- =========================================================

create table public.workspace_members (
  workspace_id uuid not null
    references public.workspaces(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  role text not null
    check (
      role in (
        'owner',
        'admin',
        'member'
      )
    ),

  created_at timestamptz not null default now(),

  primary key (
    workspace_id,
    user_id
  )
);


create index workspace_members_user_id_idx
  on public.workspace_members(user_id);


-- =========================================================
-- sheet_sources
-- =========================================================

create table public.sheet_sources (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null
    references public.workspaces(id)
    on delete cascade,

  spreadsheet_id text not null,

  spreadsheet_title text,

  sheet_id bigint not null,

  sheet_title text not null,

  header_row integer not null default 1
    check (
      header_row between 1 and 100
    ),

  column_mapping jsonb not null default '{}'::jsonb,

  spreadsheet_timezone text,

  status text not null default 'setup'
    check (
      status in (
        'setup',
        'active',
        'mapping_required',
        'reauth_required',
        'error'
      )
    ),

  last_sync_at timestamptz,

  last_error_code text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    workspace_id,
    spreadsheet_id,
    sheet_id
  )
);


create index sheet_sources_workspace_id_idx
  on public.sheet_sources(workspace_id);


create trigger sheet_sources_set_updated_at
before update
on public.sheet_sources
for each row
execute function public.set_updated_at();


-- =========================================================
-- stage_rules
-- =========================================================

create table public.stage_rules (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null
    references public.workspaces(id)
    on delete cascade,

  stage_value text not null,

  waiting_on text not null
    check (
      waiting_on in (
        'candidate',
        'recruiter',
        'interviewer',
        'hiring_manager',
        'agency',
        'other'
      )
    ),

  sla_business_days integer not null
    check (
      sla_business_days between 0 and 30
    ),

  enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    workspace_id,
    stage_value
  )
);


create index stage_rules_workspace_id_idx
  on public.stage_rules(workspace_id);


create trigger stage_rules_set_updated_at
before update
on public.stage_rules
for each row
execute function public.set_updated_at();


-- =========================================================
-- candidate_states
--
-- 候補者の氏名、メールアドレス、Candidate Keyなどの
-- 個人情報そのものは保存しない。
-- =========================================================

create table public.candidate_states (
  sheet_source_id uuid not null
    references public.sheet_sources(id)
    on delete cascade,

  candidate_hmac char(64) not null,

  fingerprint char(64) not null,

  first_seen_at timestamptz not null,

  last_seen_at timestamptz not null,

  last_changed_at timestamptz not null,

  last_alerted_at timestamptz,

  primary key (
    sheet_source_id,
    candidate_hmac
  )
);


create index candidate_states_last_seen_at_idx
  on public.candidate_states(last_seen_at);


-- =========================================================
-- Private authorization helpers
-- =========================================================

create schema if not exists private;


create or replace function private.is_workspace_member(
  target_workspace_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
  );
$$;


create or replace function private.is_workspace_admin(
  target_workspace_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner', 'admin')
  );
$$;


revoke all
on function private.is_workspace_member(uuid)
from public;


revoke all
on function private.is_workspace_admin(uuid)
from public;


grant usage
on schema private
to authenticated;


grant execute
on function private.is_workspace_member(uuid)
to authenticated;


grant execute
on function private.is_workspace_admin(uuid)
to authenticated;


-- =========================================================
-- Automatically create workspace owner membership
-- =========================================================

create or replace function private.add_workspace_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role
  )
  values (
    new.id,
    new.created_by,
    'owner'
  );

  return new;

end;
$$;


revoke all
on function private.add_workspace_owner()
from public;


create trigger add_workspace_owner_after_insert
after insert
on public.workspaces
for each row
execute function private.add_workspace_owner();


-- =========================================================
-- Row Level Security
-- =========================================================

alter table public.workspaces
  enable row level security;

alter table public.workspace_members
  enable row level security;

alter table public.sheet_sources
  enable row level security;

alter table public.stage_rules
  enable row level security;

alter table public.candidate_states
  enable row level security;


-- =========================================================
-- workspaces policies
-- =========================================================

create policy "authenticated users can create workspaces"
on public.workspaces
for insert
to authenticated
with check (
  created_by = (select auth.uid())
);


create policy "members can view workspaces"
on public.workspaces
for select
to authenticated
using (
  private.is_workspace_member(id)
);


create policy "admins can update workspaces"
on public.workspaces
for update
to authenticated
using (
  private.is_workspace_admin(id)
)
with check (
  private.is_workspace_admin(id)
);


-- =========================================================
-- workspace_members policies
-- =========================================================

create policy "members can view workspace members"
on public.workspace_members
for select
to authenticated
using (
  private.is_workspace_member(workspace_id)
);


-- =========================================================
-- sheet_sources policies
-- =========================================================

create policy "members can view sheet sources"
on public.sheet_sources
for select
to authenticated
using (
  private.is_workspace_member(workspace_id)
);


create policy "admins can insert sheet sources"
on public.sheet_sources
for insert
to authenticated
with check (
  private.is_workspace_admin(workspace_id)
);


create policy "admins can update sheet sources"
on public.sheet_sources
for update
to authenticated
using (
  private.is_workspace_admin(workspace_id)
)
with check (
  private.is_workspace_admin(workspace_id)
);


create policy "admins can delete sheet sources"
on public.sheet_sources
for delete
to authenticated
using (
  private.is_workspace_admin(workspace_id)
);


-- =========================================================
-- stage_rules policies
-- =========================================================

create policy "members can view stage rules"
on public.stage_rules
for select
to authenticated
using (
  private.is_workspace_member(workspace_id)
);


create policy "admins can insert stage rules"
on public.stage_rules
for insert
to authenticated
with check (
  private.is_workspace_admin(workspace_id)
);


create policy "admins can update stage rules"
on public.stage_rules
for update
to authenticated
using (
  private.is_workspace_admin(workspace_id)
)
with check (
  private.is_workspace_admin(workspace_id)
);


create policy "admins can delete stage rules"
on public.stage_rules
for delete
to authenticated
using (
  private.is_workspace_admin(workspace_id)
);


-- =========================================================
-- candidate_states
--
-- authenticated向けPolicyは作成しない。
-- Next.js Server / WorkerからService Role経由で操作する。
-- =========================================================