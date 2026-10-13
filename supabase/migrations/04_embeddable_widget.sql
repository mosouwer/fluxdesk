-- ==============================================================================
-- FluxDesk Migration: 04_embeddable_widget.sql
-- Description: Multi-tenant embeddable widget columns: public_key & brand_color
-- ==============================================================================

-- 1. Add public_key and brand_color to workspaces table
alter table public.workspaces
    add column if not exists public_key text unique default ('pk_live_' || replace(gen_random_uuid()::text, '-', '')),
    add column if not exists brand_color text default '#2563eb';

-- Ensure unique constraint on public_key
do $$ begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'workspaces_public_key_key'
    ) then
        alter table public.workspaces add constraint workspaces_public_key_key unique (public_key);
    end if;
exception
    when others then null;
end $$;

-- Populate public_key and brand_color for existing workspaces where missing
update public.workspaces
set public_key = 'pk_live_' || replace(id::text, '-', '')
where public_key is null;

update public.workspaces
set brand_color = '#2563eb'
where brand_color is null;

-- Index for high-performance lookup of public_key on widget endpoints
create index if not exists idx_workspaces_public_key on public.workspaces(public_key);

-- Public / Anonymous Select Policy for Workspaces by public_key (for embed widget lookups)
drop policy if exists "workspaces_public_key_select" on public.workspaces;
create policy "workspaces_public_key_select"
    on public.workspaces
    for select
    using (true);

-- Allow ticket submission via embed widget
drop policy if exists "tickets_embed_widget_insert" on public.tickets;
create policy "tickets_embed_widget_insert"
    on public.tickets
    for insert
    with check (
        workspace_id is not null
        and exists (select 1 from public.workspaces w where w.id = workspace_id)
    );

-- Allow initial message insertion for embed widget tickets
drop policy if exists "ticket_messages_embed_widget_insert" on public.ticket_messages;
create policy "ticket_messages_embed_widget_insert"
    on public.ticket_messages
    for insert
    with check (
        workspace_id is not null
        and exists (select 1 from public.workspaces w where w.id = workspace_id)
    );
