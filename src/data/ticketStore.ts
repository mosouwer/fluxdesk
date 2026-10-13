import { Ticket } from "@/types/desk";
import { INITIAL_TICKETS } from "@/data/mockDeskData";

import { INITIAL_WORKSPACE } from "./workspaceStore";

declare global {
  // eslint-disable-next-line no-var
  var __FLUXDESK_RUNTIME_TICKETS__: Ticket[] | undefined;
}

const DEFAULT_SEEDED_TICKETS: Ticket[] = INITIAL_TICKETS.map((t) => ({
  ...t,
  workspaceId: t.workspaceId || INITIAL_WORKSPACE.id,
}));

if (!globalThis.__FLUXDESK_RUNTIME_TICKETS__) {
  globalThis.__FLUXDESK_RUNTIME_TICKETS__ = [...DEFAULT_SEEDED_TICKETS];
}

export function getSharedTickets(): Ticket[] {
  if (!globalThis.__FLUXDESK_RUNTIME_TICKETS__) {
    globalThis.__FLUXDESK_RUNTIME_TICKETS__ = [...DEFAULT_SEEDED_TICKETS];
  }
  return globalThis.__FLUXDESK_RUNTIME_TICKETS__;
}

export function addSharedTicket(ticket: Ticket): void {
  const tickets = getSharedTickets();
  // Prepend to list
  tickets.unshift(ticket);
}

export function updateSharedTicket(ticketId: string, updates: Partial<Ticket>): void {
  const tickets = getSharedTickets();
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index !== -1) {
    tickets[index] = { ...tickets[index], ...updates };
  }
}

export function updateSharedTicketsList(updater: (tickets: Ticket[]) => Ticket[]): void {
  if (!globalThis.__FLUXDESK_RUNTIME_TICKETS__) {
    globalThis.__FLUXDESK_RUNTIME_TICKETS__ = [...INITIAL_TICKETS];
  }
  globalThis.__FLUXDESK_RUNTIME_TICKETS__ = updater(globalThis.__FLUXDESK_RUNTIME_TICKETS__);
}
