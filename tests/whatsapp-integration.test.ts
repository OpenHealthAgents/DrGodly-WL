import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeWhatsAppNumber, generateWhatsAppLink } from "../lib/whatsapp";
import { GET as getWebhook, POST as postWebhook } from "../app/api/webhooks/whatsapp/route";
import { GET as getResume } from "../app/api/whatsapp/resume/route";
import { handleWhatsAppIncomingMessage, getOrCreateWhatsAppSession } from "../lib/whatsapp-ai-intake";
import { NextRequest } from "next/server";

describe("WhatsApp Integration Suite", () => {
  it("normalizes phone numbers to standard E.164 digits format", () => {
    assert.equal(normalizeWhatsAppNumber("9876543210"), "919876543210");
    assert.equal(normalizeWhatsAppNumber("+91 98765-43210"), "919876543210");
    assert.equal(normalizeWhatsAppNumber("14155552671"), "14155552671");
  });

  it("generates wa.me click-to-chat links with prefilled text", () => {
    const link = generateWhatsAppLink("Hello DrGodly");
    assert.ok(link.startsWith("https://wa.me/"));
    assert.ok(link.includes("Hello%20DrGodly"));
  });

  it("verifies Meta webhook challenge with correct token", async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = "test_verify_token";

    const validUrl = "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test_verify_token&hub.challenge=1158201236";
    const req = new NextRequest(validUrl);
    const res = await getWebhook(req);

    assert.equal(res.status, 200);
    const challengeText = await res.text();
    assert.equal(challengeText, "1158201236");
  });

  it("rejects Meta webhook challenge with invalid token", async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = "test_verify_token";

    const invalidUrl = "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=1158201236";
    const req = new NextRequest(invalidUrl);
    const res = await getWebhook(req);

    assert.equal(res.status, 403);
  });

  it("handles incoming WhatsApp message event and updates session", async () => {
    const testPhone = "919988776655";
    const webhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID_TEST",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                contacts: [
                  {
                    profile: { name: "Rajesh Kumar" },
                    wa_id: testPhone,
                  },
                ],
                messages: [
                  {
                    from: testPhone,
                    id: "wamid.TEST_MSG_1",
                    timestamp: "1720000000",
                    type: "text",
                    text: {
                      body: "Hi, I am 175cm and 90kg. Can I qualify for weight loss?",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const req = new NextRequest("http://localhost:3000/api/webhooks/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    const res = await postWebhook(req);
    assert.equal(res.status, 200);

    const data = (await res.json()) as Record<string, any>;
    assert.equal(data.status, "EVENT_RECEIVED");

    // Verify session was created in PendingIntake
    const { sessionData } = await getOrCreateWhatsAppSession(testPhone);
    assert.equal(sessionData.phone, testPhone);
    assert.ok(sessionData.conversation.length > 0);
  });

  it("resumes WhatsApp qualified session and sets cookie", async () => {
    const testSession = "whatsapp:919988776655";
    const req = new NextRequest(`http://localhost:3000/api/whatsapp/resume?session=${testSession}`);
    const res = await getResume(req);

    assert.equal(res.status, 307); // NextResponse.redirect default
    assert.ok(res.headers.get("location")?.includes("/results"));
    assert.ok(res.headers.get("set-cookie")?.includes("drgodly_intake_session=whatsapp%3A919988776655"));
  });
});
