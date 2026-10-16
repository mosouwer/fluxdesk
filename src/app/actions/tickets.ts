"use server";

import { revalidatePath } from "next/cache";
import { serverSupabase as supabase, createClient, isLiveSupabaseConfigured } from "@/utils/supabase/server";
import { adminClient, isAdminConfigured } from "@/utils/supabase/admin";
import { getCurrentSessionUser } from "@/app/actions/auth";
import { Ticket, TicketMessage, TicketStatus, TicketPriority, TicketChannel, MessageType } from "@/types/desk";
import { INITIAL_TICKETS, CURRENT_AGENT, CUSTOMER_EMILY } from "@/data/mockDeskData";
import {
  getSharedTickets,
  addSharedTicket,
  updateSharedTicketsList,
} from "@/data/ticketStore";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // In diagnostic scripts or CLI runs outside of Next.js HTTP context, revalidatePath throws an invariant
  }
}

/**
 * 1. Submit a new support ticket
 * Uploads optional attachment to 'ticket-attachments' Supabase Storage bucket,
 * resolves workspace_id, inserts into 'tickets', and creates initial message in 'ticket_messages'.
 */
export async function submitNewTicket(formData: FormData) {
  try {
    const subject = (formData.get("subject") as string) || "Support Request";
    const priority = ((formData.get("priority") as string) || "normal") as TicketPriority;
    const description = (formData.get("description") as string) || "";
    const customerName = (formData.get("name") as string) || "Customer";
    const customerEmail = ((formData.get("email") as string) || "customer@example.com").trim().toLowerCase();
    const customerPhone = ((formData.get("phone") as string) || "").trim() || "+1 (555) 000-0000";

    const rawFile = formData.get("file");
    const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;
    let attachmentSize: number = 0;

    // Gracefully handle file upload to 'ticket-attachments' only if file exists and has content
    if (file && file.size > 0 && typeof file.arrayBuffer === "function") {
      attachmentName = file.name;
      attachmentSize = file.size;
      const cleanFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

      try {
        const fileBuffer = await file.arrayBuffer();
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(cleanFileName, fileBuffer, {
            contentType: file.type || "application/octet-stream",
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from("ticket-attachments")
            .getPublicUrl(cleanFileName);
          attachmentUrl = urlData.publicUrl;
        }
      } catch (uploadErr) {
        console.warn("Storage bucket upload fallback:", uploadErr);
        attachmentUrl = `https://storage.acmecloud.io/ticket-attachments/${cleanFileName}`;
      }
    }

    // Determine target workspace (formData workspace_id or user session or active workspace)
    const formWorkspaceId = ((formData.get("workspace_id") as string) || (formData.get("workspaceId") as string) || "").trim();
    const sessionUser = await getCurrentSessionUser();
    const { getActiveWorkspace } = await import("@/data/workspaceStore");
    const activeWs = getActiveWorkspace();

    let workspaceId =
      (formWorkspaceId && UUID_REGEX.test(formWorkspaceId))
        ? formWorkspaceId
        : (sessionUser?.workspace_id && UUID_REGEX.test(sessionUser.workspace_id))
        ? sessionUser.workspace_id
        : activeWs.id;

    const db = isAdminConfigured ? adminClient : supabase;

    // Check if workspaceId is valid UUID; if not, query live workspaces
    if ((!workspaceId || !UUID_REGEX.test(workspaceId)) && (isAdminConfigured || isLiveSupabaseConfigured)) {
      try {
        const { data: wsData } = await db.from("workspaces").select("id").limit(1).maybeSingle();
        if (wsData?.id) {
          workspaceId = wsData.id;
        }
      } catch {
        // Fallback
      }
    }

    // Determine customer profile id safely (only UUID if exists in profiles)
    let customerId: string | null = null;
    if (isLiveSupabaseConfigured || isAdminConfigured) {
      try {
        const { data: profileData } = await db
          .from("profiles")
          .select("id")
          .eq("email", customerEmail)
          .maybeSingle();

        if (profileData?.id && UUID_REGEX.test(profileData.id)) {
          customerId = profileData.id;
        }
      } catch (profErr) {
        console.warn("Profile resolution fallback:", profErr);
      }
    }

    const attachmentsList = attachmentName
      ? [
          {
            filename: attachmentName,
            sizeBytes: attachmentSize,
            url: attachmentUrl || "#",
          },
        ]
      : [];

    let insertedTicket: any = null;

    // Database insertion into 'tickets'
    if (isLiveSupabaseConfigured || isAdminConfigured) {
      try {
        const { data: ticketData, error: ticketError } = await db
          .from("tickets")
          .insert({
            workspace_id: workspaceId,
            subject,
            description,
            status: "open",
            priority,
            channel: "web",
            customer_id: customerId,
            tags: ["web-portal"],
            metadata: {
              customer_name: customerName,
              customer_email: customerEmail,
              customer_phone: customerPhone,
            },
          })
          .select()
          .single();

        if (ticketError) {
          console.error("Database ticket insert error:", ticketError.message);
          return { success: false, error: ticketError.message };
        }

        if (ticketData) {
          insertedTicket = ticketData;

          // Create initial message in 'ticket_messages'
          await db.from("ticket_messages").insert({
            workspace_id: workspaceId,
            ticket_id: ticketData.id,
            sender_id: customerId,
            type: "public_reply",
            body: description,
            attachments: attachmentsList,
          });
        }
      } catch (dbErr: any) {
        console.error("Supabase database insert exception:", dbErr);
        return { success: false, error: dbErr?.message || "Failed to save ticket" };
      }
    }

    // Memory cache update for immediate local consistency
    const shared = getSharedTickets();
    const maxNumber = shared.length > 0 ? Math.max(...shared.map((t) => t.number || 0)) : 1000;
    const nextNumber = insertedTicket?.ticket_number || maxNumber + 1;

    const formattedNewTicket: Ticket = {
      id: insertedTicket?.id || `t-${Date.now()}`,
      number: insertedTicket?.ticket_number || nextNumber,
      subject,
      description,
      status: "open",
      priority,
      channel: "web",
      workspaceId: workspaceId,
      customer: {
        id: customerId || `cust-${Date.now()}`,
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(customerName)}`,
        role: "customer",
      },
      tags: ["web-portal"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slaDueMinutes: 120,
      messages: [
        {
          id: `m-init-${Date.now()}`,
          ticketId: insertedTicket?.id || `t-${Date.now()}`,
          sender: {
            id: customerId || `cust-${Date.now()}`,
            name: customerName,
            email: customerEmail,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(customerName)}`,
            role: "customer",
          },
          type: "public_reply",
          body: description,
          attachments: attachmentsList,
          createdAt: "Just now",
        },
      ],
    };

    addSharedTicket(formattedNewTicket);

    // Revalidate relevant Next.js routes
    safeRevalidatePath("/agent");
    safeRevalidatePath("/agent/tickets");
    safeRevalidatePath("/admin/dashboard");
    safeRevalidatePath("/portal");
    safeRevalidatePath("/");

    return { success: true, ticket: formattedNewTicket };
  } catch (error: any) {
    console.error("submitNewTicket error:", error);
    return { success: false, error: error.message || "Failed to submit ticket" };
  }
}

export interface CreateAgentTicketInput {
  subject: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  priority?: TicketPriority;
  channel?: TicketChannel;
  status?: TicketStatus;
  tags?: string[];
  workspaceId?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
}

/**
 * Create a new support ticket from the Agent Console.
 * Validates fields, resolves tenant workspace_id, inserts into Supabase
 * (with initial ticket message), and updates memory store for immediate UI updates.
 */
export async function createAgentTicket(input: CreateAgentTicketInput) {
  try {
    const {
      subject,
      description,
      customerName,
      customerEmail,
      customerPhone,
      priority = "normal",
      channel = "email",
      status = "open",
      tags = [],
      workspaceId,
      assignedAgentId,
      assignedAgentName,
    } = input;

    if (!subject?.trim()) {
      return { success: false, error: "Ticket subject is required." };
    }
    if (!description?.trim()) {
      return { success: false, error: "Ticket description is required." };
    }
    if (!customerEmail?.trim()) {
      return { success: false, error: "Customer email is required." };
    }
    const cleanCustomerName = customerName?.trim() || customerEmail.split("@")[0] || "Customer";

    const cleanCustomerEmail = customerEmail.trim().toLowerCase();

    // Resolve caller session & workspace ID
    const sessionUser = await getCurrentSessionUser();
    const { getActiveWorkspace } = await import("@/data/workspaceStore");
    const activeWs = getActiveWorkspace();

    let targetWorkspaceId =
      (workspaceId && UUID_REGEX.test(workspaceId))
        ? workspaceId
        : (sessionUser?.workspace_id && UUID_REGEX.test(sessionUser.workspace_id))
        ? sessionUser.workspace_id
        : activeWs.id;

    const db = isAdminConfigured ? adminClient : supabase;

    if ((!targetWorkspaceId || !UUID_REGEX.test(targetWorkspaceId)) && (isAdminConfigured || isLiveSupabaseConfigured)) {
      try {
        const { data: wsData } = await db.from("workspaces").select("id").limit(1).maybeSingle();
        if (wsData?.id) {
          targetWorkspaceId = wsData.id;
        }
      } catch {
        // Fallback
      }
    }

    let insertedTicket: any = null;
    let customerId: string | null = null;
    let agentId: string | null = null;

    if (isLiveSupabaseConfigured || isAdminConfigured) {
      try {
        // Check for customer profile by email (must exist in profiles with valid UUID)
        const { data: profileData } = await db
          .from("profiles")
          .select("id")
          .eq("email", cleanCustomerEmail)
          .maybeSingle();

        if (profileData?.id && UUID_REGEX.test(profileData.id)) {
          customerId = profileData.id;
        }

        // Validate agent ID
        const candidateAgentId = assignedAgentId || sessionUser?.id;
        if (candidateAgentId && UUID_REGEX.test(candidateAgentId)) {
          const { data: agentProf } = await db
            .from("profiles")
            .select("id")
            .eq("id", candidateAgentId)
            .maybeSingle();
          if (agentProf?.id) {
            agentId = agentProf.id;
          }
        }

        const { data: ticketData, error: ticketError } = await db
          .from("tickets")
          .insert({
            workspace_id: targetWorkspaceId,
            subject: subject.trim(),
            description: description.trim(),
            status,
            priority,
            channel,
            customer_id: customerId,
            assigned_agent_id: agentId,
            tags: tags.length > 0 ? tags : ["agent-created"],
            metadata: {
              customer_name: cleanCustomerName,
              customer_email: cleanCustomerEmail,
              customer_phone: customerPhone?.trim() || null,
              created_by: sessionUser?.email || "agent",
            },
          })
          .select()
          .single();

        if (ticketError) {
          console.error("Supabase ticket insert error:", ticketError);
          return { success: false, error: ticketError.message };
        }

        if (ticketData) {
          insertedTicket = ticketData;

          // Insert initial message in ticket_messages
          await db.from("ticket_messages").insert({
            workspace_id: targetWorkspaceId,
            ticket_id: ticketData.id,
            sender_id: agentId || customerId || null,
            type: "public_reply",
            body: description.trim(),
            attachments: [],
          });
        }
      } catch (dbErr: any) {
        console.error("Supabase ticket creation exception:", dbErr);
        return { success: false, error: dbErr?.message || "Failed to create ticket" };
      }
    }

    // In-memory store update for instant local consistency
    const shared = getSharedTickets();
    const maxNum = shared.length > 0 ? Math.max(...shared.map((t) => t.number || 0)) : 1000;
    const nextNumber = insertedTicket?.ticket_number || maxNum + 1;

    const formattedNewTicket: Ticket = {
      id: insertedTicket?.id || `t-${Date.now()}`,
      number: nextNumber,
      subject: subject.trim(),
      description: description.trim(),
      status: (status as TicketStatus) || "open",
      priority: (priority as TicketPriority) || "normal",
      channel: (channel as TicketChannel) || "email",
      workspaceId: targetWorkspaceId,
      customer: {
        id: customerId || `cust-${Date.now()}`,
        name: cleanCustomerName,
        email: customerEmail.trim(),
        phone: customerPhone?.trim(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanCustomerName)}`,
        role: "customer",
      },
      assignedAgent: assignedAgentId
        ? {
            id: assignedAgentId,
            name: assignedAgentName || "Assigned Agent",
            email: "",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            role: "agent",
          }
        : sessionUser
        ? {
            id: sessionUser.id,
            name: sessionUser.name || "Staff Agent",
            email: sessionUser.email || "",
            avatar: sessionUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            role: sessionUser.role || "agent",
          }
        : undefined,
      tags: tags.length > 0 ? tags : ["agent-created"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slaDueMinutes: priority === "urgent" ? 30 : priority === "high" ? 60 : 120,
      messages: [
        {
          id: `m-init-${Date.now()}`,
          ticketId: insertedTicket?.id || `t-${Date.now()}`,
          sender: {
            id: customerId || `cust-${Date.now()}`,
            name: cleanCustomerName,
            email: customerEmail.trim(),
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanCustomerName)}`,
            role: "customer",
          },
          type: "public_reply",
          body: description.trim(),
          attachments: [],
          createdAt: "Just now",
        },
      ],
    };

    addSharedTicket(formattedNewTicket);

    safeRevalidatePath("/agent");
    safeRevalidatePath("/agent/tickets");
    safeRevalidatePath("/admin/dashboard");
    safeRevalidatePath("/portal");
    safeRevalidatePath("/");

    return { success: true, ticket: formattedNewTicket };
  } catch (error: any) {
    console.error("createAgentTicket error:", error);
    return { success: false, error: error.message || "Failed to create ticket" };
  }
}

/**
 * 2. Add Message Reply / Internal Note
 * Inserts message into 'ticket_messages'.
 * If the ticket's 'first_responded_at' is null and an agent replies,
 * updates both 'first_responded_at' and 'updated_at'.
 */
export async function addMessageReply({
  ticketId,
  body,
  type,
  senderId = CURRENT_AGENT.id,
  senderRole = "agent",
}: {
  ticketId: string;
  body: string;
  type: MessageType;
  senderId?: string;
  senderRole?: "agent" | "admin" | "customer";
}) {
  try {
    if (!ticketId || !body.trim()) {
      return { success: false, error: "Missing ticketId or message body" };
    }

    const now = new Date().toISOString();

    // Query ticket from Supabase to check workspace and first_responded_at
    try {
      const { data: ticketRow } = await supabase
        .from("tickets")
        .select("id, workspace_id, first_responded_at")
        .eq("id", ticketId)
        .maybeSingle();

      const workspaceId = ticketRow?.workspace_id || "a0000000-0000-0000-0000-000000000001";

      // Insert message into 'ticket_messages'
      await supabase.from("ticket_messages").insert({
        workspace_id: workspaceId,
        ticket_id: ticketId,
        sender_id: senderId,
        type,
        body,
        attachments: [],
      });

      // If an agent replies and first_responded_at is null, update first_responded_at!
      if (senderRole !== "customer" && ticketRow && !ticketRow.first_responded_at) {
        await supabase
          .from("tickets")
          .update({
            first_responded_at: now,
            updated_at: now,
          })
          .eq("id", ticketId);
      } else {
        await supabase
          .from("tickets")
          .update({
            updated_at: now,
          })
          .eq("id", ticketId);
      }
    } catch (dbErr) {
      console.warn("Supabase reply insert fallback:", dbErr);
    }

    // Memory cache update for immediate local UI sync
    const newMessage: TicketMessage = {
      id: `m-${Date.now()}`,
      ticketId,
      sender: senderRole === "customer" ? CUSTOMER_EMILY : CURRENT_AGENT,
      type,
      body,
      createdAt: "Just now",
    };

    updateSharedTicketsList((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            updatedAt: now,
            messages: [...t.messages, newMessage],
          };
        }
        return t;
      })
    );

    safeRevalidatePath("/agent");
    safeRevalidatePath("/portal");
    safeRevalidatePath("/");

    return { success: true, message: newMessage };
  } catch (error: any) {
    console.error("addMessageReply error:", error);
    return { success: false, error: error.message || "Failed to add reply" };
  }
}

/**
 * 3. Update Ticket Metadata (Status, Priority, Assignee)
 */
export async function updateTicketStatus({
  ticketId,
  status,
  priority,
  assignedAgentId,
}: {
  ticketId: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedAgentId?: string | null;
}) {
  try {
    if (!ticketId) return { success: false, error: "Missing ticketId" };

    const now = new Date().toISOString();
    const updatePayload: any = { updated_at: now };

    if (status) {
      updatePayload.status = status;
      if (status === "solved") updatePayload.resolved_at = now;
      if (status === "closed") updatePayload.closed_at = now;
    }
    if (priority) updatePayload.priority = priority;
    if (assignedAgentId !== undefined) {
      updatePayload.assigned_agent_id = assignedAgentId;
    }

    try {
      await supabase.from("tickets").update(updatePayload).eq("id", ticketId);
    } catch (dbErr) {
      console.warn("Supabase updateTicketStatus fallback:", dbErr);
    }

    // Memory cache update
    updateSharedTicketsList((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            status: status || t.status,
            priority: priority || t.priority,
            assignedAgent:
              assignedAgentId !== undefined
                ? assignedAgentId
                  ? CURRENT_AGENT
                  : undefined
                : t.assignedAgent,
            updatedAt: now,
          };
        }
        return t;
      })
    );

    safeRevalidatePath("/agent");
    safeRevalidatePath("/portal");
    safeRevalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("updateTicketStatus error:", error);
    return { success: false, error: error.message || "Failed to update ticket" };
  }
}

/**
 * 4. Query: Fetch Tickets for Agent Desk
 * Fetches tickets with customer, agent, and messages scoped strictly to workspaceId.
 */
export async function getAgentTickets(workspaceId?: string): Promise<Ticket[]> {
  const sessionUser = await getCurrentSessionUser();
  const activeWorkspace = (await import("@/data/workspaceStore")).getActiveWorkspace();
  const targetWorkspaceId =
    (workspaceId && UUID_REGEX.test(workspaceId))
      ? workspaceId
      : (sessionUser?.workspace_id && UUID_REGEX.test(sessionUser.workspace_id))
      ? sessionUser.workspace_id
      : activeWorkspace.id;

  if (!isLiveSupabaseConfigured && !isAdminConfigured) {
    const allShared = getSharedTickets();
    // Only return tickets matching targetWorkspaceId
    return allShared.filter((t) => t.workspaceId === targetWorkspaceId);
  }

  try {
    const queryClient = isAdminConfigured ? adminClient : await createClient();
    let query = queryClient
      .from("tickets")
      .select(`
        *,
        customer:profiles!customer_id(*),
        assignedAgent:profiles!assigned_agent_id(*),
        messages:ticket_messages(
          *,
          sender:profiles!sender_id(*)
        )
      `);

    if (targetWorkspaceId && UUID_REGEX.test(targetWorkspaceId)) {
      query = query.eq("workspace_id", targetWorkspaceId);
    }

    const { data: dbTickets, error } = await query.order("created_at", { ascending: false });

    if (!error && dbTickets && dbTickets.length > 0) {
      // Map DB schema to Ticket interface
      return dbTickets.map((t: any) => ({
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

    return [];
  } catch (err) {
    console.warn("getAgentTickets Supabase fetch error:", err);
    return [];
  }
}

/**
 * 5. Query: Fetch Tickets for Customer Portal
 * STRICT ENFORCEMENT: Strips all internal_note messages so customer never sees them!
 */
export async function getCustomerTickets(email?: string): Promise<Ticket[]> {
  const targetEmail = email?.toLowerCase() || CUSTOMER_EMILY.email.toLowerCase();

  if (isLiveSupabaseConfigured) {
    try {
      const supabase = await createClient();
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
        .order("created_at", { ascending: false });

      if (!error && dbTickets && dbTickets.length > 0) {
        const filtered = dbTickets.filter(
          (t: any) => t.customer?.email?.toLowerCase() === targetEmail
        );

        return filtered.map((t: any) => ({
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
            email: t.customer?.email || targetEmail,
            avatar: t.customer?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetEmail}`,
            role: "customer",
          },
          tags: t.tags || [],
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          slaDueMinutes: 120,
          // STRICT PRIVACY: Internal notes completely stripped!
          messages: (t.messages || [])
            .filter((m: any) => m.type !== "internal_note")
            .map((m: any) => ({
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
        }));
      }
    } catch (err) {
      console.warn("getCustomerTickets Supabase fetch fallback:", err);
    }
  }

  // Filter shared tickets for target email, and sanitize internal_note messages
  return getSharedTickets()
    .filter((t) => t.customer.email.toLowerCase() === targetEmail)
    .map((t) => ({
      ...t,
      messages: t.messages.filter((m) => m.type !== "internal_note"),
    }));
}

/**
 * 6. Query: Fetch a single Ticket by ID for Ticket detail view
 */
export async function getTicketById(id: string): Promise<Ticket | null> {
  if (isLiveSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data: t, error } = await supabase
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
        .eq("id", id)
        .maybeSingle();

      if (!error && t) {
        return {
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
        };
      }
    } catch (err) {
      console.warn("getTicketById Supabase fetch fallback:", err);
    }
  }

  // Memory fallback
  const shared = getSharedTickets();
  return shared.find((t) => t.id === id) || shared[0] || null;
}

