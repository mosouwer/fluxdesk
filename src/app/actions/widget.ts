"use server";

import { revalidatePath } from "next/cache";
import { serverSupabase as supabase, isLiveSupabaseConfigured } from "@/utils/supabase/server";
import { getWorkspaceByPublicKey, getActiveWorkspace, Workspace } from "@/data/workspaceStore";
import { addSharedTicket, getSharedTickets } from "@/data/ticketStore";
import { Ticket, TicketPriority } from "@/types/desk";

export interface SubmitWidgetTicketInput {
  publicKey: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

/**
 * 1. Lookup workspace by public_key
 */
export async function getWorkspaceByPublicKeyAction(publicKey: string): Promise<Workspace | null> {
  const cleanKey = (publicKey || "").trim();
  if (!cleanKey) return null;

  if (isLiveSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .select(
          "id, name, slug, brand_color, public_key, welcome_title, welcome_subtitle, logo_url, launcher_icon_url, launcher_text, show_launcher_text, created_at"
        )
        .or(`public_key.eq.${cleanKey},slug.eq.${cleanKey},id.eq.${cleanKey}`)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          name: data.name,
          slug: data.slug,
          publicKey: data.public_key,
          brandColor: data.brand_color || "#2563eb",
          welcomeTitle: data.welcome_title || "Hi there! 👋 How can we help you today?",
          welcomeSubtitle:
            data.welcome_subtitle ||
            "Fill in your details below and a member of our team will assist you right away.",
          logoUrl: data.logo_url || "",
          launcherIconUrl: data.launcher_icon_url || "",
          launcherText: data.launcher_text || "Chat with us",
          showLauncherText: Boolean(data.show_launcher_text),
          createdAt: data.created_at,
        };
      }
    } catch (err) {
      console.warn("Supabase lookup for workspace by public_key failed, using store fallback:", err);
    }
  }

  // Memory fallback lookup
  const local = getWorkspaceByPublicKey(cleanKey);
  if (local) return local;

  // If no match found, fallback to active workspace for demo convenience
  return getActiveWorkspace();
}

/**
 * 2. Submit ticket with workspace_id = workspace.id and creates initial message in ticket_messages
 */
export async function submitWidgetTicket({
  publicKey,
  name,
  email,
  phone = "",
  subject = "",
  message,
}: SubmitWidgetTicketInput) {
  try {
    const cleanName = (name || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPhone = (phone || "").trim();
    const cleanMessage = (message || "").trim();
    const cleanSubject = (subject || "").trim() || "Widget Inquiry: " + cleanMessage.slice(0, 45);

    if (!cleanName) {
      return { success: false, error: "Please enter your name." };
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "Please enter a valid email address." };
    }
    if (!cleanMessage) {
      return { success: false, error: "Please enter your question or message." };
    }

    // 1. Resolve workspace
    const workspace = await getWorkspaceByPublicKeyAction(publicKey);
    if (!workspace) {
      return { success: false, error: "Target workspace not found for provided key." };
    }

    const workspaceId = workspace.id;
    let customerId = `u-${Date.now()}`;
    let insertedTicketData: any = null;

    if (isLiveSupabaseConfigured) {
      // 2. Resolve / Create customer profile
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (profile?.id) {
          customerId = profile.id;
        } else {
          const { data: newProfile } = await supabase
            .from("profiles")
            .insert({
              email: cleanEmail,
              full_name: cleanName,
              workspace_id: workspaceId,
            })
            .select("id")
            .maybeSingle();

          if (newProfile?.id) {
            customerId = newProfile.id;
          }
        }
      } catch {
        // Fallback customerId
      }

      // 3. Insert into 'tickets' with workspace_id = workspace.id
      try {
        const { data: ticketData, error: ticketError } = await supabase
          .from("tickets")
          .insert({
            workspace_id: workspaceId,
            subject: cleanSubject,
            description: cleanMessage,
            status: "open",
            priority: "normal" as TicketPriority,
            channel: "widget",
            customer_id: customerId,
            tags: ["widget", "live-embed"],
            metadata: {
              source: "embedded_widget",
              publicKey: workspace.publicKey,
              customerPhone: cleanPhone,
            },
          })
          .select()
          .single();

        if (!ticketError && ticketData) {
          insertedTicketData = ticketData;

          // 4. Create initial message in 'ticket_messages'
          await supabase.from("ticket_messages").insert({
            workspace_id: workspaceId,
            ticket_id: ticketData.id,
            sender_id: customerId,
            type: "public_reply",
            body: cleanMessage,
            attachments: [],
          });
        }
      } catch (dbErr) {
        console.warn("Supabase ticket insertion error:", dbErr);
      }
    }

    // 5. Memory store fallback for instant reactivity in local dev & Agent Desk
    const shared = getSharedTickets();
    const nextNumber = Math.max(...shared.map((t) => t.number), 1005) + 1;
    const ticketId = insertedTicketData?.id || `t-w-${Date.now()}`;
    const ticketNumber = insertedTicketData?.ticket_number || nextNumber;

    const newTicket: Ticket = {
      id: ticketId,
      number: ticketNumber,
      subject: cleanSubject,
      description: cleanMessage,
      status: "open",
      priority: "normal",
      channel: "web",
      customer: {
        id: customerId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone || "+1 (555) 019-2834",
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
        role: "customer",
      },
      tags: ["widget", "live-embed"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slaDueMinutes: 120,
      messages: [
        {
          id: `m-init-${Date.now()}`,
          ticketId: ticketId,
          sender: {
            id: customerId,
            name: cleanName,
            email: cleanEmail,
            role: "customer",
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
          },
          type: "public_reply",
          body: cleanMessage,
          createdAt: "Just now",
        },
      ],
    };

    addSharedTicket(newTicket);

    try {
      revalidatePath("/");
      revalidatePath("/agent");
      revalidatePath("/admin/dashboard");
      revalidatePath("/portal");
    } catch {
      // Invariant when called outside request context
    }

    return {
      success: true,
      ticket: {
        id: newTicket.id,
        number: newTicket.number,
        subject: newTicket.subject,
      },
      workspaceName: workspace.name,
    };
  } catch (err: any) {
    console.error("submitWidgetTicket error:", err);
    return {
      success: false,
      error: err?.message || "Failed to submit ticket.",
    };
  }
}
