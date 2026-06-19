import { streamText, UIMessage, convertToModelMessages, stepCountIs } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { env } from "@/lib/env";
import { createAgentTools } from "@/lib/agent-tools";

export const maxDuration = 120;

const anthropic = createAnthropic({
  apiKey: env.ANTHROPIC_AUTH_TOKEN,
  baseURL: env.ANTHROPIC_BASE_URL,
});

const SYSTEM_PROMPT = `You are EcoQ, an AI-powered species distribution data assistant.

You help users explore biodiversity data from GBIF, iNaturalist, and news sources.

Available tools:
- searchSpecies: find a species in the GBIF taxonomy
- fetchAndClean: fetch occurrence records from GBIF + iNaturalist and clean/validate them
- generateMap: create a publication-quality distribution map from cleaned data
- searchNews: find recent news articles about a species

Guidelines:
1. When the user asks about one or more species, start by calling searchSpecies for each.
2. Then call fetchAndClean with the scientific name(s). For multiple species, pass an array to scientificNames.
3. Then call generateMap with the same scientific name(s) to visualize the distribution.
4. Call searchNews if the user asks about conservation, research, or recent news.
5. You may call tools in parallel when they are independent (e.g., searchSpecies for multiple species, or fetchAndClean after all searches complete).
6. Always present full results: total records, source breakdown, cleaning summary, quality flags, and map URLs. Never claim data was truncated — the full fetched dataset is processed server-side.

If the user asks to compare species, fetch and map all requested species together.`;

export async function POST(req: Request) {
  const { messages, conversationId }: { messages: UIMessage[]; conversationId?: string } = await req.json();
  const origin = new URL(req.url).origin;

  // Stable conversation ID derived from the request or generated fresh
  const cid = conversationId || `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ctx = { conversationId: cid, origin };

  const result = streamText({
    model: anthropic(env.ANTHROPIC_MODEL.replace(/\[.*\]/, "")),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(12),
    tools: createAgentTools(ctx),
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      if (error == null) return "An unexpected error occurred.";
      if (typeof error === "string") return error;
      if (error instanceof Error) return error.message;
      return JSON.stringify(error);
    },
  });
}
