-- ==============================================================================
-- FluxDesk: Multi-Tenant Helpdesk Migration (Zendesk Clone)
-- Description: Core schema, enums, tables, RLS policies, indexes, and triggers
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. ENUMS
do $$ begin
    create type public.user_role as enum ('customer', 'agent', 'admin');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.ticket_status as enum ('open', 'pending', 'on_hold', 'solved', 'closed');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.ticket_channel as enum ('web', 'email', 'chat', 'api');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.message_type as enum ('public_reply', 'internal_note');
exception
    when duplicate_object then null;
end $$;

-- 3. TABLES

--------------------------------------------------------------------------------
-- 3.1 Workspaces (Tenants)
--------------------------------------------------------------------------------
create table if not exists public.workspaces (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    custom_domain text unique,
    settings jsonb not null default '{
        "support_email": "support@example.com",
        "ticket_prefix": "TICK",
        "business_hours": {
            "timezone": "UTC",
            "start": "09:00",
            "end": "17:00",
            "workdays": [1, 2, 3, 4, 5]
        }
    }'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint workspace_slug_format check (slug ~* '^[a-z0-9-]+$')
);

comment on table public.workspaces is 'Tenants representing isolated customer service organizations.';

--------------------------------------------------------------------------------
-- 3.2 Profiles (Linked to Supabase Auth Users)
--------------------------------------------------------------------------------
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    full_name text not null,
    avatar_url text,
    phone text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public user profile information mirroring auth.users.';

--------------------------------------------------------------------------------
-- 3.3 Workspace Members (Tenant-level User Membership & Roles)
--------------------------------------------------------------------------------
create table if not exists public.workspace_members (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    role public.user_role not null default 'customer',
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (workspace_id, user_id)
);

comment on table public.workspace_members is 'Tenant-scoped user memberships defining role (customer, agent, admin).';

--------------------------------------------------------------------------------
-- 3.4 Tickets
--------------------------------------------------------------------------------
create table if not exists public.tickets (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    ticket_number integer not null,
    subject text not null,
    description text not null,
    status public.ticket_status not null default 'open',
    priority public.ticket_priority not null default 'normal',
    channel public.ticket_channel not null default 'web',
    customer_id uuid not null references public.profiles(id) on delete restrict,
    assigned_agent_id uuid references public.profiles(id) on delete set null,
    tags text[] not null default '{}'::text[],
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    resolved_at timestamptz,
    closed_at timestamptz,
    unique (workspace_id, ticket_number)
);

comment on table public.tickets is 'Customer support tickets scoped to a workspace.';

--------------------------------------------------------------------------------
-- 3.5 Ticket Messages (Replies and Internal Notes)
--------------------------------------------------------------------------------
create table if not exists public.ticket_messages (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    ticket_id uuid not null references public.tickets(id) on delete cascade,
    sender_id uuid not null references public.profiles(id) on delete restrict,
    type public.message_type not null default 'public_reply',
    body text not null,
    attachments jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.ticket_messages is 'Thread messages on tickets: public replies visible to customer, internal notes staff-only.';

--------------------------------------------------------------------------------
-- 3.6 Macros (Canned Responses and Automated Actions)
--------------------------------------------------------------------------------
create table if not exists public.macros (
    id uuid primary key default gen_random_uuid(),
    workspace_id uuid not null references public.workspaces(id) on delete cascade,
    title text not null,
    description text,
    actions jsonb not null default '[]'::jsonb,
    is_active boolean not null default true,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.macros is 'Predefined actions and reply templates for agents.';

-- 4. PERFORMANCE INDEXES

create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_workspace_members_ws_role on public.workspace_members(workspace_id, role) where is_active = true;

create index if not exists idx_tickets_workspace_status on public.tickets(workspace_id, status);
create index if not exists idx_tickets_customer on public.tickets(workspace_id, customer_id);
create index if not exists idx_tickets_agent on public.tickets(workspace_id, assigned_agent_id);
create index if not exists idx_tickets_created_at on public.tickets(workspace_id, created_at desc);

create index if not exists idx_ticket_messages_ticket on public.ticket_messages(ticket_id, created_at asc);
create index if not exists idx_ticket_messages_type on public.ticket_messages(ticket_id, type);
create index if not exists idx_ticket_messages_sender on public.ticket_messages(sender_id);

create index if not exists idx_macros_workspace on public.macros(workspace_id) where is_active = true;

-- 5. HELPER FUNCTIONS & TRIGGERS

--------------------------------------------------------------------------------
-- 5.1 Auto-update updated_at timestamp
--------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace trigger trg_workspaces_updated_at
    before update on public.workspaces
    for each row execute function public.set_updated_at();

create or replace trigger trg_profiles_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();

create or replace trigger trg_workspace_members_updated_at
    before update on public.workspace_members
    for each row execute function public.set_updated_at();

create or replace trigger trg_tickets_updated_at
    before update on public.tickets
    for each row execute function public.set_updated_at();

create or replace trigger trg_ticket_messages_updated_at
    before update on public.ticket_messages
    for each row execute function public.set_updated_at();

create or replace trigger trg_macros_updated_at
    before update on public.macros
    for each row execute function public.set_updated_at();

--------------------------------------------------------------------------------
-- 5.2 Auto-generate sequential ticket_number per workspace
--------------------------------------------------------------------------------
create or replace function public.assign_ticket_number()
returns trigger
language plpgsql
as $$
declare
    next_num integer;
begin
    if new.ticket_number is null or new.ticket_number = 0 then
        select coalesce(max(ticket_number), 1000) + 1
        into next_num
        from public.tickets
        where workspace_id = new.workspace_id;

        new.ticket_number := next_num;
    end if;
    return new;
end;
$$;

create or replace trigger trg_tickets_assign_number
    before insert on public.tickets
    for each row execute function public.assign_ticket_number();

--------------------------------------------------------------------------------
-- 5.3 Sync new auth.users into public.profiles
--------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, full_name, avatar_url)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();
    return new;
end;
$$;

-- Trigger attached to auth.users (Supabase convention)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert or update on auth.users
    for each row execute function public.handle_new_user();

--------------------------------------------------------------------------------
-- 5.4 Update ticket updated_at and status when a message arrives
--------------------------------------------------------------------------------
create or replace function public.touch_ticket_on_message()
returns trigger
language plpgsql
as $$
begin
    update public.tickets
    set updated_at = now()
    where id = new.ticket_id;
    return new;
end;
$$;

create or replace trigger trg_ticket_messages_touch_ticket
    after insert on public.ticket_messages
    for each row execute function public.touch_ticket_on_message();

-- 6. SECURITY DEFINER RLS HELPER FUNCTIONS
-- Using security definer functions ensures RLS checks bypass recursive table access
-- and execute with optimal index scans.

create or replace function public.get_workspace_role(ws_id uuid)
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
    select role
    from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and is_active = true
    limit 1;
$$;

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.workspace_members
        where workspace_id = ws_id
          and user_id = auth.uid()
          and is_active = true
    );
$$;

create or replace function public.is_workspace_staff(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.workspace_members
        where workspace_id = ws_id
          and user_id = auth.uid()
          and role in ('agent', 'admin')
          and is_active = true
    );
$$;

create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.workspace_members
        where workspace_id = ws_id
          and user_id = auth.uid()
          and role = 'admin'
          and is_active = true
    );
$$;

-- 7. ROW-LEVEL SECURITY (RLS) POLICIES

--------------------------------------------------------------------------------
-- 7.1 Enable RLS on all tables
--------------------------------------------------------------------------------
alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.macros enable row level security;

--------------------------------------------------------------------------------
-- 7.2 Workspaces Policies
--------------------------------------------------------------------------------
-- Users can view workspaces they are members of
create policy "Workspaces viewable by members"
    on public.workspaces
    for select
    using (public.is_workspace_member(id));

-- Any authenticated user can create a workspace (they will become the initial admin)
create policy "Authenticated users can create workspaces"
    on public.workspaces
    for insert
    to authenticated
    with check (true);

-- Only workspace admins can update workspace settings
create policy "Admins can update workspace"
    on public.workspaces
    for update
    using (public.is_workspace_admin(id))
    with check (public.is_workspace_admin(id));

-- Only workspace admins can delete a workspace
create policy "Admins can delete workspace"
    on public.workspaces
    for delete
    using (public.is_workspace_admin(id));

--------------------------------------------------------------------------------
-- 7.3 Profiles Policies
--------------------------------------------------------------------------------
-- Users can see their own profile or profiles of peers in shared workspaces
create policy "Profiles viewable by self and workspace peers"
    on public.profiles
    for select
    using (
        auth.uid() = id
        or exists (
            select 1
            from public.workspace_members wm_self
            join public.workspace_members wm_peer on wm_self.workspace_id = wm_peer.workspace_id
            where wm_self.user_id = auth.uid()
              and wm_peer.user_id = profiles.id
        )
    );

create policy "Users can update own profile"
    on public.profiles
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

create policy "Users can insert own profile"
    on public.profiles
    for insert
    with check (auth.uid() = id);

--------------------------------------------------------------------------------
-- 7.4 Workspace Members Policies
--------------------------------------------------------------------------------
-- Staff can view all members; customers can only view their own membership
create policy "Workspace members viewable by staff or self"
    on public.workspace_members
    for select
    using (
        public.is_workspace_staff(workspace_id)
        or user_id = auth.uid()
    );

-- Admins can add members, or a user creating a workspace can insert their admin record
create policy "Admins can add workspace members"
    on public.workspace_members
    for insert
    with check (
        public.is_workspace_admin(workspace_id)
        or (
            user_id = auth.uid()
            and not exists (select 1 from public.workspace_members wm where wm.workspace_id = workspace_members.workspace_id)
        )
    );

-- Admins can update workspace members (roles, status)
create policy "Admins can update workspace members"
    on public.workspace_members
    for update
    using (public.is_workspace_admin(workspace_id))
    with check (public.is_workspace_admin(workspace_id));

-- Admins can remove workspace members
create policy "Admins can remove workspace members"
    on public.workspace_members
    for delete
    using (public.is_workspace_admin(workspace_id));

--------------------------------------------------------------------------------
-- 7.5 Tickets Policies
--------------------------------------------------------------------------------
-- SELECT:
-- Agents & Admins can see all tickets in their workspace.
-- Customers can ONLY see tickets where customer_id = auth.uid().
create policy "Tickets select policy"
    on public.tickets
    for select
    using (
        public.is_workspace_staff(workspace_id)
        or (
            customer_id = auth.uid()
            and public.is_workspace_member(workspace_id)
        )
    );

-- INSERT:
-- Staff can create tickets for any customer in the workspace.
-- Customers can only create tickets where customer_id = auth.uid().
create policy "Tickets insert policy"
    on public.tickets
    for insert
    with check (
        (public.is_workspace_staff(workspace_id))
        or (
            customer_id = auth.uid()
            and public.is_workspace_member(workspace_id)
        )
    );

-- UPDATE:
-- Staff can update tickets (status, assignment, priority, tags, etc.)
-- Customers can only update their own tickets (e.g. mark solved/close)
create policy "Tickets update policy"
    on public.tickets
    for update
    using (
        public.is_workspace_staff(workspace_id)
        or (
            customer_id = auth.uid()
            and public.is_workspace_member(workspace_id)
        )
    )
    with check (
        public.is_workspace_staff(workspace_id)
        or (
            customer_id = auth.uid()
            and public.is_workspace_member(workspace_id)
        )
    );

-- DELETE:
-- Only workspace admins can delete tickets
create policy "Admins can delete tickets"
    on public.tickets
    for delete
    using (public.is_workspace_admin(workspace_id));

--------------------------------------------------------------------------------
-- 7.6 Ticket Messages Policies
-- CRITICAL REQUIREMENT: Customers NEVER see internal notes!
--------------------------------------------------------------------------------
-- SELECT:
-- Staff (agent/admin) can view all messages (both 'public_reply' and 'internal_note').
-- Customers can ONLY view messages where:
--   1. type = 'public_reply'
--   2. The ticket belongs to them (customer_id = auth.uid())
-- Customers are NEVER allowed to read 'internal_note'.
create policy "Ticket messages select policy"
    on public.ticket_messages
    for select
    using (
        -- Staff can see all message types
        public.is_workspace_staff(workspace_id)
        -- Customers can ONLY see public_reply on their own tickets
        or (
            type = 'public_reply'
            and exists (
                select 1
                from public.tickets t
                where t.id = ticket_messages.ticket_id
                  and t.customer_id = auth.uid()
                  and t.workspace_id = ticket_messages.workspace_id
            )
        )
    );

-- INSERT:
-- Staff can insert both 'public_reply' and 'internal_note'.
-- Customers can ONLY insert 'public_reply' to their own tickets.
create policy "Ticket messages insert policy"
    on public.ticket_messages
    for insert
    with check (
        sender_id = auth.uid()
        and (
            -- Staff can send both public replies and internal notes
            public.is_workspace_staff(workspace_id)
            -- Customers can only send public replies to their own tickets
            or (
                type = 'public_reply'
                and exists (
                    select 1
                    from public.tickets t
                    where t.id = ticket_messages.ticket_id
                      and t.customer_id = auth.uid()
                      and t.workspace_id = ticket_messages.workspace_id
                )
            )
        )
    );

-- UPDATE:
-- Staff can edit their own internal notes if needed.
-- Customers cannot edit messages.
create policy "Staff can update own internal notes"
    on public.ticket_messages
    for update
    using (
        sender_id = auth.uid()
        and type = 'internal_note'
        and public.is_workspace_staff(workspace_id)
    )
    with check (
        sender_id = auth.uid()
        and type = 'internal_note'
        and public.is_workspace_staff(workspace_id)
    );

-- DELETE:
-- Only workspace admins can delete messages
create policy "Admins can delete messages"
    on public.ticket_messages
    for delete
    using (public.is_workspace_admin(workspace_id));

--------------------------------------------------------------------------------
-- 7.7 Macros Policies
-- Macros are staff productivity tools; customers have no access.
--------------------------------------------------------------------------------
-- SELECT: Staff only
create policy "Macros viewable by staff"
    on public.macros
    for select
    using (public.is_workspace_staff(workspace_id));

-- INSERT: Staff only
create policy "Staff can create macros"
    on public.macros
    for insert
    with check (
        public.is_workspace_staff(workspace_id)
        and (created_by = auth.uid() or created_by is null)
    );

-- UPDATE: Admins or macro creator
create policy "Admins or creator can update macros"
    on public.macros
    for update
    using (
        public.is_workspace_admin(workspace_id)
        or (public.is_workspace_staff(workspace_id) and created_by = auth.uid())
    )
    with check (
        public.is_workspace_admin(workspace_id)
        or (public.is_workspace_staff(workspace_id) and created_by = auth.uid())
    );

-- DELETE: Admins or macro creator
create policy "Admins or creator can delete macros"
    on public.macros
    for delete
    using (
        public.is_workspace_admin(workspace_id)
        or (public.is_workspace_staff(workspace_id) and created_by = auth.uid())
    );
