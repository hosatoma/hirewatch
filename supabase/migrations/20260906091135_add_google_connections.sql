-- =========================================================
-- Google connections
--
-- Google Sheets / Drive authorization.
--
-- Browserから直接アクセスさせない。
-- Next.js Server / Workerのservice_roleのみ利用する。
-- =========================================================

create table public.google_connections (
  workspace_id uuid primary key
    references public.workspaces(id)
    on delete cascade,

  refresh_token_encrypted text not null,

  granted_scopes text[] not null
    default '{}'::text[],

  status text not null
    default 'connected'
    check (
      status in (
        'connected',
        'reauth_required',
        'revoked',
        'error'
      )
    ),

  connected_at timestamptz not null
    default now(),

  last_used_at timestamptz,

  last_error_code text,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create trigger google_connections_set_updated_at
before update
on public.google_connections
for each row
execute function public.set_updated_at();


-- =========================================================
-- RLS
-- =========================================================

alter table public.google_connections
  enable row level security;


-- Browser rolesには一切公開しない。

revoke all privileges
on table public.google_connections
from anon;


revoke all privileges
on table public.google_connections
from authenticated;


-- Server / Worker専用。

grant all privileges
on table public.google_connections
to service_role;