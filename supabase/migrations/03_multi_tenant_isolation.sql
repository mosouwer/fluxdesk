-- ==============================================================================
-- FluxDesk Migration: 03_multi_tenant_isolation.sql
-- Description: Multi-tenant schema isolation, brand workspaces, CSAT ratings,
--              SQL helper functions, and Row-Level Security (RLS) policies.
-- ==============================================================================

-- 1. WORKSPACES TABLE
--------------------------------------------------------------------------------
-- Represents brand/tenant organizations for multi-tenant support desk isolation.
create table if not exists public.workspaces (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Ensure slug constraint and columns exist if table was previously created
alter table public.workspaces
    add column if not exists name text,
    add column if not exists slug text;

do $$ begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'workspaces_slug_key'
    ) then
        alter table public.workspaces add constraint workspaces_slug_key unique (slug);
    end if;
exception
    when others then null;
end $$;

comment on table public.workspaces is 'Tenants representing isolated customer service organizations.';


-- 2. USERS TABLE
--------------------------------------------------------------------------------
-- Ensure public.users exists and has workspace_id and role for tenant membership.
create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    full_name text,
    avatar_url text,
    phone text,
    role text not null default 'customer',
    workspace_id uuid references public.workspaces(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- If users table already exists, ensure required columns
alter table public.users
    add column if not exists role text default 'customer',
    add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

-- Keep profiles table in sync if present
do $$ begin
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles') then
        alter table public.profiles
            add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
    end if;
end $$;


-- 3. TICKETS TABLE: MULTI-TENANT & CSAT COLUMNS
--------------------------------------------------------------------------------
-- Add workspace_id, csat_rating (1-5), csat_feedback, and rated_at
alter table public.tickets
    add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
    add column if not exists csat_rating smallint,
    add column if not exists csat_feedback text,
    add column if not exists rated_at timestamptz;

-- Add check constraint to ensure CSAT rating is between 1 and 5 (or null if not yet rated)
do $$ begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'tickets_csat_rating_check'
    ) then
        alter table public.tickets
            add constraint tickets_csat_rating_check
            check (csat_rating is null or (csat_rating >= 1 and csat_rating <= 5));
    end if;
exception
    when others then null;
end $$;

-- Indexes for multi-tenant and CSAT analytics
create index if not exists idx_tickets_workspace_id on public.tickets(workspace_id);
create index if not exists idx_tickets_csat on public.tickets(workspace_id, csat_rating) where csat_rating is not null;


-- 4. TICKET MESSAGES TABLE: MULTI-TENANT ISOLATION
--------------------------------------------------------------------------------
alter table public.ticket_messages
    add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

create index if not exists idx_ticket_messages_workspace on public.ticket_messages(workspace_id);


-- 5. SQL HELPER FUNCTIONS FOR MULTI-TENANCY
--------------------------------------------------------------------------------
-- 5.1 current_user_workspace_id(): Resolves the active tenant workspace ID for auth.uid()
create or replace function public.current_user_workspace_id()
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    ws_id uuid;
begin
    -- 1. Check JWT claim (app_metadata or user_metadata or top-level)
    begin
        ws_id := nullif(
            coalesce(
                auth.jwt() -> 'app_metadata' ->> 'workspace_id',
                auth.jwt() -> 'user_metadata' ->> 'workspace_id',
                auth.jwt() ->> 'workspace_id'
            ),
            ''
        )::uuid;
    exception
        when others then
            ws_id := null;
    end;

    if ws_id is not null then
        return ws_id;
    end if;

    -- 2. Query workspace_members membership if available
    if exists (
        select 1 from information_schema.tables 
        where table_schema = 'public' and table_name = 'workspace_members'
    ) then
        select wm.workspace_id
        into ws_id
        from public.workspace_members wm
        where wm.user_id = auth.uid()
          and wm.is_active = true
        order by wm.created_at desc
        limit 1;

        if ws_id is not null then
            return ws_id;
        end if;
    end if;

    -- 3. Query public.users table workspace_id
    if exists (
        select 1 from information_schema.tables 
        where table_schema = 'public' and table_name = 'users'
    ) then
        select u.workspace_id
        into ws_id
        from public.users u
        where u.id = auth.uid()
        limit 1;

        if ws_id is not null then
            return ws_id;
        end if;
    end if;

    -- 4. Query public.profiles table workspace_id if present
    if exists (
        select 1 from information_schema.columns 
        where table_schema = 'public' and table_name = 'profiles' and column_name = 'workspace_id'
    ) then
        select p.workspace_id
        into ws_id
        from public.profiles p
        where p.id = auth.uid()
        limit 1;

        if ws_id is not null then
            return ws_id;
        end if;
    end if;

    return null;
end;
$$;

comment on function public.current_user_workspace_id() is 'Returns the active workspace ID for the currently authenticated user.';


-- 5.2 current_user_role(): Resolves the role ('admin', 'agent', or 'customer') for auth.uid()
create or replace function public.current_user_role()
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    user_role text;
    ws_id uuid;
begin
    ws_id := public.current_user_workspace_id();

    -- 1. Check JWT claim (app_metadata or user_metadata or top-level)
    begin
        user_role := nullif(
            coalesce(
                auth.jwt() -> 'app_metadata' ->> 'role',
                auth.jwt() -> 'user_metadata' ->> 'role',
                auth.jwt() ->> 'role'
            ),
            ''
        );
    exception
        when others then
            user_role := null;
    end;

    if user_role is not null then
        return lower(user_role);
    end if;

    -- 2. Query workspace_members for user's role in the active workspace
    if exists (
        select 1 from information_schema.tables 
        where table_schema = 'public' and table_name = 'workspace_members'
    ) then
        if ws_id is not null then
            select wm.role::text
            into user_role
            from public.workspace_members wm
            where wm.user_id = auth.uid()
              and wm.workspace_id = ws_id
              and wm.is_active = true
            limit 1;
        else
            select wm.role::text
            into user_role
            from public.workspace_members wm
            where wm.user_id = auth.uid()
              and wm.is_active = true
            order by wm.created_at desc
            limit 1;
        end if;

        if user_role is not null then
            return lower(user_role);
        end if;
    end if;

    -- 3. Query public.users table role
    if exists (
        select 1 from information_schema.tables 
        where table_schema = 'public' and table_name = 'users'
    ) then
        select u.role::text
        into user_role
        from public.users u
        where u.id = auth.uid()
        limit 1;

        if user_role is not null then
            return lower(user_role);
        end if;
    end if;

    return 'customer';
end;
$$;

comment on function public.current_user_role() is 'Returns the current user role (admin, agent, or customer) for the active tenant.';


-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------

-- 6.1 Enable RLS on workspaces, users, tickets, and ticket_messages
alter table public.workspaces enable row level security;
alter table public.users enable row level security;
alter table if exists public.profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;


-- 6.2 Workspaces RLS Policies
drop policy if exists "workspaces_select_policy" on public.workspaces;
drop policy if exists "Workspaces viewable by members" on public.workspaces;

create policy "workspaces_select_policy"
    on public.workspaces
    for select
    using (
        id = public.current_user_workspace_id()
        or auth.uid() is null
        or exists (
            select 1 from public.workspace_members wm
            where wm.workspace_id = workspaces.id
              and wm.user_id = auth.uid()
        )
    );

drop policy if exists "workspaces_admin_update" on public.workspaces;
create policy "workspaces_admin_update"
    on public.workspaces
    for update
    using (
        id = public.current_user_workspace_id()
        and public.current_user_role() = 'admin'
    );


-- 6.3 Users RLS Policies
drop policy if exists "users_select_policy" on public.users;
create policy "users_select_policy"
    on public.users
    for select
    using (
        id = auth.uid()
        or workspace_id = public.current_user_workspace_id()
    );

drop policy if exists "users_update_policy" on public.users;
create policy "users_update_policy"
    on public.users
    for update
    using (id = auth.uid())
    with check (id = auth.uid());


-- 6.4 Tickets Multi-Tenant & Role Isolation Policies
--------------------------------------------------------------------------------
-- SELECT:
-- 1. Enforces workspace_id = current_user_workspace_id()
-- 2. Admins and agents can view their brand's tickets
-- 3. Customers can ONLY view their own tickets (customer_id = auth.uid())
drop policy if exists "Tickets select policy" on public.tickets;
drop policy if exists "tickets_select_policy" on public.tickets;
drop policy if exists "tickets_multi_tenant_select" on public.tickets;

create policy "tickets_multi_tenant_select"
    on public.tickets
    for select
    using (
        workspace_id = public.current_user_workspace_id()
        and (
            public.current_user_role() in ('admin', 'agent')
            or (
                public.current_user_role() = 'customer'
                and customer_id = auth.uid()
            )
            or customer_id = auth.uid()
        )
    );

-- INSERT:
-- Users can only insert tickets within their active workspace_id.
-- Staff can create tickets on behalf of any customer in their workspace.
-- Customers can only create tickets where customer_id = auth.uid().
drop policy if exists "Tickets insert policy" on public.tickets;
drop policy if exists "tickets_insert_policy" on public.tickets;
drop policy if exists "tickets_multi_tenant_insert" on public.tickets;

create policy "tickets_multi_tenant_insert"
    on public.tickets
    for insert
    with check (
        workspace_id = public.current_user_workspace_id()
        and (
            public.current_user_role() in ('admin', 'agent')
            or customer_id = auth.uid()
        )
    );

-- UPDATE:
-- Staff can update brand tickets (status, assignment, priority, tags, csat).
-- Customers can only update their own tickets (e.g., submitting CSAT rating and feedback).
drop policy if exists "Tickets update policy" on public.tickets;
drop policy if exists "tickets_update_policy" on public.tickets;
drop policy if exists "tickets_multi_tenant_update" on public.tickets;

create policy "tickets_multi_tenant_update"
    on public.tickets
    for update
    using (
        workspace_id = public.current_user_workspace_id()
        and (
            public.current_user_role() in ('admin', 'agent')
            or customer_id = auth.uid()
        )
    )
    with check (
        workspace_id = public.current_user_workspace_id()
        and (
            public.current_user_role() in ('admin', 'agent')
            or customer_id = auth.uid()
        )
    );

-- DELETE:
-- Only workspace admins can delete tickets in their workspace.
drop policy if exists "Admins can delete tickets" on public.tickets;
drop policy if exists "tickets_multi_tenant_delete" on public.tickets;

create policy "tickets_multi_tenant_delete"
    on public.tickets
    for delete
    using (
        workspace_id = public.current_user_workspace_id()
        and public.current_user_role() = 'admin'
    );


-- 6.5 Ticket Messages Multi-Tenant & Confidentiality Isolation Policies
--------------------------------------------------------------------------------
-- SELECT:
-- 1. Enforces workspace_id = current_user_workspace_id()
-- 2. Staff (agent/admin) can view both public_reply and internal_note
-- 3. Customers can ONLY view public_reply on their own tickets (NEVER internal_note)
drop policy if exists "Ticket messages select policy" on public.ticket_messages;
drop policy if exists "ticket_messages_multi_tenant_select" on public.ticket_messages;

create policy "ticket_messages_multi_tenant_select"
    on public.ticket_messages
    for select
    using (
        workspace_id = public.current_user_workspace_id()
        and (
            public.current_user_role() in ('admin', 'agent')
            or (
                type = 'public_reply'
                and exists (
                    select 1 from public.tickets t
                    where t.id = ticket_messages.ticket_id
                      and t.workspace_id = public.current_user_workspace_id()
                      and t.customer_id = auth.uid()
                )
            )
        )
    );

-- INSERT:
-- Staff can post public_reply or internal_note.
-- Customers can only post public_reply to their own tickets.
drop policy if exists "Ticket messages insert policy" on public.ticket_messages;
drop policy if exists "ticket_messages_multi_tenant_insert" on public.ticket_messages;

create policy "ticket_messages_multi_tenant_insert"
    on public.ticket_messages
    for insert
    with check (
        workspace_id = public.current_user_workspace_id()
        and sender_id = auth.uid()
        and (
            public.current_user_role() in ('admin', 'agent')
            or (
                type = 'public_reply'
                and exists (
                    select 1 from public.tickets t
                    where t.id = ticket_messages.ticket_id
                      and t.workspace_id = public.current_user_workspace_id()
                      and t.customer_id = auth.uid()
                )
            )
        )
    );
