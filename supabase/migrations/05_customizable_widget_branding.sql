-- ==============================================================================
-- FluxDesk Migration: 05_customizable_widget_branding.sql
-- Description: Add welcome greetings, logo, and launcher customization columns
--              to public.workspaces, and create public workspace-assets bucket.
-- ==============================================================================

-- 1. Add branding columns to workspaces table
alter table public.workspaces
    add column if not exists welcome_title text default 'Hi there! 👋 How can we help you today?',
    add column if not exists welcome_subtitle text default 'Fill in your details below and a member of our team will assist you right away.',
    add column if not exists logo_url text,
    add column if not exists launcher_icon_url text,
    add column if not exists launcher_text text default 'Chat with us',
    add column if not exists show_launcher_text boolean default false;

-- Update existing workspaces with default greetings if null
update public.workspaces
set welcome_title = 'Hi there! 👋 How can we help you today?'
where welcome_title is null;

update public.workspaces
set welcome_subtitle = 'Fill in your details below and a member of our team will assist you right away.'
where welcome_subtitle is null;

update public.workspaces
set launcher_text = 'Chat with us'
where launcher_text is null;

update public.workspaces
set show_launcher_text = false
where show_launcher_text is null;


-- 2. Create the 'workspace-assets' public storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'workspace-assets',
    'workspace-assets',
    true,
    10485760, -- 10MB limit
    array['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
    public = true,
    file_size_limit = 10485760;


-- 3. Storage RLS Policies for 'workspace-assets'
-- 3.1 Allow public read access to all assets in workspace-assets
drop policy if exists "Public Access to workspace-assets" on storage.objects;
create policy "Public Access to workspace-assets"
    on storage.objects
    for select
    using (bucket_id = 'workspace-assets');

-- 3.2 Allow authenticated staff/admins to upload assets
drop policy if exists "Allow staff upload to workspace-assets" on storage.objects;
create policy "Allow staff upload to workspace-assets"
    on storage.objects
    for insert
    with check (
        bucket_id = 'workspace-assets'
        and (
            auth.role() = 'authenticated'
            or auth.role() = 'service_role'
        )
    );

-- 3.3 Allow staff/admins to update or delete their assets
drop policy if exists "Allow staff update workspace-assets" on storage.objects;
create policy "Allow staff update workspace-assets"
    on storage.objects
    for update
    using (bucket_id = 'workspace-assets');

drop policy if exists "Allow staff delete workspace-assets" on storage.objects;
create policy "Allow staff delete workspace-assets"
    on storage.objects
    for delete
    using (bucket_id = 'workspace-assets');
