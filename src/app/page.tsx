import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/app/actions/auth";
import { getAgentTickets } from "@/app/actions/tickets";
import { getTeamMembers } from "@/app/actions/team";
import { AgentDeskClient } from "@/components/desk/AgentDeskClient";
import { User } from "@/types/desk";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const currentUser = await getCurrentSessionUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role === "customer") {
    redirect("/portal");
  }

  const [initialTickets, teamMembers] = await Promise.all([
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

  return (
    <AgentDeskClient
      initialTickets={initialTickets}
      currentUser={currentUser}
      availableAgents={availableAgents}
    />
  );
}
