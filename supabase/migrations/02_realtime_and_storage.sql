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
alter table public.tickets add column if not exists first_responded_at timestamptz;
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
