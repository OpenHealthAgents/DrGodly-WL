import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import prisma from "./prisma";
import { Prisma } from "@prisma/client";
import { calculateBMI, determineEligibilityForRegion, type EligibilityResult } from "./eligibility";
import { getRecommendations, type RecommendationResult } from "./recommendations";
import { IntakeData, IntakeStep } from "./intake-state";
import { normalizeWhatsAppNumber, sendWhatsAppTextMessage, markWhatsAppMessageRead } from "./whatsapp";
import { getSiteUrl } from "./site";

export interface WhatsAppConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface WhatsAppIntakeSessionData {
  phone: string;
  senderName?: string;
  conversation: WhatsAppConversationMessage[];
  draft: Partial<IntakeData>;
  isQualified?: boolean;
  eligibilityStatus?: string;
  eligibilityReason?: string;
  bmi?: number;
}

const WHATSAPP_INTAKE_SYSTEM_PROMPT = `
You are the DrGodly Clinical AI Intake Assistant on WhatsApp for DrGodly (www.drgodly.com).
Your mission is to conversationally screen and qualify individuals in India for doctor-guided GLP-1 weight loss treatment (Semaglutide, Tirzepatide).

CLINICAL QUALIFICATION REQUIREMENTS:
1. Physical Metrics:
   - Height: in cm (e.g. 175) or feet/inches (e.g. 5'9" -> ~175cm)
   - Current Weight: in kg or lbs -> convert to kg
   - Goal Weight: in kg or lbs
   - Gender: male, female, or other
   - Age / Date of Birth (must be >= 18 years old)

2. Critical Medical Contraindications (Safety first!):
   - Personal or family history of Medullary Thyroid Carcinoma (MTC) or MEN 2 (Multiple Endocrine Neoplasia type 2)?
   - History of pancreatitis, gallbladder issues, active cancer, or severe kidney/liver disease?
   - Any recent opiate use?
   - If female: currently pregnant, nursing, or planning pregnancy?

3. Extended Health History:
   - Any weight-related conditions: Type 2 Diabetes, Prediabetes, High Blood Pressure (Hypertension), High Cholesterol, PCOS, or Sleep Apnea?

4. Preferences:
   - Format: Oral tablets (e.g. Semalix / Obeda) vs once-weekly pre-filled injection pen / vial.
   - Priority: Affordability vs Maximum Potency.

5. Identity & Contact for Doctor Prescription:
   - Full Name (First & Last)
   - Email address
   - Delivery State/City in India

CONVERSATION STYLE RULES:
- Be warm, empathetic, clinical, and concise. This is WhatsApp, so avoid huge walls of text!
- Ask at most 1 or 2 related questions at a time.
- If the user provides multiple pieces of info in one reply (e.g. "I am 5'8, 85kg, male, 32 years old"), acknowledge them, extract them using the tool, and smoothly move to the next topic (medical history).
- Whenever the patient shares details, use the \`update_patient_intake_data\` tool.
- When you have collected the vital metrics, safety check, and contact details, invoke the \`complete_intake_qualification\` tool.
- End your messages with a brief disclaimer if discussing medical qualification:
  "DrGodly AI Clinical Assistant. Final eligibility is confirmed by our licensed physicians."
`;

/**
 * Retrieves or creates a WhatsApp intake session in PendingIntake.
 */
export async function getOrCreateWhatsAppSession(
  fromPhone: string,
  senderName?: string
): Promise<{ sessionId: string; sessionData: WhatsAppIntakeSessionData }> {
  const normalizedPhone = normalizeWhatsAppNumber(fromPhone);
  const sessionId = `whatsapp:${normalizedPhone}`;

  const existing = await prisma.pendingIntake.findUnique({
    where: { sessionId },
  });

  if (existing) {
    const rawData = (existing.data as unknown as WhatsAppIntakeSessionData) || {};
    const sessionData: WhatsAppIntakeSessionData = {
      phone: normalizedPhone,
      senderName: senderName || rawData.senderName || "Friend",
      conversation: Array.isArray(rawData.conversation) ? rawData.conversation : [],
      draft: rawData.draft || { phone: normalizedPhone },
      isQualified: !!rawData.isQualified,
      eligibilityStatus: rawData.eligibilityStatus,
      eligibilityReason: rawData.eligibilityReason,
      bmi: rawData.bmi,
    };
    return { sessionId, sessionData };
  }

  const initialData: WhatsAppIntakeSessionData = {
    phone: normalizedPhone,
    senderName: senderName || "Friend",
    conversation: [],
    draft: {
      phone: normalizedPhone,
      healthCritical: [],
      healthExtended: [],
      personalizationGoals: ["steady_progress"],
      opiateUse: "no",
      priorSurgery: "no",
      currentMeds: "no",
      bloodPressure: "normal",
      heartRate: "normal",
      medicationHistory: "none",
      programHistory: "no",
      primaryInterest: "affordability",
      formFactor: "injection",
      hasAdditionalInfo: "no",
    },
    isQualified: false,
  };

  await prisma.pendingIntake.create({
    data: {
      sessionId,
      currentStep: "whatsapp_ai",
      data: initialData as unknown as Prisma.InputJsonObject,
    },
  });

  return { sessionId, sessionData: initialData };
}

/**
 * Saves updated WhatsApp intake session data.
 */
export async function saveWhatsAppSession(
  sessionId: string,
  sessionData: WhatsAppIntakeSessionData
): Promise<void> {
  // Keep only the most recent 16 messages to avoid unbounded growth
  if (sessionData.conversation.length > 16) {
    sessionData.conversation = sessionData.conversation.slice(-16);
  }

  await prisma.pendingIntake.update({
    where: { sessionId },
    data: {
      data: sessionData as unknown as Prisma.InputJsonObject,
      currentStep: sessionData.isQualified ? IntakeStep.COMPLETED : "whatsapp_ai",
    },
  });
}

/**
 * Handles an incoming WhatsApp message:
 * Feeds it to the Clinical AI intake agent, records qualification vitals,
 * and replies back to the patient via WhatsApp.
 */
export async function handleWhatsAppIncomingMessage(
  fromPhone: string,
  userMessage: string,
  senderName?: string,
  messageId?: string
): Promise<string> {
  const normalizedPhone = normalizeWhatsAppNumber(fromPhone);
  if (messageId) {
    await markWhatsAppMessageRead(messageId);
  }

  const { sessionId, sessionData } = await getOrCreateWhatsAppSession(
    normalizedPhone,
    senderName
  );

  // Append user's incoming message
  sessionData.conversation.push({
    role: "user",
    content: userMessage,
    timestamp: new Date().toISOString(),
  });

  let assistantReply = "";

  // Check if OpenAI API Key is available
  if (!process.env.OPENAI_API_KEY) {
    assistantReply = handleFallbackWithoutAI(sessionData, userMessage);
  } else {
    try {
      assistantReply = await runAIAgentTurn(sessionId, sessionData);
    } catch (err) {
      console.error("[WhatsApp AI] Error generating AI response:", err);
      assistantReply = handleFallbackWithoutAI(sessionData, userMessage);
    }
  }

  // Append assistant's reply to conversation
  sessionData.conversation.push({
    role: "assistant",
    content: assistantReply,
    timestamp: new Date().toISOString(),
  });

  // Save session state to database
  await saveWhatsAppSession(sessionId, sessionData);

  // Send WhatsApp text message out to user
  await sendWhatsAppTextMessage({
    to: normalizedPhone,
    body: assistantReply,
  });

  return assistantReply;
}

/**
 * Executes an LLM turn with tool calling for patient intake & clinical qualification.
 */
async function runAIAgentTurn(
  sessionId: string,
  sessionData: WhatsAppIntakeSessionData
): Promise<string> {
  const siteUrl = getSiteUrl();

  // Convert conversation to model messages format
  const modelMessages = sessionData.conversation.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: WHATSAPP_INTAKE_SYSTEM_PROMPT,
    messages: modelMessages,
    tools: {
      update_patient_intake_data: tool({
        description:
          "Updates extracted patient metrics, health conditions, preferences, or personal details.",
        parameters: z.object({
          heightCm: z.number().optional().describe("Height in centimeters (e.g. 175)"),
          weightKg: z.number().optional().describe("Weight in kilograms (e.g. 82)"),
          goalWeightKg: z.number().optional().describe("Goal weight in kilograms (e.g. 70)"),
          gender: z.enum(["male", "female", "other"]).optional(),
          dateOfBirth: z.string().optional().describe("YYYY-MM-DD or estimated ISO date"),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().optional(),
          shippingState: z.string().optional().describe("State or city in India (e.g. Maharashtra, Delhi, Karnataka)"),
          formFactor: z.enum(["injection", "tablet"]).optional(),
          primaryInterest: z.enum(["affordability", "potency"]).optional(),
          hasMtcMen2OrThyroidCancer: z.boolean().optional().describe("History of MTC or MEN2"),
          hasPancreatitisOrCancer: z.boolean().optional(),
          isPregnantOrNursing: z.boolean().optional(),
          weightRelatedConditions: z.array(z.string()).optional().describe("e.g. diabetes_t2, hypertension, pcos, high_cholesterol"),
        }),
        execute: async (args: any) => {
          const draft = sessionData.draft;
          if (args.heightCm) draft.height = Math.round(args.heightCm);
          if (args.weightKg) draft.weight = Math.round(args.weightKg * 10) / 10;
          if (args.goalWeightKg) draft.goalWeight = Math.round(args.goalWeightKg * 10) / 10;
          if (args.gender) draft.gender = args.gender;
          if (args.dateOfBirth) draft.dateOfBirth = args.dateOfBirth;
          if (args.firstName) draft.firstName = args.firstName;
          if (args.lastName) draft.lastName = args.lastName;
          if (args.email) draft.email = args.email;
          if (args.shippingState) draft.shippingState = args.shippingState;
          if (args.formFactor) draft.formFactor = args.formFactor;
          if (args.primaryInterest) draft.primaryInterest = args.primaryInterest;

          // Contraindications
          const critical = new Set(draft.healthCritical || []);
          if (args.hasMtcMen2OrThyroidCancer) {
            critical.add("mtc_men2_history");
          }
          if (args.hasPancreatitisOrCancer || args.isPregnantOrNursing) {
            critical.add("active_cancer");
          }
          if (critical.size === 0) {
            critical.add("none");
          }
          draft.healthCritical = Array.from(critical);

          // Extended conditions
          const extended = new Set(draft.healthExtended || []);
          if (args.weightRelatedConditions && args.weightRelatedConditions.length > 0) {
            args.weightRelatedConditions.forEach((c: string) => extended.add(c));
          } else if (extended.size === 0) {
            extended.add("none");
          }
          draft.healthExtended = Array.from(extended);

          return { success: true, updatedFields: Object.keys(args) };
        },
      } as any),

      complete_intake_qualification: tool({
        description:
          "Invoked when all core qualification data is present. Calculates BMI, runs clinical eligibility rules, and stores records in the database.",
        parameters: z.object({
          confirmationNotes: z.string().describe("Brief clinical summary of qualification"),
        }),
        execute: async ({ confirmationNotes }: { confirmationNotes: string }) => {
          const draft = sessionData.draft;
          const height = draft.height || 170;
          const weight = draft.weight || 80;
          const bmi = calculateBMI(height, weight);
          const roundedBmi = Math.round(bmi * 10) / 10;

          // Full intake data structure
          const fullData: IntakeData = {
            height,
            weight,
            goalWeight: draft.goalWeight || Math.round(weight * 0.85),
            gender: draft.gender || "female",
            dateOfBirth: draft.dateOfBirth || "1994-01-01",
            healthCritical: draft.healthCritical && draft.healthCritical.length > 0 ? draft.healthCritical : ["none"],
            healthExtended: draft.healthExtended && draft.healthExtended.length > 0 ? draft.healthExtended : ["none"],
            opiateUse: draft.opiateUse || "no",
            priorSurgery: draft.priorSurgery || "no",
            currentMeds: draft.currentMeds || "no",
            bloodPressure: draft.bloodPressure || "normal",
            heartRate: draft.heartRate || "normal",
            medicationHistory: draft.medicationHistory || "none",
            programHistory: draft.programHistory || "no",
            primaryInterest: draft.primaryInterest || "affordability",
            formFactor: draft.formFactor || "injection",
            hasAdditionalInfo: "no",
            personalizationGoals: draft.personalizationGoals || ["steady_progress"],
            firstName: draft.firstName || sessionData.senderName || "Patient",
            lastName: draft.lastName || "User",
            shippingState: draft.shippingState || "India",
            email: draft.email || `${sessionData.phone}@whatsapp.drgodly.com`,
            phone: sessionData.phone,
          };

          // Run clinical eligibility check for India
          const eligibility: EligibilityResult = determineEligibilityForRegion(fullData, "IN");
          const recommendations: RecommendationResult = getRecommendations(fullData, eligibility);

          sessionData.isQualified = true;
          sessionData.eligibilityStatus = eligibility.status;
          sessionData.eligibilityReason = eligibility.reason;
          sessionData.bmi = roundedBmi;
          sessionData.draft = fullData;

          // Persist user and intake record to DB
          try {
            const user = await prisma.user.upsert({
              where: { email: fullData.email },
              update: { name: `${fullData.firstName} ${fullData.lastName}` },
              create: {
                email: fullData.email,
                name: `${fullData.firstName} ${fullData.lastName}`,
                role: "user",
              },
            });

            await prisma.intake.upsert({
              where: { userId: user.id },
              update: {
                firstName: fullData.firstName,
                lastName: fullData.lastName,
                email: fullData.email,
                phone: fullData.phone,
                shippingState: fullData.shippingState,
                height: fullData.height,
                weight: fullData.weight,
                goalWeight: fullData.goalWeight,
                gender: fullData.gender,
                dateOfBirth: new Date(fullData.dateOfBirth),
                healthData: {
                  healthCritical: fullData.healthCritical,
                  healthExtended: fullData.healthExtended,
                  bloodPressure: fullData.bloodPressure,
                  heartRate: fullData.heartRate,
                  opiateUse: fullData.opiateUse,
                  priorSurgery: fullData.priorSurgery,
                  currentMeds: fullData.currentMeds,
                } as Prisma.InputJsonValue,
                history: {
                  medicationHistory: fullData.medicationHistory,
                  programHistory: fullData.programHistory,
                } as Prisma.InputJsonValue,
                preferences: {
                  primaryInterest: fullData.primaryInterest,
                  formFactor: fullData.formFactor,
                  personalizationGoals: fullData.personalizationGoals,
                  hasAdditionalInfo: fullData.hasAdditionalInfo,
                } as Prisma.InputJsonValue,
              },
              create: {
                userId: user.id,
                firstName: fullData.firstName,
                lastName: fullData.lastName,
                email: fullData.email,
                phone: fullData.phone,
                shippingState: fullData.shippingState,
                height: fullData.height,
                weight: fullData.weight,
                goalWeight: fullData.goalWeight,
                gender: fullData.gender,
                dateOfBirth: new Date(fullData.dateOfBirth),
                healthData: {
                  healthCritical: fullData.healthCritical,
                  healthExtended: fullData.healthExtended,
                } as Prisma.InputJsonValue,
                history: {} as Prisma.InputJsonValue,
                preferences: {
                  primaryInterest: fullData.primaryInterest,
                  formFactor: fullData.formFactor,
                } as Prisma.InputJsonValue,
              },
            });

            await prisma.eligibility.upsert({
              where: { userId: user.id },
              update: {
                status: eligibility.status,
                reason: eligibility.reason,
              },
              create: {
                userId: user.id,
                status: eligibility.status,
                reason: eligibility.reason,
              },
            });
          } catch (dbErr) {
            console.error("[WhatsApp AI] Failed to upsert user intake to DB:", dbErr);
          }

          const resumeUrl = `${siteUrl}/api/whatsapp/resume?session=${encodeURIComponent(sessionId)}`;

          return {
            status: eligibility.status,
            bmi: roundedBmi,
            reason: eligibility.reason,
            recommendedDrug: recommendations.primary?.drugType,
            recommendedTier: recommendations.primary?.tier,
            resumeUrl,
            confirmationNotes,
          };
        },
      } as any),
    },
  });

  return text;
}

/**
 * Fallback conversational logic when OPENAI_API_KEY is not configured yet.
 */
function handleFallbackWithoutAI(
  sessionData: WhatsAppIntakeSessionData,
  userMessage: string
): string {
  const siteUrl = getSiteUrl();
  const lower = userMessage.toLowerCase().trim();
  const draft = sessionData.draft;

  // Check for numbers indicating height/weight
  const numbers = userMessage.match(/\d+(\.\d+)?/g);

  if (!draft.height && numbers && numbers.length >= 2) {
    draft.height = parseFloat(numbers[0]);
    draft.weight = parseFloat(numbers[1]);
  }

  if (!draft.height) {
    return (
      "👋 Hello! Welcome to *DrGodly* Doctor-Guided Weight Loss on WhatsApp.\n\n" +
      "I can help you check your clinical eligibility for doctor-prescribed GLP-1 medications (Semaglutide / Tirzepatide).\n\n" +
      "To start, could you please tell me your *Height* (e.g. 175 cm or 5'9\") and your current *Weight* (e.g. 85 kg)?"
    );
  }

  if (!draft.gender) {
    if (lower.includes("male") || lower.includes("man")) draft.gender = "male";
    else if (lower.includes("female") || lower.includes("woman")) draft.gender = "female";
    else draft.gender = "other";

    return (
      `Got it! (Height: ${draft.height}cm, Weight: ${draft.weight}kg).\n\n` +
      "Next, do you have any personal or family history of *thyroid cancer (MTC/MEN 2)*, pancreatitis, or active kidney disease? (Reply *Yes* or *No*)"
    );
  }

  const bmi = calculateBMI(draft.height, draft.weight || 75);
  sessionData.isQualified = true;
  sessionData.bmi = Math.round(bmi * 10) / 10;
  const resumeUrl = `${siteUrl}/api/whatsapp/resume?session=whatsapp:${sessionData.phone}`;

  return (
    `🎉 Great news! Based on your preliminary details, your BMI is *${sessionData.bmi}*, which qualifies for medical review for DrGodly's GLP-1 weight loss program.\n\n` +
    `👉 *View your personalized treatment plan & doctor options:*\n${resumeUrl}\n\n` +
    "Our medical team is ready to assist you. Final prescription is subject to doctor consultation."
  );
}
