import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { AI_SYSTEM_PROMPT } from "@/lib/ai-assistant";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  console.log("POST /api/chat - Request received");
  try {
    const { messages } = await req.json();
    console.log("POST /api/chat - Messages:", messages?.length);

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "") {
      console.error("POST /api/chat - OPENAI_API_KEY is missing");
      return new Response(
        JSON.stringify({ 
          error: "AI Assistant is not configured. Please add OPENAI_API_KEY to your environment variables." 
        }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("POST /api/chat - API Key starts with:", process.env.OPENAI_API_KEY.substring(0, 7) + "...");


    const result = await streamText({
      model: openai("gpt-4o-mini"),
      system: AI_SYSTEM_PROMPT,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("POST /api/chat - Fatal error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
