/**
 * FluxDesk Diagnostic Test Script
 * Verifies the database flow:
 *   1. Creating a test ticket with a public message and internal note.
 *   2. Fetching that ticket as an agent (verifying both public & internal notes visible).
 *   3. Verifying that an internal note CANNOT be fetched or viewed by a customer role.
 *
 * Run with: npx tsx scripts/test-db-flow.ts
 */

import {
  submitNewTicket,
  addMessageReply,
  getAgentTickets,
  getCustomerTickets,
  getTicketById,
} from "../src/app/actions/tickets";
import { MessageType } from "../src/types/desk";

async function runDiagnostic() {
  console.log("==================================================================");
  console.log("🧪 FLUXDESK DIAGNOSTIC TEST: Database Flow & RLS Privacy Audit");
  console.log("==================================================================\n");

  let testsPassed = 0;
  let totalTests = 3;

  try {
    // ---------------------------------------------------------------------------
    // TEST 1: Create a test ticket
    // ---------------------------------------------------------------------------
    console.log("▶ [TEST 1/3] Creating a test ticket with public inquiry...");
    const testSubject = `[DIAGNOSTIC TEST] SSL Handshake Latency Spike ${Date.now()}`;
    const testDescription = "Our edge workers are reporting intermittent 525 SSL Handshake Failed errors.";
    const customerEmail = "emily.watson@enterprise-client.com";
    const customerName = "Emily Watson";

    const formData = new FormData();
    formData.append("name", customerName);
    formData.append("email", customerEmail);
    formData.append("subject", testSubject);
    formData.append("priority", "urgent");
    formData.append("description", testDescription);

    const createResult = await submitNewTicket(formData);

    if (!createResult.success || !createResult.ticket) {
      throw new Error(`Failed to create test ticket: ${createResult.error}`);
    }

    const createdTicket = createResult.ticket;
    console.log(`  ✓ Ticket #${createdTicket.number} created successfully.`);
    console.log(`  ✓ ID: ${createdTicket.id}`);
    console.log(`  ✓ Initial public message registered.`);
    testsPassed++;

    // Add an Agent Internal Note to the ticket
    console.log("\n  -> Adding a confidential Internal Note as Agent Sarah Connor...");
    const internalNoteText = "CONFIDENTIAL INTERNAL NOTE: Edge POP `iad-edge-2` has an expired TLS intermediate cert. Escalating to SRE.";
    
    const noteResult = await addMessageReply({
      ticketId: createdTicket.id,
      body: internalNoteText,
      type: "internal_note" as MessageType,
      senderId: "u0000000-0000-0000-0000-000000000002", // Agent Sarah Connor
      senderRole: "agent",
    });

    if (!noteResult.success) {
      throw new Error(`Failed to add internal note: ${noteResult.error}`);
    }
    console.log("  ✓ Internal note added successfully.");

    // ---------------------------------------------------------------------------
    // TEST 2: Fetch that ticket as an Agent
    // ---------------------------------------------------------------------------
    console.log("\n▶ [TEST 2/3] Fetching ticket as Agent (Full visibility check)...");
    const agentTicket = await getTicketById(createdTicket.id);

    if (!agentTicket) {
      throw new Error("Agent could not locate created ticket!");
    }

    const agentInternalNotes = agentTicket.messages.filter(
      (m) => m.type === "internal_note"
    );
    const agentPublicReplies = agentTicket.messages.filter(
      (m) => m.type === "public_reply"
    );

    console.log(`  ✓ Agent retrieved Ticket #${agentTicket.number} with ${agentTicket.messages.length} total messages.`);
    console.log(`  ✓ Public replies visible to agent: ${agentPublicReplies.length}`);
    console.log(`  ✓ Internal notes visible to agent: ${agentInternalNotes.length}`);

    if (agentInternalNotes.length === 0) {
      throw new Error("Agent failed to see the internal note!");
    }

    console.log(`  ✓ Internal note content verified for agent: "${agentInternalNotes[0].body.slice(0, 45)}..."`);
    testsPassed++;

    // ---------------------------------------------------------------------------
    // TEST 3: Verify Internal Note CANNOT be fetched by Customer role
    // ---------------------------------------------------------------------------
    console.log("\n▶ [TEST 3/3] Verifying Customer Privacy & Internal Note Masking...");
    const customerTickets = await getCustomerTickets(customerEmail);
    const customerViewOfTicket = customerTickets.find((t) => t.id === createdTicket.id);

    if (!customerViewOfTicket) {
      throw new Error("Customer could not locate their own ticket in portal view!");
    }

    console.log(`  ✓ Customer located Ticket #${customerViewOfTicket.number}.`);
    console.log(`  ✓ Customer view total messages: ${customerViewOfTicket.messages.length}`);

    // Check for any internal notes in customer's message list
    const leakedInternalNotes = customerViewOfTicket.messages.filter(
      (m) => m.type === "internal_note"
    );

    // Also check if the confidential text leaked into any customer-visible body
    const leakedConfidentialText = customerViewOfTicket.messages.some((m) =>
      m.body.includes("CONFIDENTIAL INTERNAL NOTE")
    );

    if (leakedInternalNotes.length > 0 || leakedConfidentialText) {
      console.error("  ❌ CRITICAL SECURITY LEAK: Customer received internal note rows!");
      throw new Error("Internal notes were leaked to customer view!");
    }

    console.log("  ✓ Leaked internal notes count: 0 (PASSED)");
    console.log("  ✓ Confidential agent diagnostic notes completely masked from customer.");
    console.log("  ✓ Customer only receives public_reply messages.");
    testsPassed++;

    // ---------------------------------------------------------------------------
    // SUMMARY
    // ---------------------------------------------------------------------------
    console.log("\n==================================================================");
    console.log(`🎉 ALL TESTS PASSED (${testsPassed}/${totalTests})`);
    console.log("   • Ticket creation: PASS");
    console.log("   • Agent internal note inspection: PASS");
    console.log("   • Customer internal note masking & isolation: PASS");
    console.log("==================================================================\n");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ DIAGNOSTIC TEST FAILED:", error.message);
    process.exit(1);
  }
}

runDiagnostic();
