import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/app/actions/auth";
import { getAgentTickets } from "@/app/actions/tickets";
import { getTeamMembers } from "@/app/actions/team";
import { AgentDeskClient } from "@/components/desk/AgentDeskClient";
import { DeskHeader } from "@/components/desk/DeskHeader";
import { EmptyTicketsState } from "@/components/desk/EmptyTicketsState";
import { User } from "@/types/desk";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const currentUser = await getCurrentSessionUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role === "customer") {
    redirect("/portal");
  }

  const [tickets, teamMembers] = await Promise.all([
    getAgentTickets(currentUser.workspace_id),
    getTeamMembers(currentUser.workspace_id),
  ]);

  const availableAgents: User[] = teamMembers.map((m) => ({
    id: m.id,
    name: m.fullName,
    email: m.email,
    avatar: m.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.email}`,
    role: m.role,
    workspaceId: m.workspaceId,
    workspace_id: m.workspaceId,
    isActive: m.isActive,
  }));

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-50/50 font-sans">
        <DeskHeader currentUser={currentUser} brandName={currentUser.workspaceName || currentUser.company} />
        <main className="flex-1 overflow-y-auto p-6 md:p-10 flex items-center justify-center">
          <EmptyTicketsState className="max-w-lg w-full" />
        </main>
      </div>
    );
  }

  return (
    <AgentDeskClient
      initialTickets={tickets}
      currentUser={currentUser}
      availableAgents={availableAgents}
    />
  );
}
