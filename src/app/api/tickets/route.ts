import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Ticket } from "@/types/desk";
import {
  getSharedTickets,
  addSharedTicket,
} from "@/data/ticketStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const allTickets = getSharedTickets();

  if (email) {
    const customerTickets = allTickets.filter(
      (t) => t.customer.email.toLowerCase() === email.toLowerCase()
    );
    // Sanitize: Strip any internal_note messages before sending to customer!
    const sanitized = customerTickets.map((t) => ({
      ...t,
      messages: t.messages.filter((m) => m.type !== "internal_note"),
    }));
    return NextResponse.json({ tickets: sanitized });
  }

  return NextResponse.json({ tickets: allTickets });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, description, priority, attachmentName, attachmentSize } = body;

    if (!name || !email || !phone || !phone.trim() || !subject || !description) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, phone, subject, description" },
        { status: 400 }
      );
    }

    const allTickets = getSharedTickets();
    const nextNumber =
      Math.max(...allTickets.map((t) => t.number), 1005) + 1;

    const newTicket: Ticket = {
      id: `t-cust-${Date.now()}`,
      number: nextNumber,
      subject,
      description,
      status: "open",
      priority: priority || "normal",
      channel: "web",
      customer: {
        id: `u-cust-${Date.now()}`,
        name,
        email,
        phone: phone.trim(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        role: "customer",
      },
      tags: ["web-portal", "incoming"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slaDueMinutes: 120,
      messages: [
        {
          id: `m-cust-${Date.now()}`,
          ticketId: `t-cust-${Date.now()}`,
          sender: {
            id: `u-cust-${Date.now()}`,
            name,
            email,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
            role: "customer",
          },
          type: "public_reply",
          body: description,
          attachments: attachmentName
            ? [
                {
                  filename: attachmentName,
                  sizeBytes: attachmentSize || 20480,
                  url: "#",
                },
              ]
            : [],
          createdAt: "Just now",
        },
      ],
    };

    addSharedTicket(newTicket);

    try {
      revalidatePath("/agent");
      revalidatePath("/");
      revalidatePath("/portal");
    } catch {
      // safe fallback
    }

    return NextResponse.json(
      {
        success: true,
        ticket: newTicket,
        message: `Ticket #${newTicket.number} created successfully.`,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
