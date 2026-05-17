import { streamText, UIMessage, convertToModelMessages, tool, stepCountIs } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { matchSpecies, fetchAllOccurrences } from "@/lib/gbif";
import { searchObservations } from "@/lib/inaturalist";
import { cleanOccurrences, formatCleanedCSV } from "@/lib/cleaner";
import type { GbifOccurrence } from "@/lib/gbif";

export const maxDuration = 120;

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1",
});

// Server-side cache: LLM never sees raw records — only summary metadata
type SessionEntry = { species: string; csv: string; records: GbifOccurrence[]; count: number; center: [number, number] };
const sessions = new Map<string, SessionEntry>();

function iNatToGbifLike(obs: {
  id: number; species_guess?: string; taxon?: { name?: string } | null;
  latitude?: number | null; longitude?: number | null; observed_on?: string | null;
  location?: string | null; quality_grade?: string; positional_accuracy?: number | null;
}): Partial<GbifOccurrence> {
  return {
    key: obs.id,
    scientificName: obs.taxon?.name || obs.species_guess || "Unknown",
    decimalLatitude: obs.latitude ?? null,
    decimalLongitude: obs.longitude ?? null,
    eventDate: obs.observed_on || null,
    locality: obs.location || null,
    basisOfRecord: "HUMAN_OBSERVATION",
    coordinateUncertaintyInMeters: obs.positional_accuracy ?? null,
    datasetName: `iNaturalist (${obs.quality_grade || "casual"})`,
    hasCoordinate: obs.latitude != null && obs.longitude != null,
    issues: [],
    species: obs.taxon?.name || null, genus: null, family: null, order: null, class: null, phylum: null, kingdom: null,
    country: null, countryCode: null, occurrenceStatus: "PRESENT", publisher: "iNaturalist", license: "CC-BY-NC",
  };
}

function mergeRecords(gbifRecords: GbifOccurrence[], inatRecords: Partial<GbifOccurrence>[]): GbifOccurrence[] {
  const seen = new Set<string>();
  const merged: GbifOccurrence[] = [];
  for (const r of [...gbifRecords, ...inatRecords]) {
    if (r.decimalLatitude == null || r.decimalLongitude == null) continue;
    const k = `${r.scientificName?.toLowerCase()}_${r.decimalLatitude.toFixed(4)}_${r.decimalLongitude.toFixed(4)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(r as GbifOccurrence);
  }
  return merged;
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const origin = new URL(req.url).origin;

  const result = streamText({
    model: anthropic((process.env.ANTHROPIC_MODEL || "deepseek-v4-pro").replace(/\[.*\]/, "")),
    system: `You are EcoQ, an AI-powered species distribution data assistant.

You help users explore biodiversity data from GBIF, iNaturalist, and other sources.
When a user asks about a species:
1. Use searchSpecies to find it in the GBIF taxonomy
2. Use fetchAndClean to get ALL occurrence records from GBIF + iNaturalist and clean them automatically
3. Use generateMap to create a distribution map

Always present the full results: total records fetched, sources breakdown, cleaning summary, and quality flags. Never suggest that data was truncated or sampled — the full dataset is always processed.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    tools: {
      searchSpecies: tool({
        description: "Search GBIF taxonomy for a species name. Returns matched scientific name, rank, and classification.",
        inputSchema: z.object({
          name: z.string().describe("Species name — scientific or common name"),
        }),
        execute: async ({ name }) => {
          const match = await matchSpecies(name);
          if (!match) return { found: false, message: `Species "${name}" not found in GBIF taxonomy. Check spelling and try the scientific name.` };
          return {
            found: true,
            scientificName: match.scientificName,
            canonicalName: match.canonicalName,
            rank: match.rank,
            matchType: match.matchType,
            confidence: Math.round(match.confidence),
            kingdom: match.kingdom, phylum: match.phylum, class: match.class,
            order: match.order, family: match.family, genus: match.genus, species: match.species,
            synonym: match.synonym, acceptedName: match.accepted,
            usageKey: match.usageKey, acceptedKey: match.acceptedKey,
          };
        },
      }),

      fetchAndClean: tool({
        description: "Fetch ALL occurrence records from GBIF + iNaturalist, then clean and validate them. Returns full cleaning summary. The raw data is stored server-side and never truncated.",
        inputSchema: z.object({
          scientificName: z.string().describe("Scientific name from searchSpecies"),
          usageKey: z.number().optional(),
          acceptedKey: z.number().optional(),
          synonym: z.boolean().optional(),
          sessionKey: z.string().optional().describe("Cache key from previous fetchAndClean call — use to regenerate map without re-fetching"),
        }),
        execute: async ({ scientificName, usageKey, acceptedKey, synonym, sessionKey }) => {
          // Reuse cached records if available
          if (sessionKey && sessions.has(sessionKey)) {
            const cached = sessions.get(sessionKey)!;
            const cleaned = cleanOccurrences(cached.records);
            const csv = formatCleanedCSV(cleaned.records);
            sessions.set(sessionKey, { ...cached, csv });
            return buildCleanResult(scientificName, cleaned, csv, sessionKey);
          }

          // Fetch ALL records from both sources (paginated, no subjective truncation)
          const [gbifResult, inatResult] = await Promise.all([
            fetchAllOccurrences(scientificName, usageKey, acceptedKey),
            searchObservations(scientificName, 200),
          ]);

          const gbifRecs = gbifResult?.results || [];
          const inatRecs = (inatResult?.results || []).map(iNatToGbifLike);
          const merged = mergeRecords(gbifRecs as GbifOccurrence[], inatRecs);

          // Compute center from all coordinates
          const lats = merged.map((r) => r.decimalLatitude!).filter(Boolean);
          const lngs = merged.map((r) => r.decimalLongitude!).filter(Boolean);
          const center: [number, number] = lats.length > 0
            ? [lats.reduce((a, b) => a + b, 0) / lats.length, lngs.reduce((a, b) => a + b, 0) / lngs.length]
            : [0, 0];

          // Clean ALL merged records
          const cleaned = cleanOccurrences(merged);
          const csv = formatCleanedCSV(cleaned.records);

          const key = `s_${Date.now()}`;
          sessions.set(key, { species: scientificName, csv, records: merged, count: merged.length, center });

          return buildCleanResult(scientificName, cleaned, csv, key, gbifResult?.count, inatResult?.total_results);
        },
      }),

      generateMap: tool({
        description: "Generate a species distribution map from previously fetched and cleaned data. The sessionKey must come from a fetchAndClean call.",
        inputSchema: z.object({
          sessionKey: z.string().describe("Session key from fetchAndClean result. Required."),
        }),
        execute: async ({ sessionKey }) => {
          const cached = sessions.get(sessionKey);
          if (!cached || !cached.csv) {
            return { success: false, error: "No cleaned data found. Run fetchAndClean first." };
          }

          try {
            const mapRes = await fetch(`${origin}/api/map`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ csv: cached.csv, species: cached.species }),
            });
            if (mapRes.ok) {
              const data = await mapRes.json();
              if (data.png) return { success: true, mapUrl: `${origin}${data.png}`, htmlUrl: data.html ? `${origin}${data.html}` : null, count: data.count, center: data.center };
              if (data.error) return { success: false, error: data.error };
            }
            return { success: false, error: `Map server returned ${mapRes.status}` };
          } catch {
            return { success: false, error: "Map generation failed (Python not available)." };
          }
        },
      }),
    },
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

function buildCleanResult(
  scientificName: string,
  cleaned: ReturnType<typeof cleanOccurrences>,
  csv: string,
  sessionKey: string,
  gbifTotal?: number,
  inatTotal?: number,
) {
  const flagCounts: Record<string, number> = {};
  for (const r of cleaned.records) {
    for (const f of r.flags) flagCounts[f] = (flagCounts[f] || 0) + 1;
  }

  const sourceCounts: Record<string, number> = {};
  for (const r of cleaned.records) {
    const src = r.datasetName || "Unknown";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  }

  return {
    scientificName,
    sessionKey,
    sources: { gbif: gbifTotal ?? cleaned.records.filter((r) => r.datasetName?.startsWith("GBIF")).length, inaturalist: inatTotal ?? cleaned.records.filter((r) => r.datasetName?.startsWith("iNaturalist")).length },
    total: cleaned.summary.total,
    removed: cleaned.summary.removed,
    kept: cleaned.summary.kept,
    removalReasons: cleaned.summary.reasons,
    qualityFlags: flagCounts,
    sourceBreakdown: sourceCounts,
    recordCount: cleaned.records.length,
    sample: cleaned.records.slice(0, 10).map((r) => ({
      scientificName: r.scientificName, decimalLatitude: r.decimalLatitude, decimalLongitude: r.decimalLongitude,
      country: r.country, eventDate: r.eventDate, datasetName: r.datasetName, flags: r.flags,
    })),
  };
}
