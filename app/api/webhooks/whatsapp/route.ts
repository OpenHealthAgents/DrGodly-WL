import { NextRequest, NextResponse } from "next/server";
import { handleWhatsAppIncomingMessage } from "../../../../lib/whatsapp-ai-intake";

export const dynamic = "force-dynamic";

/**
 * GET handler: Meta WhatsApp Webhook Verification
 * Meta sends hub.mode, hub.verify_token, and hub.challenge
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken =
    process.env.WHATSAPP_VERIFY_TOKEN || "drgodly_whatsapp_verify_token";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[WhatsApp Webhook] Verification successful");
    return new Response(challenge || "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn(
    `[WhatsApp Webhook] Verification failed. Received token: "${token}", expected: "${expectedToken}"`
  );
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST handler: Meta WhatsApp Webhook Event Receiver
 * Receives incoming customer messages, triggers AI qualification intake,
 * and replies back via WhatsApp.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, any>;

    if (body.object === "whatsapp_business_account" || Array.isArray(body.entry)) {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === "messages") {
            const value = change.value;
            const contacts = value.contacts || [];
            const messages = value.messages || [];

            for (const message of messages) {
              // We handle customer text messages
              if (message.type === "text" && message.text?.body) {
                const senderPhone = message.from;
                const contact = contacts.find(
                  (c: { wa_id?: string; profile?: { name?: string } }) =>
                    c.wa_id === senderPhone
                );
                const senderName = contact?.profile?.name;
                const messageText = message.text.body;

                console.log(
                  `[WhatsApp Webhook] Received message from ${senderPhone} (${senderName || "Unknown"}): "${messageText}"`
                );

                // Run intake qualification logic
                await handleWhatsAppIncomingMessage(
                  senderPhone,
                  messageText,
                  senderName,
                  message.id
                );
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error processing webhook event:", error);
    // Return 200 to prevent Meta from retrying indefinitely on bad payloads
    return NextResponse.json({ status: "ERROR_HANDLED" }, { status: 200 });
  }
}
