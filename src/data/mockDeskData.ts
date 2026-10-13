import { User, Ticket, Macro } from "@/types/desk";

export const CURRENT_AGENT: User = {
  id: "u0000000-0000-0000-0000-000000000002",
  name: "Sarah Connor",
  email: "sarah.agent@acmesupport.com",
  avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
  role: "agent",
};

export const AVAILABLE_AGENTS: User[] = [
  CURRENT_AGENT,
  {
    id: "u0000000-0000-0000-0000-000000000003",
    name: "David Kim",
    email: "david.agent@acmesupport.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    role: "agent",
  },
  {
    id: "u0000000-0000-0000-0000-000000000001",
    name: "Alex Vance",
    email: "alex.admin@acmesupport.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    role: "admin",
  },
];

export const CUSTOMER_EMILY: User = {
  id: "u0000000-0000-0000-0000-000000000004",
  name: "Emily Watson",
  email: "emily.watson@enterprise-client.com",
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  role: "customer",
  company: "Apex Global Cloud Systems",
  timezone: "America/New_York (EST)",
  phone: "+1 (555) 392-8819",
  lifetimeTickets: 14,
  openTickets: 2,
  tier: "Enterprise VIP",
};

export const CUSTOMER_MARCUS: User = {
  id: "u0000000-0000-0000-0000-000000000005",
  name: "Marcus Brody",
  email: "marcus.brody@fintech-corp.com",
  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  role: "customer",
  company: "Fintech Dynamics Ltd",
  timezone: "Europe/London (BST)",
  phone: "+44 20 7946 0912",
  lifetimeTickets: 6,
  openTickets: 1,
  tier: "Pro",
};

export const CUSTOMER_LIAM: User = {
  id: "u0000000-0000-0000-0000-000000000008",
  name: "Liam O'Connor",
  email: "liam@biotech-labs.io",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  role: "customer",
  company: "BioTech Precision Labs",
  timezone: "America/Chicago (CST)",
  phone: "+1 (312) 555-0199",
  lifetimeTickets: 3,
  openTickets: 1,
  tier: "Standard",
};

export const INITIAL_TICKETS: Ticket[] = [
  {
    id: "t0000000-0000-0000-0000-000000000001",
    number: 1001,
    subject: "Critical: Unable to provision SSD storage volume in us-east-1",
    description: "Our deployment pipeline failed this morning with HTTP 500 when requesting a 500GB gp3 volume in us-east-1b.",
    status: "open",
    priority: "urgent",
    channel: "web",
    customer: CUSTOMER_EMILY,
    assignedAgent: CURRENT_AGENT,
    tags: ["infrastructure", "storage", "us-east-1", "production-blocker"],
    createdAt: "2025-10-11T16:20:00Z",
    updatedAt: "2025-10-11T19:45:00Z",
    slaDueMinutes: -15, // Breached SLA!
    messages: [
      {
        id: "m0000000-0000-0000-0000-000000000001",
        ticketId: "t0000000-0000-0000-0000-000000000001",
        sender: CUSTOMER_EMILY,
        type: "public_reply",
        body: "Hello Support Team,\n\nOur deployment pipeline failed this morning with HTTP 500 when requesting a 500GB gp3 volume in `us-east-1b`. We are completely blocked from deploying our release candidate 4.12.\n\nCould you please check if there is an active incident on the availability zone?",
        attachments: [
          {
            filename: "terraform_provision_err.log",
            sizeBytes: 14208,
            url: "#",
          },
        ],
        createdAt: "Today at 9:15 AM",
      },
      {
        id: "m0000000-0000-0000-0000-000000000002",
        ticketId: "t0000000-0000-0000-0000-000000000001",
        sender: CURRENT_AGENT,
        type: "internal_note",
        body: "🔒 **INTERNAL DIAGNOSTICS - DO NOT SHARE EXTERNALLY**\n\nInvestigated AWS CloudWatch alarms on cell `iad-cell-4`. The EBS volume controller throttled the tenant pool because their automated CI token triggered 45 concurrent API requests inside 3 seconds.\n\nI pinged @devops-oncall on Slack. Node pool rebalancing is in progress.",
        createdAt: "Today at 9:32 AM",
      },
      {
        id: "m0000000-0000-0000-0000-000000000003",
        ticketId: "t0000000-0000-0000-0000-000000000001",
        sender: CURRENT_AGENT,
        type: "public_reply",
        body: "Hi Emily,\n\nThank you for reaching out. We identified transient resource contention specifically in the `us-east-1b` availability zone. Our cloud operations team is actively expanding the allocated capacity pool.\n\nIn the meantime, you can provision successfully without interruption by pointing your terraform provider to `us-east-1a` or `us-east-1c`. We will monitor this thread and notify you as soon as 1b is 100% operational.",
        createdAt: "Today at 9:48 AM",
      },
      {
        id: "m0000000-0000-0000-0000-000000000004",
        ticketId: "t0000000-0000-0000-0000-000000000001",
        sender: CUSTOMER_EMILY,
        type: "public_reply",
        body: "Thanks Sarah! Switching the AZ target in our manifest to `us-east-1a` unblocked our staging run. Please keep this ticket open until `us-east-1b` is verified healthy so we can revert back safely.",
        createdAt: "Today at 10:15 AM",
      },
      {
        id: "m0000000-0000-0000-0000-000000000005",
        ticketId: "t0000000-0000-0000-0000-000000000001",
        sender: AVAILABLE_AGENTS[2], // Alex Vance
        type: "internal_note",
        body: "🔒 Capacity rebalancing on `iad-cell-4` has completed successfully. Synthetic canary tests are green. Sarah, feel free to run a test volume creation and let the customer know.",
        createdAt: "Today at 10:45 AM",
      },
    ],
  },
  {
    id: "t0000000-0000-0000-0000-000000000002",
    number: 1002,
    subject: "Billing inquiry: Duplicate charge on invoice #INV-2025-089",
    description: "Our corporate card was billed twice for $2,450 on October 1st. Please issue a refund.",
    status: "pending",
    priority: "high",
    channel: "email",
    customer: CUSTOMER_MARCUS,
    assignedAgent: AVAILABLE_AGENTS[1], // David Kim
    tags: ["billing", "invoice", "refund", "finance"],
    createdAt: "2025-10-10T14:00:00Z",
    updatedAt: "2025-10-11T12:00:00Z",
    slaDueMinutes: 85,
    messages: [
      {
        id: "m0000000-0000-0000-0000-000000000006",
        ticketId: "t0000000-0000-0000-0000-000000000002",
        sender: CUSTOMER_MARCUS,
        type: "public_reply",
        body: "Hi team, our finance team noticed a duplicate deduction of $2,450 on October 1st. Can you check and credit this?",
        createdAt: "Yesterday at 2:00 PM",
      },
      {
        id: "m0000000-0000-0000-0000-000000000007",
        ticketId: "t0000000-0000-0000-0000-000000000002",
        sender: AVAILABLE_AGENTS[1],
        type: "internal_note",
        body: "🔒 Confirmed Stripe idempotency retry bug. Refund issued via Stripe dashboard (ref: `re_3O8q29`). Pending customer response on credit memo.",
        createdAt: "Yesterday at 4:30 PM",
      },
    ],
  },
  {
    id: "t0000000-0000-0000-0000-000000000003",
    number: 1003,
    subject: "Feature Request: SAML 2.0 SSO Integration with Okta",
    description: "We are scaling our team to 150 engineers and require central identity provider enforcement through Okta.",
    status: "on_hold",
    priority: "normal",
    channel: "web",
    customer: CUSTOMER_EMILY,
    assignedAgent: CURRENT_AGENT,
    tags: ["roadmap", "enterprise", "sso", "okta"],
    createdAt: "2025-10-08T11:00:00Z",
    updatedAt: "2025-10-10T15:20:00Z",
    slaDueMinutes: 240,
    messages: [
      {
        id: "m0000000-0000-0000-0000-000000000008",
        ticketId: "t0000000-0000-0000-0000-000000000003",
        sender: CUSTOMER_EMILY,
        type: "public_reply",
        body: "When will Okta SAML SSO be available for enterprise accounts? Our CISO requires it before next audit.",
        createdAt: "3 days ago",
      },
    ],
  },
  {
    id: "t0000000-0000-0000-0000-000000000004",
    number: 1004,
    subject: "New signups hitting 429 Too Many Requests on Webhooks API",
    description: "Incoming webhook endpoint returns HTTP 429 when processing batch customer imports.",
    status: "open",
    priority: "high",
    channel: "api",
    customer: CUSTOMER_LIAM,
    assignedAgent: undefined, // Unassigned!
    tags: ["api", "webhooks", "rate-limit", "unassigned"],
    createdAt: "2025-10-11T18:10:00Z",
    updatedAt: "2025-10-11T18:10:00Z",
    slaDueMinutes: 45,
    messages: [
      {
        id: "m0000000-0000-0000-0000-000000000009",
        ticketId: "t0000000-0000-0000-0000-000000000004",
        sender: CUSTOMER_LIAM,
        type: "public_reply",
        body: "We are getting rate limited with 429 errors when sending batch webhook requests over 50 req/sec. Is there an endpoint concurrency limit for our account tier?",
        createdAt: "2 hours ago",
      },
    ],
  },
  {
    id: "t0000000-0000-0000-0000-000000000005",
    number: 1005,
    subject: "Session timeout resets active dashboard filters",
    description: "When re-authenticating after 30 minutes of inactivity, custom dashboard date filters reset to Default 7 Days.",
    status: "solved",
    priority: "low",
    channel: "chat",
    customer: CUSTOMER_MARCUS,
    assignedAgent: CURRENT_AGENT,
    tags: ["ui", "sessions", "resolved"],
    createdAt: "2025-10-06T09:00:00Z",
    updatedAt: "2025-10-09T17:00:00Z",
    slaDueMinutes: 1200,
    csatRating: 5,
    csatFeedback: "Filter state wasn't persisting across session refresh. Thanks for deploying patch v2.8.1, all fixed!",
    ratedAt: "2025-10-09T17:15:00Z",
    messages: [
      {
        id: "m0000000-0000-0000-0000-000000000010",
        ticketId: "t0000000-0000-0000-0000-000000000005",
        sender: CUSTOMER_MARCUS,
        type: "public_reply",
        body: "Filter state wasn't persisting across session refresh. Thanks for deploying patch v2.8.1, all fixed!",
        createdAt: "Oct 9 at 4:30 PM",
      },
    ],
  },
  {
    id: "t0000000-0000-0000-0000-000000000006",
    number: 1006,
    subject: "Security Audit: SOC2 Type II Report and Penetration Test Attestation",
    description: "Requesting copy of the latest external penetration test and SOC2 compliance package for vendor review.",
    status: "closed",
    priority: "normal",
    channel: "email",
    customer: CUSTOMER_EMILY,
    assignedAgent: AVAILABLE_AGENTS[2], // Alex Vance
    tags: ["compliance", "soc2", "security", "audit"],
    createdAt: "2025-09-28T10:00:00Z",
    updatedAt: "2025-10-02T14:00:00Z",
    slaDueMinutes: 2400,
    csatRating: 5,
    csatFeedback: "Prompt compliance package delivery. Very helpful security audit team.",
    ratedAt: "2025-10-02T14:30:00Z",
    messages: [
      {
        id: "m0000000-0000-0000-0000-000000000011",
        ticketId: "t0000000-0000-0000-0000-000000000006",
        sender: CUSTOMER_EMILY,
        type: "public_reply",
        body: "Could you share the latest executive summary of the external penetration test?",
        createdAt: "Sep 28 at 10:00 AM",
      },
    ],
  },
];

export const DESK_MACROS: Macro[] = [
  {
    id: "macro-1",
    title: "Troubleshooting: Clear Cache & Hard Refresh",
    description: "Sends step-by-step browser cache clearing instructions and sets status to Pending.",
    category: "Troubleshooting",
    actions: [
      {
        action: "add_comment",
        type: "public_reply",
        body: "Could you please try clearing your browser cookies and local storage cache, or attempt to reproduce this in an Incognito/Private browsing window? Often stale service workers cause client-side rendering anomalies.\n\nLet us know if the issue persists after clearing!",
      },
      {
        action: "set_status",
        value: "pending",
      },
      {
        action: "add_tags",
        value: ["cache-cleared", "awaiting-user"],
      },
    ],
  },
  {
    id: "macro-2",
    title: "Billing: Refund Processed Notice",
    description: "Confirms refund issuance and marks ticket as solved.",
    category: "Billing",
    actions: [
      {
        action: "add_comment",
        type: "public_reply",
        body: "We have reviewed your billing transaction and issued a full refund to your original payment method. Depending on your financial institution, this credit will reflect on your statement within 3 to 5 business days.",
      },
      {
        action: "add_comment",
        type: "internal_note",
        body: "🔒 Refund verified in payment gateway. Sent standard refund notice macro to customer.",
      },
      {
        action: "set_status",
        value: "solved",
      },
      {
        action: "add_tags",
        value: ["refund-completed", "billing-resolved"],
      },
    ],
  },
  {
    id: "macro-3",
    title: "Escalate to Tier 3 Platform Engineering",
    description: "Logs an internal diagnostic note and transitions ticket to On-Hold with Urgent priority.",
    category: "Escalation",
    actions: [
      {
        action: "add_comment",
        type: "internal_note",
        body: "🔒 **TIER 3 ESCALATION**\nIncident forwarded to Platform Engineering team. PagerDuty on-call alerted. Holding ticket awaiting root cause patch.",
      },
      {
        action: "set_status",
        value: "on_hold",
      },
      {
        action: "set_priority",
        value: "urgent",
      },
      {
        action: "add_tags",
        value: ["tier3-escalated", "sre-review"],
      },
    ],
  },
  {
    id: "macro-4",
    title: "General: Close Inactive Ticket",
    description: "Sends polite follow-up notice and closes ticket.",
    category: "General",
    actions: [
      {
        action: "add_comment",
        type: "public_reply",
        body: "Since we haven't heard back from you in several days, we are marking this ticket as resolved. If you still need assistance, simply reply directly to this message to automatically reopen it.",
      },
      {
        action: "set_status",
        value: "solved",
      },
      {
        action: "add_tags",
        value: ["auto-closed", "inactive"],
      },
    ],
  },
  {
    id: "macro-5",
    title: "Security: SAML 2.0 Okta SSO Setup Guide",
    description: "Provides documentation link and steps for enterprise Okta setup.",
    category: "General",
    actions: [
      {
        action: "add_comment",
        type: "public_reply",
        body: "You can configure Okta SAML 2.0 SSO by navigating to **Organization Settings > Security > Single Sign-On**.\n\n1. Download our SAML SP Metadata XML from your dashboard\n2. Add the ACS URL and Entity ID into your Okta admin portal\n3. Paste your Okta Identity Provider Issuer and x509 Certificate\n\nDetailed walkthrough: https://docs.fluxdesk.io/security/okta-sso",
      },
      {
        action: "set_status",
        value: "open",
      },
    ],
  },
];
