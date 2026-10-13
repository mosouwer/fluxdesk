import { Ticket } from "@/types/desk";

/**
 * Universal search matcher for Agent Desk tickets.
 * Supports searching by:
 * 1. Ticket number (e.g. "101", "#101", "ticket 101", "ticket #101")
 * 2. Case owner / Assignee (by name, email, or "unassigned")
 * 3. Customer (by name, phone number formatted/unformatted, email, company)
 * 4. Subject, description, tags, and message content
 */
export function matchesTicketSearch(ticket: Ticket, rawQuery: string): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;

  const query = rawQuery.trim().toLowerCase();
  const digitsOnlyQuery = query.replace(/\D/g, "");

  // 1. Ticket Number check
  const ticketNumStr = ticket.number.toString();
  const formattedTicketNum = `#${ticketNumStr}`;

  if (
    ticketNumStr.includes(query) ||
    formattedTicketNum.includes(query) ||
    `ticket ${ticketNumStr}`.includes(query) ||
    `ticket #${ticketNumStr}`.includes(query)
  ) {
    return true;
  }

  // If query is digits only (or stripped from '#101' / 'ticket 101'), check exact/partial ticket number
  if (digitsOnlyQuery && (ticketNumStr === digitsOnlyQuery || ticketNumStr.includes(digitsOnlyQuery))) {
    return true;
  }

  // Ticket ID match
  if (ticket.id && ticket.id.toLowerCase().includes(query)) {
    return true;
  }

  // 2. Case Owner / Assignee check
  if (ticket.assignedAgent) {
    if (
      (ticket.assignedAgent.name && ticket.assignedAgent.name.toLowerCase().includes(query)) ||
      (ticket.assignedAgent.email && ticket.assignedAgent.email.toLowerCase().includes(query))
    ) {
      return true;
    }
  } else {
    // If ticket has no assignee and user searches "unassigned"
    if ("unassigned".includes(query)) {
      return true;
    }
  }

  // 3. Customer check (By Name, Phone Number, Email, Company)
  if (ticket.customer) {
    // Customer Name
    if (ticket.customer.name && ticket.customer.name.toLowerCase().includes(query)) {
      return true;
    }

    // Customer Phone Number
    if (ticket.customer.phone) {
      const rawPhone = ticket.customer.phone.toLowerCase();
      // Literal match (e.g., "(555)", "+1", "392-8819")
      if (rawPhone.includes(query)) {
        return true;
      }

      // Digits-only match (e.g., "5553928819", "3928819", "555")
      const phoneDigits = ticket.customer.phone.replace(/\D/g, "");
      if (digitsOnlyQuery && phoneDigits.length >= 2 && phoneDigits.includes(digitsOnlyQuery)) {
        return true;
      }
    }

    // Customer Email
    if (ticket.customer.email && ticket.customer.email.toLowerCase().includes(query)) {
      return true;
    }

    // Customer Company
    if (ticket.customer.company && ticket.customer.company.toLowerCase().includes(query)) {
      return true;
    }
  }

  // 4. Subject, Description, Tags
  if (ticket.subject && ticket.subject.toLowerCase().includes(query)) {
    return true;
  }

  if (ticket.description && ticket.description.toLowerCase().includes(query)) {
    return true;
  }

  if (ticket.tags && ticket.tags.some((tag) => tag.toLowerCase().includes(query))) {
    return true;
  }

  // 5. Messages (public replies & notes)
  if (
    ticket.messages &&
    ticket.messages.some((m) => m.body && m.body.toLowerCase().includes(query))
  ) {
    return true;
  }

  return false;
}
