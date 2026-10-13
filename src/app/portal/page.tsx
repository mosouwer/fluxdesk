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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Portal Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base block leading-tight">
                Acme Help Center
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Customer Support Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/80">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Signed in as <strong className="text-slate-900">{customerName}</strong></span>
            </div>

            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md transition-colors"
            >
              <span>Agent Desk</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            <form action={logoutUser} className="inline-flex">
              <button
                type="submit"
                title="Sign Out"
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1 bg-slate-100 hover:bg-rose-50 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
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
