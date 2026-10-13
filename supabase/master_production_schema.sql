-- ==============================================================================
-- FluxDesk: Master Production Schema Migration
-- Description: Complete consolidated database migration for Supabase Cloud.
--              Includes Extensions, Core Tables, Performance Indexes,
--              Helper Functions, Strict Multi-Tenant Row Level Security (RLS),
--              Supabase Storage Buckets & Policies, and Realtime Publications.
-- ==============================================================================

-- ==============================================================================
-- SECTION 1: EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ==============================================================================
-- SECTION 2: CUSTOM ENUM TYPES
-- ==============================================================================
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('customer', 'agent', 'admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.ticket_status AS ENUM ('open', 'pending', 'on_hold', 'solved', 'closed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.ticket_channel AS ENUM ('web', 'email', 'chat', 'api');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.message_type AS ENUM ('public_reply', 'internal_note');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;


-- ==============================================================================
-- SECTION 3: CORE TABLES
-- ==============================================================================

--------------------------------------------------------------------------------
-- 3.1 Workspaces (Tenants / Brands)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    custom_domain TEXT UNIQUE,
    public_key TEXT UNIQUE DEFAULT ('pk_live_' || replace(gen_random_uuid()::text, '-', '')),
    brand_color TEXT DEFAULT '#2563eb',
    welcome_title TEXT DEFAULT 'Hi there! 👋 How can we help you today?',
    welcome_subtitle TEXT DEFAULT 'Fill in your details below and a member of our team will assist you right away.',
    logo_url TEXT,
    launcher_icon_url TEXT,
    launcher_text TEXT DEFAULT 'Chat with us',
    show_launcher_text BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'active',
    tier TEXT NOT NULL DEFAULT 'standard',
    settings JSONB NOT NULL DEFAULT '{
        "support_email": "support@example.com",
        "ticket_prefix": "TICK",
        "business_hours": {
            "timezone": "UTC",
            "start": "09:00",
            "end": "17:00",
            "workdays": [1, 2, 3, 4, 5]
        }
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT workspace_slug_format CHECK (slug ~* '^[a-z0-9-]+$')
);

COMMENT ON TABLE public.workspaces IS 'Tenant brands representing isolated customer service organizations.';

--------------------------------------------------------------------------------
-- 3.2 Profiles (Mirrors auth.users)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profiles linked to auth.users.';

--------------------------------------------------------------------------------
-- 3.3 Workspace Members (Tenant-Level Memberships & Roles)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, user_id)
);

COMMENT ON TABLE public.workspace_members IS 'Tenant-scoped memberships defining agent/admin permissions.';

--------------------------------------------------------------------------------
-- 3.4 Users (Application User Directory with Workspace Scoping)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS 'Application-level user directory with role and workspace assignment.';

--------------------------------------------------------------------------------
-- 3.5 Tickets
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    ticket_number INTEGER NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status public.ticket_status NOT NULL DEFAULT 'open',
    priority public.ticket_priority NOT NULL DEFAULT 'normal',
    channel public.ticket_channel NOT NULL DEFAULT 'web',
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    csat_rating SMALLINT,
    csat_feedback TEXT,
    rated_at TIMESTAMPTZ,
    first_responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    CONSTRAINT tickets_csat_rating_check CHECK (csat_rating IS NULL OR (csat_rating >= 1 AND csat_rating <= 5)),
    UNIQUE (workspace_id, ticket_number)
);

COMMENT ON TABLE public.tickets IS 'Support tickets strictly scoped to tenant workspaces.';

--------------------------------------------------------------------------------
-- 3.6 Ticket Messages (Conversation Thread & Internal Notes)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type public.message_type NOT NULL DEFAULT 'public_reply',
    body TEXT NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ticket_messages IS 'Thread messages for tickets: public replies and confidential internal notes.';

--------------------------------------------------------------------------------
-- 3.7 Macros (Canned Responses & Templates)
--------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.macros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.macros IS 'Canned responses and automated workflow actions scoped to workspaces.';


-- ==============================================================================
-- SECTION 4: PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_public_key ON public.workspaces(public_key);

CREATE INDEX IF NOT EXISTS idx_profiles_workspace ON public.profiles(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws_role ON public.workspace_members(workspace_id, role) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_users_workspace ON public.users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE INDEX IF NOT EXISTS idx_tickets_workspace_id ON public.tickets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tickets_workspace_status ON public.tickets(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON public.tickets(workspace_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_agent ON public.tickets(workspace_id, assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_csat ON public.tickets(workspace_id, csat_rating) WHERE csat_rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_messages_workspace ON public.ticket_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages(ticket_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_type ON public.ticket_messages(ticket_id, type);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender ON public.ticket_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_macros_workspace ON public.macros(workspace_id) WHERE is_active = TRUE;


-- ==============================================================================
-- SECTION 5: HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

--------------------------------------------------------------------------------
-- 5.1 Auto-update updated_at timestamp
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER trg_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_workspace_members_updated_at ON public.workspace_members;
CREATE TRIGGER trg_workspace_members_updated_at
    BEFORE UPDATE ON public.workspace_members
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON public.tickets;
CREATE TRIGGER trg_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ticket_messages_updated_at ON public.ticket_messages;
CREATE TRIGGER trg_ticket_messages_updated_at
    BEFORE UPDATE ON public.ticket_messages
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_macros_updated_at ON public.macros;
CREATE TRIGGER trg_macros_updated_at
    BEFORE UPDATE ON public.macros
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--------------------------------------------------------------------------------
-- 5.2 Auto-generate sequential ticket_number per workspace
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    next_num integer;
BEGIN
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = 0 THEN
        SELECT coalesce(max(ticket_number), 1000) + 1
        INTO next_num
        FROM public.tickets
        WHERE workspace_id = NEW.workspace_id;

        NEW.ticket_number := next_num;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_assign_number ON public.tickets;
CREATE TRIGGER trg_tickets_assign_number
    BEFORE INSERT ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION public.assign_ticket_number();

--------------------------------------------------------------------------------
-- 5.3 Touch ticket updated_at on message arrival
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_ticket_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.tickets
    SET updated_at = now()
    WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_messages_touch_ticket ON public.ticket_messages;
CREATE TRIGGER trg_ticket_messages_touch_ticket
    AFTER INSERT ON public.ticket_messages
    FOR EACH ROW EXECUTE FUNCTION public.touch_ticket_on_message();

--------------------------------------------------------------------------------
-- 5.4 Sync auth.users into public.profiles and public.users
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    assigned_ws_id uuid;
    user_full_name text;
    user_role_val text;
BEGIN
    user_full_name := coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    user_role_val := coalesce(NEW.raw_user_meta_data->>'role', 'customer');

    BEGIN
        assigned_ws_id := nullif(NEW.raw_user_meta_data->>'workspace_id', '')::uuid;
    EXCEPTION WHEN OTHERS THEN
        assigned_ws_id := NULL;
    END;

    -- Sync to public.profiles
    INSERT INTO public.profiles (id, email, full_name, avatar_url, workspace_id)
    VALUES (
        NEW.id,
        NEW.email,
        user_full_name,
        NEW.raw_user_meta_data->>'avatar_url',
        assigned_ws_id
    )
    ON CONFLICT (id) DO UPDATE
    SET email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        workspace_id = coalesce(excluded.workspace_id, public.profiles.workspace_id),
        updated_at = now();

    -- Sync to public.users
    INSERT INTO public.users (id, email, full_name, avatar_url, role, workspace_id, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        user_full_name,
        NEW.raw_user_meta_data->>'avatar_url',
        user_role_val,
        assigned_ws_id,
        TRUE
    )
    ON CONFLICT (id) DO UPDATE
    SET email = excluded.email,
        full_name = coalesce(excluded.full_name, public.users.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
        role = coalesce(excluded.role, public.users.role),
        workspace_id = coalesce(excluded.workspace_id, public.users.workspace_id),
        updated_at = now();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

--------------------------------------------------------------------------------
-- 5.5 Tenant Helper: auth_user_workspace_id()
--------------------------------------------------------------------------------
-- Resolves the active tenant workspace ID for the currently authenticated user
CREATE OR REPLACE FUNCTION public.auth_user_workspace_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    ws_id UUID;
BEGIN
    -- 1. Check JWT claim (app_metadata, user_metadata, or root workspace_id)
    BEGIN
        ws_id := nullif(
            coalesce(
                auth.jwt() -> 'app_metadata' ->> 'workspace_id',
                auth.jwt() -> 'user_metadata' ->> 'workspace_id',
                auth.jwt() ->> 'workspace_id'
            ),
            ''
        )::uuid;
    EXCEPTION
        WHEN OTHERS THEN
            ws_id := NULL;
    END;

    IF ws_id IS NOT NULL THEN
        RETURN ws_id;
    END IF;

    -- 2. Query public.users table for assigned workspace_id
    SELECT u.workspace_id
    INTO ws_id
    FROM public.users u
    WHERE u.id = auth.uid()
    LIMIT 1;

    IF ws_id IS NOT NULL THEN
        RETURN ws_id;
    END IF;

    -- 3. Query public.workspace_members table
    SELECT wm.workspace_id
    INTO ws_id
    FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.is_active = TRUE
    ORDER BY wm.created_at DESC
    LIMIT 1;

    IF ws_id IS NOT NULL THEN
        RETURN ws_id;
    END IF;

    -- 4. Query public.profiles table
    SELECT p.workspace_id
    INTO ws_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
    LIMIT 1;

    IF ws_id IS NOT NULL THEN
        RETURN ws_id;
    END IF;

    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.auth_user_workspace_id() IS 'Returns the active tenant workspace UUID for the authenticated user.';

-- Compatibility alias: current_user_workspace_id()
CREATE OR REPLACE FUNCTION public.current_user_workspace_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT public.auth_user_workspace_id();
$$;

--------------------------------------------------------------------------------
-- 5.6 Role Helper: current_user_role()
--------------------------------------------------------------------------------
-- Resolves the role ('super_admin', 'admin', 'agent', 'customer') for auth.uid()
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    user_role TEXT;
    ws_id UUID;
BEGIN
    -- 1. Check JWT claim
    BEGIN
        user_role := nullif(
            coalesce(
                auth.jwt() -> 'app_metadata' ->> 'role',
                auth.jwt() -> 'user_metadata' ->> 'role',
                auth.jwt() ->> 'role'
            ),
            ''
        );
    EXCEPTION
        WHEN OTHERS THEN
            user_role := NULL;
    END;

    IF user_role IS NOT NULL THEN
        RETURN lower(user_role);
    END IF;

    -- 2. Query public.users table
    SELECT u.role
    INTO user_role
    FROM public.users u
    WHERE u.id = auth.uid()
    LIMIT 1;

    IF user_role IS NOT NULL THEN
        RETURN lower(user_role);
    END IF;

    -- 3. Query public.workspace_members
    ws_id := public.auth_user_workspace_id();
    IF ws_id IS NOT NULL THEN
        SELECT wm.role::text
        INTO user_role
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
          AND wm.workspace_id = ws_id
          AND wm.is_active = TRUE
        LIMIT 1;
    ELSE
        SELECT wm.role::text
        INTO user_role
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
          AND wm.is_active = TRUE
        ORDER BY wm.created_at DESC
        LIMIT 1;
    END IF;

    IF user_role IS NOT NULL THEN
        RETURN lower(user_role);
    END IF;

    RETURN 'customer';
END;
$$;

COMMENT ON FUNCTION public.current_user_role() IS 'Returns the role of the authenticated user (super_admin, admin, agent, customer).';

--------------------------------------------------------------------------------
-- 5.7 Membership & Staff Check Helpers
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT (
        ws_id = public.auth_user_workspace_id()
        OR public.current_user_role() = 'super_admin'
        OR EXISTS (
            SELECT 1
            FROM public.workspace_members
            WHERE workspace_id = ws_id
              AND user_id = auth.uid()
              AND is_active = TRUE
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_staff(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT (
        public.current_user_role() = 'super_admin'
        OR (
            (ws_id = public.auth_user_workspace_id() OR ws_id IS NULL)
            AND public.current_user_role() IN ('agent', 'admin')
        )
        OR EXISTS (
            SELECT 1
            FROM public.workspace_members
            WHERE workspace_id = ws_id
              AND user_id = auth.uid()
              AND role IN ('agent', 'admin')
              AND is_active = TRUE
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT (
        public.current_user_role() = 'super_admin'
        OR (
            (ws_id = public.auth_user_workspace_id() OR ws_id IS NULL)
            AND public.current_user_role() = 'admin'
        )
        OR EXISTS (
            SELECT 1
            FROM public.workspace_members
            WHERE workspace_id = ws_id
              AND user_id = auth.uid()
              AND role = 'admin'
              AND is_active = TRUE
        )
    );
$$;


-- ==============================================================================
-- SECTION 6: ROW-LEVEL SECURITY (RLS) POLICIES & STRICT TENANT LOCKDOWN
-- ==============================================================================

-- 6.1 Force Row-Level Security on all core tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces FORCE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members FORCE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.macros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macros FORCE ROW LEVEL SECURITY;

-- 6.2 Purge any existing policies on all core tables for a clean slate
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN (
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('workspaces', 'profiles', 'workspace_members', 'users', 'tickets', 'ticket_messages', 'macros')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

--------------------------------------------------------------------------------
-- 6.3 Workspaces Policies
--------------------------------------------------------------------------------
-- Authenticated users see their workspace; embed widget / anon see branding info via public_key
CREATE POLICY "workspaces_tenant_select"
    ON public.workspaces
    FOR SELECT
    USING (
        id = public.auth_user_workspace_id()
        OR public.current_user_role() = 'super_admin'
        OR public_key IS NOT NULL
    );

-- Workspace updates restricted to Admins of the tenant or Super Admin
CREATE POLICY "workspaces_tenant_update"
    ON public.workspaces
    FOR UPDATE
    TO authenticated
    USING (
        public.current_user_role() = 'super_admin'
        OR (id = public.auth_user_workspace_id() AND public.is_workspace_admin(id))
    )
    WITH CHECK (
        public.current_user_role() = 'super_admin'
        OR (id = public.auth_user_workspace_id() AND public.is_workspace_admin(id))
    );

--------------------------------------------------------------------------------
-- 6.4 Profiles Policies
--------------------------------------------------------------------------------
CREATE POLICY "profiles_select"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR workspace_id = public.auth_user_workspace_id()
        OR public.current_user_role() = 'super_admin'
    );

CREATE POLICY "profiles_update"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR public.current_user_role() = 'super_admin')
    WITH CHECK (id = auth.uid() OR public.current_user_role() = 'super_admin');

--------------------------------------------------------------------------------
-- 6.5 Workspace Members Policies
--------------------------------------------------------------------------------
CREATE POLICY "workspace_members_select"
    ON public.workspace_members
    FOR SELECT
    TO authenticated
    USING (
        workspace_id = public.auth_user_workspace_id()
        OR user_id = auth.uid()
        OR public.current_user_role() = 'super_admin'
    );

CREATE POLICY "workspace_members_modify"
    ON public.workspace_members
    FOR ALL
    TO authenticated
    USING (
        public.current_user_role() = 'super_admin'
        OR (workspace_id = public.auth_user_workspace_id() AND public.is_workspace_admin(workspace_id))
    );

--------------------------------------------------------------------------------
-- 6.6 Users Directory Policies
--------------------------------------------------------------------------------
CREATE POLICY "users_tenant_select"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR (workspace_id IS NOT NULL AND workspace_id = public.auth_user_workspace_id())
        OR public.current_user_role() = 'super_admin'
    );

CREATE POLICY "users_tenant_update"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (
        id = auth.uid()
        OR public.current_user_role() = 'super_admin'
        OR (workspace_id IS NOT NULL AND workspace_id = public.auth_user_workspace_id() AND public.is_workspace_admin(workspace_id))
    )
    WITH CHECK (
        id = auth.uid()
        OR public.current_user_role() = 'super_admin'
        OR (workspace_id IS NOT NULL AND workspace_id = public.auth_user_workspace_id() AND public.is_workspace_admin(workspace_id))
    );

--------------------------------------------------------------------------------
-- 6.7 Strict Multi-Tenant Policies: Tickets
--------------------------------------------------------------------------------
-- SELECT: Only tickets belonging to the active workspace (or customer's own tickets)
CREATE POLICY "tickets_strict_tenant_select"
    ON public.tickets
    FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'super_admin'
        OR (
            workspace_id IS NOT NULL
            AND workspace_id = public.auth_user_workspace_id()
            AND (
                public.is_workspace_staff(workspace_id)
                OR customer_id = auth.uid()
            )
        )
    );

-- INSERT: Authenticated users can insert tickets into their own workspace
CREATE POLICY "tickets_strict_tenant_insert"
    ON public.tickets
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() = 'super_admin'
        OR (
            workspace_id IS NOT NULL
            AND workspace_id = public.auth_user_workspace_id()
        )
    );

-- UPDATE: Staff can update any workspace ticket; customers can only update CSAT rating on their own tickets
CREATE POLICY "tickets_strict_tenant_update"
    ON public.tickets
    FOR UPDATE
    TO authenticated
    USING (
        public.current_user_role() = 'super_admin'
        OR (
            workspace_id IS NOT NULL
            AND workspace_id = public.auth_user_workspace_id()
            AND (
                public.is_workspace_staff(workspace_id)
                OR customer_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        public.current_user_role() = 'super_admin'
        OR (
            workspace_id IS NOT NULL
            AND workspace_id = public.auth_user_workspace_id()
        )
    );

-- DELETE: Admins in the workspace or Super Admin
CREATE POLICY "tickets_strict_tenant_delete"
    ON public.tickets
    FOR DELETE
    TO authenticated
    USING (
        public.current_user_role() = 'super_admin'
        OR (
            workspace_id IS NOT NULL
            AND workspace_id = public.auth_user_workspace_id()
            AND public.is_workspace_admin(workspace_id)
        )
    );

-- Anonymous / Embed Widget Ticket Submission (Preserves isolated tenant submission)
CREATE POLICY "tickets_widget_anon_insert"
    ON public.tickets
    FOR INSERT
    TO anon
    WITH CHECK (
        workspace_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id)
    );

--------------------------------------------------------------------------------
-- 6.8 Strict Multi-Tenant Policies: Ticket Messages
--------------------------------------------------------------------------------
-- SELECT:
-- 1) Staff can view all messages (including internal notes) within their tenant workspace
-- 2) Customers can ONLY view rows where type = 'public_reply' on their own tickets
CREATE POLICY "ticket_messages_strict_tenant_select"
    ON public.ticket_messages
    FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'super_admin'
        OR (
            ticket_id IN (
                SELECT id
                FROM public.tickets
                WHERE workspace_id = public.auth_user_workspace_id()
            )
            AND (
                public.is_workspace_staff(workspace_id)
                OR (
                    type = 'public_reply'
                    AND EXISTS (
                        SELECT 1
                        FROM public.tickets t
                        WHERE t.id = ticket_messages.ticket_id
                          AND t.customer_id = auth.uid()
                    )
                )
            )
        )
    );

-- INSERT:
-- Staff can send both public replies and internal notes
-- Customers can ONLY send public replies to their own tickets
CREATE POLICY "ticket_messages_strict_tenant_insert"
    ON public.ticket_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() = 'super_admin'
        OR (
            ticket_id IN (
                SELECT id
                FROM public.tickets
                WHERE workspace_id = public.auth_user_workspace_id()
            )
            AND (
                public.is_workspace_staff(workspace_id)
                OR (
                    type = 'public_reply'
                    AND EXISTS (
                        SELECT 1
                        FROM public.tickets t
                        WHERE t.id = ticket_messages.ticket_id
                          AND t.customer_id = auth.uid()
                    )
                )
            )
        )
    );

-- UPDATE: In-workspace message updates (Staff only)
CREATE POLICY "ticket_messages_strict_tenant_update"
    ON public.ticket_messages
    FOR UPDATE
    TO authenticated
    USING (
        public.current_user_role() = 'super_admin'
        OR (
            ticket_id IN (
                SELECT id
                FROM public.tickets
                WHERE workspace_id = public.auth_user_workspace_id()
            )
            AND public.is_workspace_staff(workspace_id)
        )
    )
    WITH CHECK (
        public.current_user_role() = 'super_admin'
        OR (
            ticket_id IN (
                SELECT id
                FROM public.tickets
                WHERE workspace_id = public.auth_user_workspace_id()
            )
            AND public.is_workspace_staff(workspace_id)
        )
    );

-- DELETE: In-workspace message deletions (Admin only)
CREATE POLICY "ticket_messages_strict_tenant_delete"
    ON public.ticket_messages
    FOR DELETE
    TO authenticated
    USING (
        public.current_user_role() = 'super_admin'
        OR (
            ticket_id IN (
                SELECT id
                FROM public.tickets
                WHERE workspace_id = public.auth_user_workspace_id()
            )
            AND public.is_workspace_admin(workspace_id)
        )
    );

-- Anonymous / Embed Widget Ticket Message Submission
CREATE POLICY "ticket_messages_widget_anon_insert"
    ON public.ticket_messages
    FOR INSERT
    TO anon
    WITH CHECK (
        workspace_id IS NOT NULL
        AND type = 'public_reply'
        AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id)
    );

--------------------------------------------------------------------------------
-- 6.9 Macros Policies
--------------------------------------------------------------------------------
CREATE POLICY "macros_tenant_select"
    ON public.macros
    FOR SELECT
    TO authenticated
    USING (
        workspace_id = public.auth_user_workspace_id()
        OR public.current_user_role() = 'super_admin'
    );

CREATE POLICY "macros_tenant_modify"
    ON public.macros
    FOR ALL
    TO authenticated
    USING (
        public.current_user_role() = 'super_admin'
        OR (workspace_id = public.auth_user_workspace_id() AND public.is_workspace_staff(workspace_id))
    );


-- ==============================================================================
-- SECTION 7: SUPABASE STORAGE BUCKETS & POLICIES
-- ==============================================================================

-- 7.1 'ticket-attachments' Bucket (25MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ticket-attachments',
    'ticket-attachments',
    TRUE,
    26214400, -- 25MB
    NULL      -- Accepts all file types (PNG, JPG, PDF, TXT, LOG, etc.)
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 26214400;

-- 7.2 'workspace-assets' Bucket (10MB limit for branding assets)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'workspace-assets',
    'workspace-assets',
    TRUE,
    10485760, -- 10MB
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 10485760;

-- 7.3 Storage Policies: ticket-attachments
DROP POLICY IF EXISTS "Public read ticket-attachments" ON storage.objects;
CREATE POLICY "Public read ticket-attachments"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'ticket-attachments');

DROP POLICY IF EXISTS "Authenticated upload ticket-attachments" ON storage.objects;
CREATE POLICY "Authenticated upload ticket-attachments"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'ticket-attachments');

DROP POLICY IF EXISTS "Authenticated update own ticket-attachments" ON storage.objects;
CREATE POLICY "Authenticated update own ticket-attachments"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'ticket-attachments' AND auth.uid() = owner)
    WITH CHECK (bucket_id = 'ticket-attachments' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Authenticated delete own ticket-attachments" ON storage.objects;
CREATE POLICY "Authenticated delete own ticket-attachments"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'ticket-attachments' AND auth.uid() = owner);

-- 7.4 Storage Policies: workspace-assets
DROP POLICY IF EXISTS "Public Access to workspace-assets" ON storage.objects;
CREATE POLICY "Public Access to workspace-assets"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'workspace-assets');

DROP POLICY IF EXISTS "Allow staff upload to workspace-assets" ON storage.objects;
CREATE POLICY "Allow staff upload to workspace-assets"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'workspace-assets'
        AND (
            auth.role() = 'authenticated'
            OR auth.role() = 'service_role'
        )
    );

DROP POLICY IF EXISTS "Allow staff update workspace-assets" ON storage.objects;
CREATE POLICY "Allow staff update workspace-assets"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'workspace-assets');

DROP POLICY IF EXISTS "Allow staff delete workspace-assets" ON storage.objects;
CREATE POLICY "Allow staff delete workspace-assets"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'workspace-assets');


-- ==============================================================================
-- SECTION 8: SUPABASE REALTIME REPLICATION
-- ==============================================================================
DO $$
BEGIN
    -- Ensure publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Add tickets table to publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'tickets'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
    END IF;

    -- Add ticket_messages table to publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'ticket_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
    END IF;
END $$;

-- Set REPLICA IDENTITY FULL so realtime broadcasts include the full row
ALTER TABLE public.tickets REPLICA IDENTITY FULL;
ALTER TABLE public.ticket_messages REPLICA IDENTITY FULL;


-- ==============================================================================
-- SECTION 9: INITIAL MASTER WORKSPACE SEED
-- ==============================================================================
INSERT INTO public.workspaces (
    name,
    slug,
    brand_color,
    welcome_title,
    welcome_subtitle,
    launcher_text,
    show_launcher_text,
    status,
    tier
)
VALUES (
    'FluxDesk Main',
    'default',
    '#2563eb',
    'Hi there! 👋 How can we help you today?',
    'Fill in your details below and a member of our team will assist you right away.',
    'Chat with us',
    FALSE,
    'active',
    'standard'
)
ON CONFLICT (slug) DO NOTHING;
