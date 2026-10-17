# mellowDesk - Multi-Tenant Helpdesk (Zendesk Clone) Database Engine

This repository contains the complete production-ready Supabase PostgreSQL schema, Row-Level Security (RLS) policies, triggers, and sample seed data for a multi-tenant helpdesk and ticketing platform.

---

## 📁 Repository Structure

```
mellowDesk/
├── public/
│   └── widget.js                               # Embeddable floating web widget script
├── src/
│   ├── app/
│   │   ├── actions/
│   │   │   └── tickets.ts                      # Next.js Server Actions (submit, reply, status)
│   │   ├── agent/
│   │   │   ├── page.tsx                        # Server Component for Agent Desk
│   │   │   └── tickets/
│   │   │       └── [id]/
│   │   │           └── page.tsx                # Ticket detail route wired with Realtime
│   │   ├── portal/
│   │   │   └── page.tsx                        # Server Component for Customer Portal
│   │   ├── widget-demo/
│   │   │   └── page.tsx                        # External website simulation with embedded widget
│   │   ├── api/
│   │   │   └── tickets/
│   │   │       └── route.ts                    # REST API for public & widget ticket submissions
│   │   ├── globals.css                         # Tailwind CSS & Zendesk color variables
│   │   ├── layout.tsx                          # Root layout
│   │   └── page.tsx                            # Root Server Component
│   ├── components/
│   │   ├── agent/
│   │   │   ├── TicketChatWithRealtime.tsx      # Realtime conversation thread & presence alert banner
│   │   │   └── TicketDetailClient.tsx          # Ticket detail client manager
│   │   ├── desk/
│   │   │   ├── AgentDeskClient.tsx             # Interactive agent desk state & real-time sync
│   │   │   ├── AgentCollisionBanner.tsx        # Visual warning banner when peer agent is drafting
│   │   │   ├── DeskHeader.tsx                  # Workspace bar, global search, agent profile
│   │   │   ├── LeftColumn.tsx                  # Filtered views & ticket list
│   │   │   ├── CenterColumn.tsx                # Thread, yellow internal notes & live presence
│   │   │   ├── RightColumn.tsx                 # Customer metadata & ticket controls
│   │   │   └── MacroPopup.tsx                  # Slash command / macro palette modal
│   │   ├── portal/
│   │   │   ├── SubmitTicketForm.tsx            # Form calling submitNewTicket with file upload & loading state
│   │   │   └── CustomerTicketsList.tsx         # Clean tickets list & thread with internal note masking
│   │   └── ui/                                 # Accessible shadcn-style UI primitives
│   ├── hooks/
│   │   └── useTicketRealtime.ts                # Realtime Presence & Postgres Changes hook
│   ├── lib/
│   │   └── supabaseClient.ts                   # Supabase client initialization
│   ├── data/
│   │   └── mockDeskData.ts                     # Pre-populated tickets, threads, agents & macros
│   └── types/
│       ├── desk.ts                             # TypeScript interfaces & enums
│       └── realtime.ts                         # Presence and typing event contracts
├── supabase/
│   ├── migrations/
│   │   └── 20250101000000_helpdesk_schema.sql  # Complete schema, triggers, and RLS policies
│   ├── seed.sql                                # Realistic seed data
│   ├── tests/
│   │   └── rls_verification.sql                # SQL tests for customer vs agent RLS
│   └── full_setup.sql                          # Single combined script for Supabase Dashboard
└── README.md
```

---

## 🌐 Customer Support Portal (`/portal`) & Embeddable Web Widget (`/widget.js`)

### 1. Customer Support Portal (`/portal`)
- **Public Request Form**: Clean submission form with Name, Work Email, Category, Priority, Subject, Description, and File Attachment upload.
- **Customer Self-Service View**: Customers can track their open tickets, view public thread updates from agents, and submit public follow-up replies with file attachments.
- **Strict Customer Isolation**:
  - **Zero Internal Notes**: Customers can **never** see internal notes. All messages with `type: 'internal_note'` are filtered out on both the server and client.
  - **Read-Only Status**: Customers cannot change ticket status to solved or closed.

### 2. Embeddable Floating Web Widget (`public/widget.js`)
A lightweight, dependency-free JavaScript snippet that can be dropped into any external website via a single tag:

```html
<!-- Embed into any external website (replace with your production URL or NEXT_PUBLIC_APP_URL) -->
<script
  src="https://your-domain.com/widget.js"
  data-workspace-key="pk_live_your_workspace_key"
  async
></script>
```

- Injects a floating launcher bubble in the bottom-right corner.
- Opens an isolated modal with a ticket submission form and file attachment support.
- Submits directly to `/api/tickets` and returns an instant ticket confirmation number.
- Try the interactive demo at **`/widget-demo`**.

The ticket detail page leverages Supabase Realtime for zero-reload live updates and agent collision detection:

### 1. Postgres Changes (Zero-Reload Live Updates)
- Subscribes to `INSERT` on `public.ticket_messages` filtered by `ticket_id=eq.{id}`.
- New replies appear instantly at the bottom of the conversation thread without page reload.
- Subscribes to `UPDATE` on `public.tickets` to synchronize status, priority, and assignee changes in real-time.

### 2. Presence Tracking (`ticket-room-{ticketId}`)
- Broadcasts when an agent opens a ticket (`status: "viewing"`).
- Header renders avatar stacks of all agents actively inspecting the ticket.
- Automatically untracks on component unmount or ticket switch.

### 3. Agent Collision Warning Banner
- Detects when another agent starts drafting (`status: "typing"`).
- Displays an animated warning banner in the center pane:
  > **⚠️ Collision Warning: Agent [Name] is currently drafting a reply**
- Distinguishes whether the teammate is preparing a **Public Reply** or an **Internal Note**.
- Built-in simulation bar in the header allows testing peer agent collision without requiring multiple windows.

1. **`workspaces` (Tenants)**
   - Isolated organizations with slug, custom domain, and custom JSONB configuration (SLA settings, business hours, support email).

2. **`profiles` (Users)**
   - Synced automatically with Supabase `auth.users` via database triggers. Stores user identities, names, and avatars.

3. **`workspace_members` (Tenant Roles)**
   - Defines a user's role within each workspace:
     - `admin`: Full administrative control over tickets, team members, workspace settings, and macros.
     - `agent`: Can triage, assign, update tickets, post public replies, post internal notes, and use macros.
     - `customer`: End-user requesting support. Can submit tickets and reply publicly.

4. **`tickets`**
   - Scoped to `workspace_id` with sequential ticket numbers generated per-tenant (`#1001`, `#1002`, ...).
   - Fields: `subject`, `description`, `status` (`open`, `pending`, `on_hold`, `solved`, `closed`), `priority` (`low`, `normal`, `high`, `urgent`), `channel` (`web`, `email`, `chat`, `api`), tags, and JSONB metadata.

5. **`ticket_messages` (Threaded Conversations)**
   - Distinguishes between:
     - `public_reply`: Visible to both customers and support staff.
     - `internal_note`: Strictly restricted to agents and admins. **Hidden from customers by RLS.**

6. **`macros` (Zendesk Canned Responses & Actions)**
   - Pre-configured actions with JSONB payloads (e.g., automated status updates, adding tags, inserting templated public replies or internal notes). Accessible only to staff.

---

## 🔒 Row-Level Security (RLS) Policy Matrix

All tables have RLS enabled with security definer functions to prevent recursive checks:

| Table | Operation | Customer Permission | Agent / Admin Permission |
| :--- | :--- | :--- | :--- |
| **`workspaces`** | `SELECT` | Only if member of workspace | Only if member of workspace |
| **`workspaces`** | `UPDATE / DELETE` | ❌ Denied | Admins only |
| **`tickets`** | `SELECT` | **Only own tickets** (`customer_id = auth.uid()`) | All tickets in their workspace |
| **`tickets`** | `INSERT` | Can create tickets for themselves | Can create tickets for any customer in workspace |
| **`tickets`** | `UPDATE` | Can update own tickets | Full update rights in workspace |
| **`ticket_messages`** | `SELECT` | **`public_reply` only on own tickets** | All messages (`public_reply` + `internal_note`) |
| **`ticket_messages`** | `INSERT` | **`public_reply` only on own tickets** | Both `public_reply` and `internal_note` |
| **`macros`** | `SELECT` | ❌ Denied (0 rows returned) | All active macros in workspace |
| **`macros`** | `INSERT / UPDATE`| ❌ Denied | Staff / Admins |

---

## 🚀 How to Run

### Option 1: Using Supabase CLI (Recommended for Local Dev)

If you have the Supabase CLI installed:

```bash
# Start local Supabase container
supabase start

# Apply migrations and automatically run seed.sql
supabase db reset
```

### Option 2: Using the Supabase Cloud Dashboard

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard) and open your project.
2. Go to the **SQL Editor** tab.
3. Open or copy the contents of `supabase/full_setup.sql`.
4. Click **Run**. All tables, constraints, security functions, RLS policies, and sample data will be created instantly.

---

## 🧪 Verifying Row-Level Security

You can verify that customers cannot see other tickets or internal notes by running `supabase/tests/rls_verification.sql` in the Supabase SQL editor:

```sql
-- 1. Test Customer Perspective (Emily Watson)
set local role authenticated;
set local "request.jwt.claim.sub" = 'u0000000-0000-0000-0000-000000000004';
set local "request.jwt.claim.role" = 'authenticated';

-- Customer only sees her own tickets (#1001, #1003)
select ticket_number, subject from public.tickets;

-- Customer only sees public replies on ticket #1001 (internal notes are completely concealed)
select type, body from public.ticket_messages where ticket_id = 't0000000-0000-0000-0000-000000000001';

-- Customer cannot access macros
select count(*) from public.macros; -- Returns 0
```
