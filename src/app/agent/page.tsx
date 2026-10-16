import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/app/actions/auth";
import { getAgentTickets } from "@/app/actions/tickets";
import { AgentDeskClient } from "@/components/desk/AgentDeskClient";
import { DeskHeader } from "@/components/desk/DeskHeader";
import { EmptyTicketsState } from "@/components/desk/EmptyTicketsState";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const currentUser = await getCurrentSessionUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role === "customer") {
    redirect("/portal");
  }

  const tickets = await getAgentTickets(currentUser.workspace_id);

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
