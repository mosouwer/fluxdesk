import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/app/actions/auth";
import { createClient, isLiveSupabaseConfigured } from "@/utils/supabase/server";
import { AgentDeskClient } from "@/components/desk/AgentDeskClient";
import { DeskHeader } from "@/components/desk/DeskHeader";
import { EmptyTicketsState } from "@/components/desk/EmptyTicketsState";
import { Ticket } from "@/types/desk";
import { getActiveWorkspace } from "@/data/workspaceStore";
import { getSharedTickets } from "@/data/ticketStore";

export const dynamic = "force-dynamic";

export default async function AgentTicketsPage() {
  const currentUser = await getCurrentSessionUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role === "customer") {
    redirect("/portal");
  }

  const supabase = await createClient();
  let tickets: Ticket[] = [];

  if (isLiveSupabaseConfigured) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        // 1. First, fetch the current authenticated user's profile
        const { data: profile } = await supabase
          .from("users")
          .select("workspace_id, role")
          .eq("id", user.id)
          .single();

        if (profile?.workspace_id) {
          // 2. Ensure all ticket queries include .eq('workspace_id', profile.workspace_id)
          const { data: dbTickets, error } = await supabase
            .from("tickets")
            .select(`
              *,
              customer:profiles!customer_id(*),
              assignedAgent:profiles!assigned_agent_id(*),
              messages:ticket_messages(
                *,
                sender:profiles!sender_id(*)
              )
            `)
            .eq("workspace_id", profile.workspace_id)
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
                name: t.customer?.full_name || "Customer",
                email: t.customer?.email || "customer@example.com",
                phone: t.customer?.phone || t.metadata?.phone,
                avatar: t.customer?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.customer_id}`,
                role: "customer",
              },
              assignedAgent: t.assignedAgent
                ? {
                    id: t.assignedAgent.id,
                    name: t.assignedAgent.full_name,
                    email: t.assignedAgent.email,
                    avatar: t.assignedAgent.avatar_url,
                    role: "agent",
                  }
                : undefined,
              tags: t.tags || [],
              createdAt: t.created_at,
              updatedAt: t.updated_at,
              slaDueMinutes: 90,
              messages: (t.messages || []).map((m: any) => ({
                id: m.id,
                ticketId: m.ticket_id,
                sender: {
                  id: m.sender?.id || m.sender_id,
                  name: m.sender?.full_name || "Staff",
                  email: m.sender?.email || "staff@acmesupport.com",
                  avatar: m.sender?.avatar_url || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
                  role: m.sender?.id === t.customer_id ? "customer" : "agent",
                },
                type: m.type,
                body: m.body,
                attachments: m.attachments || [],
                createdAt: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              })),
              workspaceId: t.workspace_id,
            }));
          }
        }
      }
    } catch (err) {
      console.warn("AgentTicketsPage ticket query exception:", err);
    }
  } else {
    // Local runtime store scoped strictly to active workspace
    const activeWs = getActiveWorkspace();
    const allShared = getSharedTickets();
    tickets = allShared.filter((t) => t.workspaceId === activeWs.id);
  }

  // Empty state when a brand has zero tickets (never falls back to placeholder arrays)
  if (tickets.length === 0) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans">
        <DeskHeader currentUser={currentUser} />
        <main className="flex-1 overflow-y-auto p-6 md:p-10 flex items-center justify-center">
          <EmptyTicketsState className="max-w-lg w-full" />
        </main>
      </div>
    );
  }

  return <AgentDeskClient initialTickets={tickets} currentUser={currentUser} />;
}
