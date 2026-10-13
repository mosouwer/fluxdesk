-- ==============================================================================
-- FluxDesk: Automated / Manual RLS Security Test Script
-- Run this in Supabase SQL Editor or psql to verify multi-tenant isolation
-- and internal note concealment from customers.
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- TEST 1: Customer View (Emily Watson - u0000000-0000-0000-0000-000000000004)
-- Expectation:
--   - Can see her own tickets (Ticket #1001 and #1003)
--   - CANNOT see Ticket #1002 (Marcus's ticket) or Ticket #2001 (Nexus tenant)
--   - CANNOT see any message with type = 'internal_note'
-- ------------------------------------------------------------------------------

-- Set session context to simulate customer Emily
set local role authenticated;
set local "request.jwt.claim.sub" = 'u0000000-0000-0000-0000-000000000004';
set local "request.jwt.claim.role" = 'authenticated';

-- 1.1 Verify customer only sees her own tickets
select
    ticket_number,
    subject,
    status
from public.tickets;
-- Expected output: Tickets 1001 and 1003 only. (Ticket 1002, 1004, 2001 must NOT appear)

-- 1.2 Verify customer cannot see internal notes on Ticket 1001
select
    id,
    type,
    body,
    created_at
from public.ticket_messages
where ticket_id = 't0000000-0000-0000-0000-000000000001';
-- Expected output: Only public_reply messages (m0000...001, m0000...003, m0000...004).
-- The confidential internal note (m0000...002 & m0000...005) MUST NOT BE RETURNED!

-- 1.3 Verify customer cannot query macros
select count(*) as macro_count_for_customer from public.macros;
-- Expected output: 0 rows

-- ------------------------------------------------------------------------------
-- TEST 2: Agent View (Sarah Connor - u0000000-0000-0000-0000-000000000002)
-- Expectation:
--   - Can see all tickets in Acme Cloud workspace
--   - CANNOT see tickets in Nexus Health workspace (Tenant isolation)
--   - CAN see BOTH 'public_reply' AND 'internal_note'
--   - Can see and use macros
-- ------------------------------------------------------------------------------

-- Set session context to simulate agent Sarah
set local "request.jwt.claim.sub" = 'u0000000-0000-0000-0000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';

-- 2.1 Verify agent sees all tickets in Acme workspace
select
    ticket_number,
    subject,
    customer_id
from public.tickets;
-- Expected output: Tickets 1001, 1002, 1003, 1004. (Ticket 2001 from Nexus must NOT appear)

-- 2.2 Verify agent sees internal notes on Ticket 1001
select
    id,
    type,
    left(body, 50) as preview
from public.ticket_messages
where ticket_id = 't0000000-0000-0000-0000-000000000001';
-- Expected output: All messages including internal notes!

-- 2.3 Verify agent sees macros
select
    title,
    is_active
from public.macros;
-- Expected output: All 4 Acme workspace macros.

rollback;
