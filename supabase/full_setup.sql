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
-- ==============================================================================
-- FluxDesk Migration: 02_realtime_and_storage.sql
-- Description: Configure Supabase Realtime replication, replica identity,
--              ticket-attachments storage bucket, storage RLS policies,
--              and reinforce ticket_messages internal note RLS isolation.
-- ==============================================================================

-- 1. REALTIME REPLICATION CONFIGURATION
--------------------------------------------------------------------------------
-- 1.1 Enable Realtime publication for tickets and ticket_messages
do $$
begin
    -- Ensure publication exists
    if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        create publication supabase_realtime;
    end if;

    -- Add tickets table if not already in publication
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'tickets'
    ) then
        alter publication supabase_realtime add table public.tickets;
    end if;

    -- Add ticket_messages table if not already in publication
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'ticket_messages'
    ) then
        alter publication supabase_realtime add table public.ticket_messages;
    end if;
end $$;

-- 1.2 Set REPLICA IDENTITY FULL so updates broadcast complete row data
alter table public.tickets replica identity full;
alter table public.ticket_messages replica identity full;


-- 2. SUPABASE STORAGE: ticket-attachments BUCKET & RLS POLICIES
--------------------------------------------------------------------------------
-- 2.1 Create the 'ticket-attachments' public storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'ticket-attachments',
    'ticket-attachments',
    true,
    26214400, -- 25MB file size limit
    null      -- Accepts all file types (PNG, JPG, PDF, TXT, LOG, etc.)
)
on conflict (id) do update set
    public = true,
    file_size_limit = 26214400;

-- 2.2 Storage RLS Policies on storage.objects

-- Allow all users (public, anon, and authenticated) to read files in ticket-attachments
drop policy if exists "Public read ticket-attachments" on storage.objects;
create policy "Public read ticket-attachments"
    on storage.objects
    for select
    using (bucket_id = 'ticket-attachments');

-- Allow authenticated users (customers and agents) to upload files into ticket-attachments
drop policy if exists "Authenticated upload ticket-attachments" on storage.objects;
create policy "Authenticated upload ticket-attachments"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'ticket-attachments');

-- Allow users to update their own uploaded files
drop policy if exists "Authenticated update own ticket-attachments" on storage.objects;
create policy "Authenticated update own ticket-attachments"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'ticket-attachments' and auth.uid() = owner)
    with check (bucket_id = 'ticket-attachments' and auth.uid() = owner);

-- Allow users to delete their own uploaded files
drop policy if exists "Authenticated delete own ticket-attachments" on storage.objects;
create policy "Authenticated delete own ticket-attachments"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'ticket-attachments' and auth.uid() = owner);


-- 3. REINFORCE TICKET MESSAGES RLS FOR INTERNAL NOTES
--------------------------------------------------------------------------------
-- Ensure RLS is active on ticket_messages
alter table public.ticket_messages enable row level security;

-- Drop any previous select policies to guarantee clean, non-conflicting rules
drop policy if exists "Ticket messages select policy" on public.ticket_messages;
drop policy if exists "Staff can view all messages including internal notes" on public.ticket_messages;
drop policy if exists "Customers can only view public replies on own tickets" on public.ticket_messages;

-- Policy 1: Agents and Admins can view ALL messages (both 'public_reply' and 'internal_note')
create policy "Staff can view all messages including internal notes"
    on public.ticket_messages
    for select
    using (
        public.is_workspace_staff(workspace_id)
    );

-- Policy 2: Customers can ONLY view rows where type = 'public_reply' on their own tickets.
-- Under NO circumstances can any customer or unauthenticated user view rows where type = 'internal_note'.
create policy "Customers can only view public replies on own tickets"
    on public.ticket_messages
    for select
    using (
        type = 'public_reply'
        and exists (
            select 1
            from public.tickets t
            where t.id = ticket_messages.ticket_id
              and t.customer_id = auth.uid()
              and t.workspace_id = ticket_messages.workspace_id
        )
    );

-- Policy 3: Ensure Customers cannot insert internal notes (Staff only for internal notes)
drop policy if exists "Ticket messages insert policy" on public.ticket_messages;
create policy "Ticket messages insert policy"
    on public.ticket_messages
    for insert
    with check (
        sender_id = auth.uid()
        and (
            -- Staff can send both public replies and internal notes
            public.is_workspace_staff(workspace_id)
            -- Customers can ONLY send public replies to their own tickets
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
-- ==============================================================================
-- FluxDesk: Realistic Seed Data for Multi-Tenant Helpdesk
-- Description: Test workspaces, auth users, profiles, memberships, tickets,
--              messages (public replies & internal notes), and macros.
-- ==============================================================================

-- Clean up any existing sample seed data safely
delete from public.ticket_messages where workspace_id in ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');
delete from public.macros where workspace_id in ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');
delete from public.tickets where workspace_id in ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');
delete from public.workspace_members where workspace_id in ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');
delete from public.workspaces where id in ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');

-- 1. SEED WORKSPACES (Tenants)
insert into public.workspaces (id, name, slug, custom_domain, settings)
values
(
    'a0000000-0000-0000-0000-000000000001',
    'Acme Cloud Technologies',
    'acme-cloud',
    'support.acmecloud.io',
    '{
        "support_email": "support@acmecloud.io",
        "ticket_prefix": "ACM",
        "business_hours": {
            "timezone": "America/New_York",
            "start": "08:00",
            "end": "18:00",
            "workdays": [1, 2, 3, 4, 5]
        },
        "sla_hours": {
            "urgent": 2,
            "high": 4,
            "normal": 12,
            "low": 24
        }
    }'::jsonb
),
(
    'a0000000-0000-0000-0000-000000000002',
    'Nexus Health Solutions',
    'nexus-health',
    'help.nexushealth.com',
    '{
        "support_email": "care@nexushealth.com",
        "ticket_prefix": "NEX",
        "business_hours": {
            "timezone": "America/Los_Angeles",
            "start": "07:00",
            "end": "19:00",
            "workdays": [1, 2, 3, 4, 5, 6]
        },
        "sla_hours": {
            "urgent": 1,
            "high": 3,
            "normal": 8,
            "low": 24
        }
    }'::jsonb
)
on conflict (id) do update
set name = excluded.name, slug = excluded.slug, settings = excluded.settings;

-- 2. SEED AUTH USERS & PROFILES
-- For local Supabase and testing environments, we seed auth.users with encrypted bcrypt passwords ('password123')
do $$
declare
    default_password text := crypt('password123', gen_salt('bf'));
begin
    -- Admin: Alex Vance
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    values (
        'u0000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'alex.admin@acmesupport.com',
        default_password,
        now(),
        '{"full_name": "Alex Vance", "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb"}'::jsonb,
        now(),
        now()
    ) on conflict (id) do nothing;

    -- Agent 1: Sarah Connor
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    values (
        'u0000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'sarah.agent@acmesupport.com',
        default_password,
        now(),
        '{"full_name": "Sarah Connor", "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2"}'::jsonb,
        now(),
        now()
    ) on conflict (id) do nothing;

    -- Agent 2: David Kim
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    values (
        'u0000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'david.agent@acmesupport.com',
        default_password,
        now(),
        '{"full_name": "David Kim", "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"}'::jsonb,
        now(),
        now()
    ) on conflict (id) do nothing;

    -- Customer 1: Emily Watson
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    values (
        'u0000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'emily.watson@enterprise-client.com',
        default_password,
        now(),
        '{"full_name": "Emily Watson", "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330"}'::jsonb,
        now(),
        now()
    ) on conflict (id) do nothing;

    -- Customer 2: Marcus Brody
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    values (
        'u0000000-0000-0000-0000-000000000005',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'marcus.brody@fintech-corp.com',
        default_password,
        now(),
        '{"full_name": "Marcus Brody", "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e"}'::jsonb,
        now(),
        now()
    ) on conflict (id) do nothing;

    -- Nexus Admin: Dr. Rachel Green
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    values (
        'u0000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'rachel.green@nexushealth.com',
        default_password,
        now(),
        '{"full_name": "Dr. Rachel Green", "avatar_url": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2"}'::jsonb,
        now(),
        now()
    ) on conflict (id) do nothing;

    -- Nexus Customer: Tom Hanks
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
    values (
        'u0000000-0000-0000-0000-000000000007',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'tom.hanks@patientcare.org',
        default_password,
        now(),
        '{"full_name": "Tom Hanks", "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e"}'::jsonb,
        now(),
        now()
    ) on conflict (id) do nothing;
end $$;

-- Explicitly ensure public.profiles are populated
insert into public.profiles (id, email, full_name, avatar_url)
values
    ('u0000000-0000-0000-0000-000000000001', 'alex.admin@acmesupport.com', 'Alex Vance', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'),
    ('u0000000-0000-0000-0000-000000000002', 'sarah.agent@acmesupport.com', 'Sarah Connor', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2'),
    ('u0000000-0000-0000-0000-000000000003', 'david.agent@acmesupport.com', 'David Kim', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d'),
    ('u0000000-0000-0000-0000-000000000004', 'emily.watson@enterprise-client.com', 'Emily Watson', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'),
    ('u0000000-0000-0000-0000-000000000005', 'marcus.brody@fintech-corp.com', 'Marcus Brody', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e'),
    ('u0000000-0000-0000-0000-000000000006', 'rachel.green@nexushealth.com', 'Dr. Rachel Green', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2'),
    ('u0000000-0000-0000-0000-000000000007', 'tom.hanks@patientcare.org', 'Tom Hanks', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e')
on conflict (id) do update
set full_name = excluded.full_name, avatar_url = excluded.avatar_url;

-- 3. SEED WORKSPACE MEMBERSHIPS
insert into public.workspace_members (workspace_id, user_id, role, is_active)
values
    -- Acme Cloud Technologies
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'admin', true),
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'agent', true),
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000003', 'agent', true),
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000004', 'customer', true),
    ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000005', 'customer', true),

    -- Nexus Health Solutions (Tenant 2 isolation test)
    ('a0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000006', 'admin', true),
    ('a0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000007', 'customer', true)
on conflict (workspace_id, user_id) do update
set role = excluded.role, is_active = excluded.is_active;

-- 4. SEED TICKETS
insert into public.tickets (
    id,
    workspace_id,
    ticket_number,
    subject,
    description,
    status,
    priority,
    channel,
    customer_id,
    assigned_agent_id,
    tags,
    metadata,
    created_at,
    updated_at
)
values
(
    't0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    1001,
    'Critical: Unable to provision SSD storage volume in us-east-1',
    'Our deployment pipeline failed this morning with HTTP 500 when requesting a 500GB gp3 volume in us-east-1b.',
    'open',
    'urgent',
    'web',
    'u0000000-0000-0000-0000-000000000004', -- Emily Watson
    'u0000000-0000-0000-0000-000000000002', -- Sarah Connor
    array['infrastructure', 'storage', 'us-east-1', 'production-blocker'],
    '{"service_id": "srv_storage_ebs", "environment": "production"}'::jsonb,
    now() - interval '4 hours',
    now() - interval '1 hour'
),
(
    't0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    1002,
    'Billing inquiry: Duplicate charges on invoice #INV-2025-089',
    'I noticed our corporate Amex was billed twice for \$2,450 on October 1st. Please review and process a credit memo.',
    'pending',
    'high',
    'email',
    'u0000000-0000-0000-0000-000000000005', -- Marcus Brody
    'u0000000-0000-0000-0000-000000000003', -- David Kim
    array['billing', 'invoice', 'refund', 'finance'],
    '{"invoice_number": "INV-2025-089", "amount": 2450.00}'::jsonb,
    now() - interval '1 day',
    now() - interval '2 hours'
),
(
    't0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    1003,
    'Feature Request: SAML 2.0 SSO Integration with Okta',
    'We are scaling our team to 150 engineers and require central identity provider enforcement through Okta.',
    'on_hold',
    'normal',
    'web',
    'u0000000-0000-0000-0000-000000000004', -- Emily Watson
    'u0000000-0000-0000-0000-000000000002', -- Sarah Connor
    array['roadmap', 'enterprise', 'sso', 'okta'],
    '{"jira_key": "PROD-4091"}'::jsonb,
    now() - interval '3 days',
    now() - interval '1 day'
),
(
    't0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    1004,
    'Session timeout resets active dashboard filters',
    'When re-authenticating after 30 minutes of inactivity, the custom dashboard date filters reset to Default 7 Days.',
    'solved',
    'low',
    'chat',
    'u0000000-0000-0000-0000-000000000005', -- Marcus Brody
    'u0000000-0000-0000-0000-000000000003', -- David Kim
    array['ui', 'sessions', 'filter-bug'],
    '{"browser": "Chrome 129", "os": "macOS Sonoma"}'::jsonb,
    now() - interval '5 days',
    now() - interval '2 days'
),
(
    't0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000002',
    2001,
    'HIPAA compliance audit export request',
    'Please generate the access log dump for audit period Q3 2025.',
    'open',
    'high',
    'email',
    'u0000000-0000-0000-0000-000000000007', -- Tom Hanks (Nexus)
    'u0000000-0000-0000-0000-000000000006', -- Rachel Green (Nexus)
    array['compliance', 'hipaa', 'audit'],
    '{"compliance_type": "HIPAA"}'::jsonb,
    now() - interval '6 hours',
    now() - interval '6 hours'
)
on conflict (id) do nothing;

-- 5. SEED TICKET MESSAGES (Thread with Public Replies & Confidential Internal Notes)
insert into public.ticket_messages (
    id,
    workspace_id,
    ticket_id,
    sender_id,
    type,
    body,
    attachments,
    created_at
)
values
--------------------------------------------------------------------------------
-- Messages for Ticket 1001 (Storage Provisioning Issue)
--------------------------------------------------------------------------------
(
    'm0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000004', -- Customer Emily Watson
    'public_reply',
    'Hello Support Team,\n\nOur deployment pipeline failed this morning with HTTP 500 when requesting a 500GB gp3 volume in us-east-1b. We are blocked from pushing our release.\n\nError output attached.',
    '[{"filename": "terraform_error.log", "size_bytes": 14208, "url": "https://storage.acmecloud.io/attachments/err_1001.log"}]'::jsonb,
    now() - interval '4 hours'
),
(
    'm0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000002', -- Agent Sarah Connor
    'internal_note',
    '**INTERNAL DIAGNOSTICS - DO NOT SHARE EXTERNALLY**\n\nInvestigated AWS CloudWatch metric alarms for cell `iad-cell-4`. The EBS API rate limiter throttled their tenant account due to an automated retry loop from their CI token. I escalated to SRE on Slack (#cloud-sre-oncall). Provisioning pool was drained by another heavy batch job.',
    '[]'::jsonb,
    now() - interval '3 hours'
),
(
    'm0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000002', -- Agent Sarah Connor
    'public_reply',
    'Hi Emily,\n\nThanks for reaching out. We have identified temporary resource contention in the `us-east-1b` availability zone. Our cloud operations team is actively expanding the allocated capacity pool.\n\nIn the meantime, you can provision successfully in `us-east-1a` or `us-east-1c` without interruption. We will update you as soon as 1b is fully restored.',
    '[]'::jsonb,
    now() - interval '2 hours 30 minutes'
),
(
    'm0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000004', -- Customer Emily Watson
    'public_reply',
    'Thank you Sarah! Switching the AZ target in our manifest to us-east-1a worked as a temporary workaround. Please keep this ticket open until us-east-1b is confirmed operational.',
    '[]'::jsonb,
    now() - interval '1 hour 45 minutes'
),
(
    'm0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000001',
    'u0000000-0000-0000-0000-000000000001', -- Admin Alex Vance
    'internal_note',
    'Capacity rebalancing completed in cluster us-east-1b. Sarah, you can run a synthetic provisioning test and notify customer to close.',
    '[]'::jsonb,
    now() - interval '1 hour'
),

--------------------------------------------------------------------------------
-- Messages for Ticket 1002 (Duplicate Billing)
--------------------------------------------------------------------------------
(
    'm0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000002',
    'u0000000-0000-0000-0000-000000000005', -- Customer Marcus Brody
    'public_reply',
    'I noticed our corporate Amex was billed twice for \$2,450 on October 1st. Please review and process a credit memo.',
    '[]'::jsonb,
    now() - interval '1 day'
),
(
    'm0000000-0000-0000-0000-000000000007',
    'a0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000002',
    'u0000000-0000-0000-0000-000000000003', -- Agent David Kim
    'internal_note',
    '**FINANCE REVIEW**: Verified in Stripe dashboard. Webhook timeout caused idempotency key expiration on retry `ch_3O8q18...`. Confirmed \$2,450 was charged twice. Initiated partial refund `re_3O8q29...` back to Amex ending in 4012.',
    '[]'::jsonb,
    now() - interval '20 hours'
),
(
    'm0000000-0000-0000-0000-000000000008',
    'a0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000002',
    'u0000000-0000-0000-0000-000000000003', -- Agent David Kim
    'public_reply',
    'Hi Marcus,\n\nWe sincerely apologize for the inconvenience. We have verified the duplicate billing and immediately issued a full refund of \$2,450.00 back to your card ending in 4012.\n\nYou should see the funds reflected on your statement within 3 to 5 business days. Please let us know if you need an updated receipt PDF.',
    '[]'::jsonb,
    now() - interval '18 hours'
),

--------------------------------------------------------------------------------
-- Messages for Ticket 1003 (SAML SSO Feature Request)
--------------------------------------------------------------------------------
(
    'm0000000-0000-0000-0000-000000000009',
    'a0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000003',
    'u0000000-0000-0000-0000-000000000004', -- Emily Watson
    'public_reply',
    'We are scaling our team to 150 engineers and require central identity provider enforcement through Okta. What is the timeline for SAML 2.0 support?',
    '[]'::jsonb,
    now() - interval '3 days'
),
(
    'm0000000-0000-0000-0000-000000000010',
    'a0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000003',
    'u0000000-0000-0000-0000-000000000002', -- Sarah Connor
    'internal_note',
    'Customer is on the Enterprise tier paying \$35k ARR. Spoke with Head of Product (@claire): Okta integration beta is slated for release in sprint 24 (mid-November). We should invite them to the private preview.',
    '[]'::jsonb,
    now() - interval '2 days'
),
(
    'm0000000-0000-0000-0000-000000000011',
    'a0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000003',
    'u0000000-0000-0000-0000-000000000002', -- Sarah Connor
    'public_reply',
    'Hi Emily,\n\nGreat news! Okta SAML 2.0 SSO is entering private beta next month. Given your team size, we would love to include your organization in our early access program. I have linked your account to the beta group and will follow up with configuration instructions as soon as the sandbox environment is available.',
    '[]'::jsonb,
    now() - interval '1 day'
)
on conflict (id) do nothing;

-- 6. SEED MACROS (Zendesk-style Canned Actions)
insert into public.macros (
    id,
    workspace_id,
    title,
    description,
    actions,
    is_active,
    created_by
)
values
(
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Troubleshooting: Clear Browser Cache & Storage',
    'Standard instructions for client-side web application cache clearing.',
    '[
        {
            "action": "add_comment",
            "type": "public_reply",
            "body": "Could you please try clearing your browser cookies and local storage cache, or attempt to reproduce the issue in an Incognito/Private window? Often stale service workers cause client-side rendering anomalies."
        },
        {
            "action": "set_status",
            "value": "pending"
        },
        {
            "action": "add_tags",
            "value": ["browser-cache", "client-troubleshoot"]
        }
    ]'::jsonb,
    true,
    'u0000000-0000-0000-0000-000000000001' -- Alex Vance
),
(
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Billing: Refund Processed Notice',
    'Notifies customer that duplicate charge or refund has been completed.',
    '[
        {
            "action": "add_comment",
            "type": "public_reply",
            "body": "We have reviewed your billing record and processed a full refund to your original payment method. Depending on your financial institution, the credit should appear within 3 to 5 business days."
        },
        {
            "action": "add_comment",
            "type": "internal_note",
            "body": "System Macro applied: Billing refund issued and customer notified."
        },
        {
            "action": "set_status",
            "value": "solved"
        },
        {
            "action": "add_tags",
            "value": ["refund-completed", "billing-resolved"]
        }
    ]'::jsonb,
    true,
    'u0000000-0000-0000-0000-000000000003' -- David Kim
),
(
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Escalate to Tier 3 Engineering (Internal)',
    'Logs an internal note and sets ticket to On-Hold while engineering investigates.',
    '[
        {
            "action": "add_comment",
            "type": "internal_note",
            "body": "Ticket escalated to Tier 3 Platform Engineering. Assigned on-call rotation notified via PagerDuty/Jira."
        },
        {
            "action": "set_status",
            "value": "on_hold"
        },
        {
            "action": "set_priority",
            "value": "urgent"
        },
        {
            "action": "add_tags",
            "value": ["tier3-escalated", "engineering-investigating"]
        }
    ]'::jsonb,
    true,
    'u0000000-0000-0000-0000-000000000002' -- Sarah Connor
),
(
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'General: Close Inactive Ticket',
    'Polite closing message when customer has been unresponsive for 7+ days.',
    '[
        {
            "action": "add_comment",
            "type": "public_reply",
            "body": "Since we have not heard back from you in several days, we are closing this ticket. If you still need help, feel free to reply directly to this thread anytime to automatically reopen it."
        },
        {
            "action": "set_status",
            "value": "closed"
        }
    ]'::jsonb,
    true,
    'u0000000-0000-0000-0000-000000000001' -- Alex Vance
)
on conflict (id) do nothing;
