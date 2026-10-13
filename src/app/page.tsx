import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/app/actions/auth";
import { getAgentTickets } from "@/app/actions/tickets";
import { AgentDeskClient } from "@/components/desk/AgentDeskClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const currentUser = await getCurrentSessionUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role === "customer") {
    redirect("/portal");
  }

  const initialTickets = await getAgentTickets();
  return <AgentDeskClient initialTickets={initialTickets} currentUser={currentUser} />;
}
