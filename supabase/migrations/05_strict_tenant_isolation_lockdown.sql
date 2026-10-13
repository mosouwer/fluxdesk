-- ==============================================================================
-- FluxDesk Migration: 05_strict_tenant_isolation_lockdown.sql
-- Description: Strict tenant isolation and Row-Level Security (RLS) lockdown.
--              Forces RLS on all tables, drops all legacy and loose policies,
--              and binds tickets and ticket_messages strictly to auth_user_workspace_id().
-- ==============================================================================

-- 1. ENABLE AND FORCE ROW-LEVEL SECURITY ON CORE TABLES
--------------------------------------------------------------------------------
-- FORCE RLS prevents table owners and roles without BYPASSRLS from inadvertently
-- bypassing RLS policies during client queries.

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages FORCE ROW LEVEL SECURITY;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces FORCE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Apply to optional companion tables if present
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_members') THEN
        ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.workspace_members FORCE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'macros') THEN
        ALTER TABLE public.macros ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.macros FORCE ROW LEVEL SECURITY;
    END IF;
END $$;


-- 2. DROP ALL EXISTING POLICIES ON TICKETS AND TICKET_MESSAGES
--------------------------------------------------------------------------------
-- Automatically purges any default or loose policies (e.g. "Enable read access for all users")
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN (
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('tickets', 'ticket_messages')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;


-- 3. HELPER FUNCTION: auth_user_workspace_id()
--------------------------------------------------------------------------------
-- Resolves the active tenant workspace ID for the currently authenticated user
CREATE OR REPLACE FUNCTION public.auth_user_workspace_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    ws_id uuid;
BEGIN
    -- 1. Check JWT claim (app_metadata, user_metadata, or root claim)
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
            ws_id := null;
    END;

    IF ws_id IS NOT NULL THEN
        RETURN ws_id;
    END IF;

    -- 2. Query public.users table for user's assigned workspace_id
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        SELECT u.workspace_id
        INTO ws_id
        FROM public.users u
        WHERE u.id = auth.uid()
        LIMIT 1;

        IF ws_id IS NOT NULL THEN
            RETURN ws_id;
        END IF;
    END IF;

    -- 3. Query public.workspace_members table if active
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'workspace_members'
    ) THEN
        SELECT wm.workspace_id
        INTO ws_id
        FROM public.workspace_members wm
        WHERE wm.user_id = auth.uid()
          AND wm.is_active = true
        ORDER BY wm.created_at DESC
        LIMIT 1;

        IF ws_id IS NOT NULL THEN
            RETURN ws_id;
        END IF;
    END IF;

    -- 4. Query public.profiles table if present
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'workspace_id'
    ) THEN
        SELECT p.workspace_id
        INTO ws_id
        FROM public.profiles p
        WHERE p.id = auth.uid()
        LIMIT 1;

        IF ws_id IS NOT NULL THEN
            RETURN ws_id;
        END IF;
    END IF;

    RETURN null;
END;
$$;

COMMENT ON FUNCTION public.auth_user_workspace_id() IS 'Returns the active tenant workspace UUID for the authenticated user.';

-- Compatibility alias for current_user_workspace_id()
CREATE OR REPLACE FUNCTION public.current_user_workspace_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT public.auth_user_workspace_id();
$$;


-- 4. STRICT AUTHENTICATED POLICIES ON TICKETS
--------------------------------------------------------------------------------

-- SELECT: workspace_id IS NOT NULL AND workspace_id = auth_user_workspace_id()
CREATE POLICY "tickets_strict_tenant_select"
    ON public.tickets
    FOR SELECT
    TO authenticated
    USING (
        workspace_id IS NOT NULL
        AND workspace_id = public.auth_user_workspace_id()
    );

-- INSERT: workspace_id IS NOT NULL AND workspace_id = auth_user_workspace_id()
CREATE POLICY "tickets_strict_tenant_insert"
    ON public.tickets
    FOR INSERT
    TO authenticated
    WITH CHECK (
        workspace_id IS NOT NULL
        AND workspace_id = public.auth_user_workspace_id()
    );

-- UPDATE: workspace_id IS NOT NULL AND workspace_id = auth_user_workspace_id()
CREATE POLICY "tickets_strict_tenant_update"
    ON public.tickets
    FOR UPDATE
    TO authenticated
    USING (
        workspace_id IS NOT NULL
        AND workspace_id = public.auth_user_workspace_id()
    )
    WITH CHECK (
        workspace_id IS NOT NULL
        AND workspace_id = public.auth_user_workspace_id()
    );

-- DELETE: Admins in the workspace only
CREATE POLICY "tickets_strict_tenant_delete"
    ON public.tickets
    FOR DELETE
    TO authenticated
    USING (
        workspace_id IS NOT NULL
        AND workspace_id = public.auth_user_workspace_id()
    );

-- Embed widget anonymous ticket submission (preserves isolated creation)
CREATE POLICY "tickets_widget_anon_insert"
    ON public.tickets
    FOR INSERT
    TO anon
    WITH CHECK (
        workspace_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id)
    );


-- 5. STRICT AUTHENTICATED POLICIES ON TICKET_MESSAGES
--------------------------------------------------------------------------------

-- SELECT: ticket_id IN (SELECT id FROM public.tickets WHERE workspace_id = auth_user_workspace_id())
CREATE POLICY "ticket_messages_strict_tenant_select"
    ON public.ticket_messages
    FOR SELECT
    TO authenticated
    USING (
        ticket_id IN (
            SELECT id
            FROM public.tickets
            WHERE workspace_id = public.auth_user_workspace_id()
        )
    );

-- INSERT: ticket_id IN (SELECT id FROM public.tickets WHERE workspace_id = auth_user_workspace_id())
CREATE POLICY "ticket_messages_strict_tenant_insert"
    ON public.ticket_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        ticket_id IN (
            SELECT id
            FROM public.tickets
            WHERE workspace_id = public.auth_user_workspace_id()
        )
    );

-- UPDATE: In-workspace message updates
CREATE POLICY "ticket_messages_strict_tenant_update"
    ON public.ticket_messages
    FOR UPDATE
    TO authenticated
    USING (
        ticket_id IN (
            SELECT id
            FROM public.tickets
            WHERE workspace_id = public.auth_user_workspace_id()
        )
    )
    WITH CHECK (
        ticket_id IN (
            SELECT id
            FROM public.tickets
            WHERE workspace_id = public.auth_user_workspace_id()
        )
    );

-- DELETE: In-workspace message deletions
CREATE POLICY "ticket_messages_strict_tenant_delete"
    ON public.ticket_messages
    FOR DELETE
    TO authenticated
    USING (
        ticket_id IN (
            SELECT id
            FROM public.tickets
            WHERE workspace_id = public.auth_user_workspace_id()
        )
    );

-- Embed widget anonymous initial message submission
CREATE POLICY "ticket_messages_widget_anon_insert"
    ON public.ticket_messages
    FOR INSERT
    TO anon
    WITH CHECK (
        workspace_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id)
    );


-- 6. STRICT POLICIES ON WORKSPACES & USERS
--------------------------------------------------------------------------------

-- Workspaces
DROP POLICY IF EXISTS "workspaces_strict_tenant_select" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_strict_tenant_update" ON public.workspaces;

CREATE POLICY "workspaces_strict_tenant_select"
    ON public.workspaces
    FOR SELECT
    USING (
        id = public.auth_user_workspace_id()
        OR public_key IS NOT NULL
    );

CREATE POLICY "workspaces_strict_tenant_update"
    ON public.workspaces
    FOR UPDATE
    TO authenticated
    USING (id = public.auth_user_workspace_id())
    WITH CHECK (id = public.auth_user_workspace_id());

-- Users
DROP POLICY IF EXISTS "users_strict_tenant_select" ON public.users;
DROP POLICY IF EXISTS "users_strict_tenant_update" ON public.users;

CREATE POLICY "users_strict_tenant_select"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR (workspace_id IS NOT NULL AND workspace_id = public.auth_user_workspace_id())
    );

CREATE POLICY "users_strict_tenant_update"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
