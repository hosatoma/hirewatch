-- =========================================================
-- Harden core table grants
-- =========================================================

-- Signed-out users have no access to HireWatch core tables.
revoke all privileges
on table
  public.workspaces,
  public.workspace_members,
  public.sheet_sources,
  public.stage_rules,
  public.candidate_states
from anon;


-- Start authenticated privileges from zero.
revoke all privileges
on table
  public.workspaces,
  public.workspace_members,
  public.sheet_sources,
  public.stage_rules,
  public.candidate_states
from authenticated;


-- ---------------------------------------------------------
-- workspaces
--
-- create: onboarding
-- read: members
-- update: owner/admin via RLS
-- delete: not exposed in MVP yet
-- ---------------------------------------------------------

grant
  select,
  insert,
  update
on table public.workspaces
to authenticated;


-- ---------------------------------------------------------
-- workspace_members
--
-- Read only from normal application sessions.
-- Owner creation is performed by the SECURITY DEFINER trigger.
-- ---------------------------------------------------------

grant
  select
on table public.workspace_members
to authenticated;


-- ---------------------------------------------------------
-- sheet_sources
--
-- RLS decides member read / admin write.
-- ---------------------------------------------------------

grant
  select,
  insert,
  update,
  delete
on table public.sheet_sources
to authenticated;


-- ---------------------------------------------------------
-- stage_rules
-- ---------------------------------------------------------

grant
  select,
  insert,
  update,
  delete
on table public.stage_rules
to authenticated;


-- ---------------------------------------------------------
-- candidate_states
--
-- Intentionally no authenticated grant.
-- Server / worker service role only.
-- ---------------------------------------------------------