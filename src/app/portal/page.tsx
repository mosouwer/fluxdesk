import React from "react";
import Link from "next/link";
import { createClient, isLiveSupabaseConfigured } from "@/utils/supabase/server";
import { getCustomerTickets } from "@/app/actions/tickets";
import { CustomerTicketsList } from "@/components/portal/CustomerTicketsList";
import { CUSTOMER_EMILY } from "@/data/mockDeskData";
import { Ticket } from "@/types/desk";
import { logoutUser } from "@/app/actions/auth";
import { getActiveWorkspace } from "@/data/workspaceStore";
import { LifeBuoy, ExternalLink, ShieldCheck, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerPortalPage() {
  let customerId = CUSTOMER_EMILY.id;
  let customerEmail = CUSTOMER_EMILY.email;
  let customerName = CUSTOMER_EMILY.name;
  const activeWorkspace = getActiveWorkspace();

  let portalBrandName = activeWorkspace.name;
  let tickets: Ticket[] = [];

  if (isLiveSupabaseConfigured) {
    const supabase = await createClient();
    // 1. Resolve logged-in customer ID (auth.uid() or fallback to seed customer)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        customerId = user.id;
        customerEmail = user.email || customerEmail;
        customerName =
          user.user_metadata?.full_name ||
          customerEmail.split("@")[0] ||
          customerName;

        let wsId = user.user_metadata?.workspace_id;
        if (!wsId) {
          const { data: userProfile } = await supabase
            .from("users")
            .select("workspace_id")
            .eq("id", user.id)
            .maybeSingle();
          if (userProfile?.workspace_id) {
            wsId = userProfile.workspace_id;
          }
        }
        if (wsId) {
          const { data: wsData } = await supabase
            .from("workspaces")
            .select("name")
            .eq("id", wsId)
            .maybeSingle();
          if (wsData?.name) {
            portalBrandName = wsData.name;
          }
        }
      }
    } catch {
      // Continue with default seed customer
    }

    // 2. Query all tickets where customer_id = auth.uid()
    try {
      const { data: dbTickets, error } = await supabase
        .from("tickets")
        .select(`
          *,
          customer:profiles!customer_id(*),
          messages:ticket_messages(
            *,
            sender:profiles!sender_id(*)
          )
        `)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

    if (!error && dbTickets && dbTickets.length > 0) {
      tickets = dbTickets.map((t: any) => ({
        id: t.id,
        number: t.ticket_number,
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        channel: t.channel,
        customer: {
          id: t.customer?.id || t.customer_id,
          name: t.customer?.full_name || customerName,
          email: t.customer?.email || customerEmail,
          avatar:
            t.customer?.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${customerEmail}`,
          role: "customer",
        },
        tags: t.tags || [],
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        slaDueMinutes: 120,
        // STRICT CUSTOMER ISOLATION: Internal notes are stripped from customer views
        messages: (t.messages || [])
          .filter((m: any) => m.type !== "internal_note")
          .map((m: any) => ({
            id: m.id,
            ticketId: m.ticket_id,
            sender: {
              id: m.sender?.id || m.sender_id,
              name: m.sender?.full_name || "Staff",
              email: m.sender?.email || "staff@acmesupport.com",
              avatar:
                m.sender?.avatar_url ||
                "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
              role: m.sender?.id === t.customer_id ? "customer" : "agent",
            },
            type: m.type,
            body: m.body,
            attachments: m.attachments || [],
            createdAt: new Date(m.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })),
        }));
      } else {
        // Fallback query via getCustomerTickets action
        tickets = await getCustomerTickets(customerEmail);
      }
    } catch (err) {
      console.warn("Portal fetch fallback:", err);
      tickets = await getCustomerTickets(customerEmail);
    }
  } else {
    tickets = await getCustomerTickets(customerEmail);
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 flex flex-col font-sans text-zinc-900">
      {/* Portal Top Bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-zinc-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-2xs">
              <LifeBuoy className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-zinc-900 tracking-tight text-sm block leading-tight">
                {portalBrandName}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium">
                Customer Support Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-100/80 px-2.5 py-1 rounded-md border border-zinc-200/80">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Signed in as <strong className="text-zinc-900 font-medium">{customerName}</strong></span>
            </div>

            <Link
              href="/"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200/70 px-2.5 py-1 rounded-md transition-colors duration-100"
            >
              <span>Agent Desk</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            <form action={logoutUser} className="inline-flex">
              <button
                type="submit"
                title="Sign Out"
                className="text-xs font-medium text-zinc-500 hover:text-rose-600 flex items-center gap-1 bg-zinc-100 hover:bg-rose-50 px-2.5 py-1 rounded-md transition-colors duration-100 cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                <span>Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Portal View */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        <CustomerTicketsList
          initialTickets={tickets}
          customerEmail={customerEmail}
          customerName={customerName}
          customerPhone={CUSTOMER_EMILY.phone}
          workspaceId={activeWorkspace.id}
        />
      </main>
    </div>
  );
}
