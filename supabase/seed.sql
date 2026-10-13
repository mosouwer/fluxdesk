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
