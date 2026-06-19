import { tool } from "ai";
import { z } from "zod";
import { matchSpecies, fetchAllOccurrences } from "./gbif";
import { searchObservations } from "./inaturalist";
import { cleanOccurrences, formatCleanedCSV } from "./cleaner";
import { searchArticles } from "./sources/newsapi";
import { runMapVisualization } from "./map-runner";
import { sessionCache, type SpeciesEntry } from "./session-cache";
import type { GbifOccurrence } from "./gbif";

export interface ToolContext {
  conversationId: string;
  origin: string;
}

// --- Shared helpers ---------------------------------------------------------

function iNatToGbifLike(obs: {
  id: number;
  species_guess?: string;
  taxon?: { name?: string } | null;
  latitude?: number | null;
  longitude?: number | null;
  observed_on?: string | null;
  location?: string | null;
  quality_grade?: string;
  positional_accuracy?: number | null;
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
    species: obs.taxon?.name || null,
    genus: null,
    family: null,
    order: null,
    class: null,
    phylum: null,
    kingdom: null,
    country: null,
    countryCode: null,
    occurrenceStatus: "PRESENT",
    publisher: "iNaturalist",
    license: "CC-BY-NC",
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

function computeCenter(records: { decimalLatitude: number | null; decimalLongitude: number | null }[]): [number, number] {
  const valid = records.filter(
    (r): r is { decimalLatitude: number; decimalLongitude: number } =>
      r.decimalLatitude != null && r.decimalLongitude != null,
  );
  if (valid.length === 0) return [0, 0];
  const lats = valid.map((r) => r.decimalLatitude);
  const lngs = valid.map((r) => r.decimalLongitude);
  return [
    lats.reduce((a, b) => a + b, 0) / lats.length,
    lngs.reduce((a, b) => a + b, 0) / lngs.length,
  ];
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
    const src = r.datasetName?.startsWith("iNaturalist")
      ? "iNaturalist"
      : r.datasetName?.startsWith("GBIF")
        ? "GBIF"
        : r.datasetName || "Unknown";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  }

  return {
    scientificName,
    sessionKey,
    sources: {
      gbif: gbifTotal ?? cleaned.records.filter((r) => r.datasetName && !r.datasetName.startsWith("iNaturalist")).length,
      inaturalist: inatTotal ?? cleaned.records.filter((r) => r.datasetName?.startsWith("iNaturalist")).length,
    },
    total: cleaned.summary.total,
    removed: cleaned.summary.removed,
    kept: cleaned.summary.kept,
    removalReasons: cleaned.summary.reasons,
    qualityFlags: flagCounts,
    sourceBreakdown: sourceCounts,
    recordCount: cleaned.records.length,
    sample: cleaned.records.slice(0, 10).map((r) => ({
      scientificName: r.scientificName,
      decimalLatitude: r.decimalLatitude,
      decimalLongitude: r.decimalLongitude,
      country: r.country,
      eventDate: r.eventDate,
      datasetName: r.datasetName,
      flags: r.flags,
    })),
  };
}

function speciesCacheKey(scientificName: string): string {
  return scientificName.toLowerCase().trim();
}

async function fetchAndCleanSpecies(
  ctx: ToolContext,
  scientificName: string,
  usageKey?: number,
  acceptedKey?: number,
): Promise<SpeciesEntry> {
  const cacheKey = speciesCacheKey(scientificName);
  const cached = sessionCache.getSpecies(ctx.conversationId, cacheKey);
  if (cached) return cached;

  const [gbifResult, inatResult] = await Promise.all([
    fetchAllOccurrences(scientificName, usageKey, acceptedKey),
    searchObservations(scientificName, 200),
  ]);

  const gbifRecs = gbifResult?.results || [];
  const inatRecs = (inatResult?.results || []).map(iNatToGbifLike);
  const merged = mergeRecords(gbifRecs as GbifOccurrence[], inatRecs);
  const center = computeCenter(merged);
  const cleaned = cleanOccurrences(merged);
  const csv = formatCleanedCSV(cleaned.records);

  return sessionCache.setSpecies(ctx.conversationId, cacheKey, {
    scientificName,
    csv,
    records: merged,
    count: merged.length,
    center,
  });
}

// --- Tool schemas and definitions ------------------------------------------

export const searchSpeciesSchema = z.object({
  name: z.string().describe("Species name — scientific or common name"),
});

export const fetchAndCleanSchema = z.object({
  scientificNames: z
    .union([z.string(), z.array(z.string())])
    .describe("One or more scientific names to fetch and clean"),
  usageKey: z.number().optional(),
  acceptedKey: z.number().optional(),
  forceRefresh: z.boolean().optional().describe("Re-fetch even if cached"),
});

export const generateMapSchema = z.object({
  scientificNames: z
    .union([z.string(), z.array(z.string())])
    .describe("One or more scientific names to map. Must have been fetched first."),
  speciesColumn: z
    .string()
    .optional()
    .describe("CSV column to color by; defaults to scientificName for multi-species maps"),
});

export const searchNewsSchema = z.object({
  scientificName: z.string().describe("Scientific name of the species"),
  commonName: z.string().optional().describe("Common name to improve search relevance"),
});

export function createAgentTools(ctx: ToolContext) {
  return {
    searchSpecies: tool({
      description:
        "Search GBIF taxonomy for a species name. Returns matched scientific name, rank, and classification.",
      inputSchema: searchSpeciesSchema,
      execute: async ({ name }) => {
        const match = await matchSpecies(name);
        if (!match) {
          return {
            found: false,
            message: `Species "${name}" not found in GBIF taxonomy. Check spelling and try the scientific name.`,
          };
        }
        return {
          found: true,
          scientificName: match.scientificName,
          canonicalName: match.canonicalName,
          rank: match.rank,
          matchType: match.matchType,
          confidence: Math.round(match.confidence),
          kingdom: match.kingdom,
          phylum: match.phylum,
          class: match.class,
          order: match.order,
          family: match.family,
          genus: match.genus,
          species: match.species,
          synonym: match.synonym,
          acceptedName: match.accepted,
          usageKey: match.usageKey,
          acceptedKey: match.acceptedKey,
        };
      },
    }),

    fetchAndClean: tool({
      description:
        "Fetch occurrence records from GBIF + iNaturalist, clean and validate them. Supports one species or an array of species. Raw data is stored server-side; only summary metadata is returned.",
      inputSchema: fetchAndCleanSchema,
      execute: async ({ scientificNames, usageKey, acceptedKey, forceRefresh }) => {
        const names = Array.isArray(scientificNames) ? scientificNames : [scientificNames];

        // Optionally clear cached entries for these species to force a refresh
        if (forceRefresh) {
          const session = sessionCache.getOrCreate(ctx.conversationId);
          for (const name of names) {
            session.species.delete(speciesCacheKey(name));
          }
        }

        const results = await Promise.all(
          names.map((name) => fetchAndCleanSpecies(ctx, name, usageKey, acceptedKey)),
        );

        if (names.length === 1) {
          const entry = results[0];
          const cleaned = cleanOccurrences(entry.records);
          return buildCleanResult(
            entry.scientificName,
            cleaned,
            entry.csv,
            speciesCacheKey(entry.scientificName),
          );
        }

        // Multi-species summary
        const perSpecies = results.map((entry) => {
          const cleaned = cleanOccurrences(entry.records);
          return buildCleanResult(
            entry.scientificName,
            cleaned,
            entry.csv,
            speciesCacheKey(entry.scientificName),
          );
        });

        const combinedRecords = results.flatMap((r) => r.records);
        const combinedCenter = computeCenter(combinedRecords);
        const combinedCSV = formatCleanedCSV(cleanOccurrences(combinedRecords).records);
        const combinedKey = `compare_${names.map(speciesCacheKey).join("_")}`;
        sessionCache.setSpecies(ctx.conversationId, combinedKey, {
          scientificName: names.join(" / "),
          csv: combinedCSV,
          records: combinedRecords,
          count: combinedRecords.length,
          center: combinedCenter,
        });

        return {
          mode: "multi",
          speciesCount: names.length,
          totalRecords: combinedRecords.length,
          center: combinedCenter,
          combinedSessionKey: combinedKey,
          perSpecies,
        };
      },
    }),

    generateMap: tool({
      description:
        "Generate a species distribution map from previously fetched and cleaned data. Supports single or multiple species.",
      inputSchema: generateMapSchema,
      execute: async ({ scientificNames, speciesColumn }) => {
        const names = Array.isArray(scientificNames) ? scientificNames : [scientificNames];

        if (names.length === 1) {
          const cacheKey = speciesCacheKey(names[0]);
          const entry = sessionCache.getSpecies(ctx.conversationId, cacheKey);
          if (!entry) {
            return { success: false, error: `No cleaned data found for "${names[0]}". Run fetchAndClean first.` };
          }

          const result = await runMapVisualization({
            csv: entry.csv,
            species: entry.scientificName,
          });

          return {
            success: true,
            mapUrl: `${ctx.origin}${result.png}`,
            htmlUrl: `${ctx.origin}${result.html}`,
            count: result.count,
            center: result.center,
            species: entry.scientificName,
          };
        }

        // Multi-species: use combined cache entry if available, otherwise build on the fly
        const combinedKey = `compare_${names.map(speciesCacheKey).join("_")}`;
        let entry = sessionCache.getSpecies(ctx.conversationId, combinedKey);

        if (!entry) {
          const entries = names
            .map((n) => sessionCache.getSpecies(ctx.conversationId, speciesCacheKey(n)))
            .filter(Boolean) as SpeciesEntry[];
          if (entries.length === 0) {
            return { success: false, error: "No cleaned data found. Run fetchAndClean first." };
          }
          const combinedRecords = entries.flatMap((e) => e.records);
          const center = computeCenter(combinedRecords);
          entry = sessionCache.setSpecies(ctx.conversationId, combinedKey, {
            scientificName: names.join(" / "),
            csv: formatCleanedCSV(cleanOccurrences(combinedRecords).records),
            records: combinedRecords,
            count: combinedRecords.length,
            center,
          });
        }

        const result = await runMapVisualization({
          csv: entry.csv,
          species: names,
          speciesColumn: speciesColumn || "scientificName",
        });

        return {
          success: true,
          mapUrl: `${ctx.origin}${result.png}`,
          htmlUrl: `${ctx.origin}${result.html}`,
          count: result.count,
          center: result.center,
          species: names,
        };
      },
    }),

    searchNews: tool({
      description:
        "Search NewsAPI for recent articles about a species. Finds conservation news, research discoveries, public discourse, and policy updates.",
      inputSchema: searchNewsSchema,
      execute: async ({ scientificName, commonName }) => {
        try {
          const sciQuery = `"${scientificName}"`;
          const contextTerms = "(conservation OR wildlife OR endangered OR species OR habitat OR biodiversity)";
          const query = commonName
            ? `${sciQuery} OR ("${commonName}" AND ${contextTerms})`
            : sciQuery;
          const result = await searchArticles({
            q: query,
            language: "en",
            sortBy: "publishedAt",
            pageSize: 10,
          });

          if (result.status === "error") {
            return { success: false, error: result.message || "NewsAPI error" };
          }

          const articles = result.articles.map((a) => ({
            title: a.title,
            source: a.source.name,
            author: a.author,
            publishedAt: a.publishedAt,
            url: a.url,
            description: a.description,
            urlToImage: a.urlToImage,
          }));

          return {
            success: true,
            query,
            totalResults: result.totalResults,
            returned: articles.length,
            articles,
          };
        } catch (e) {
          return { success: false, error: (e as Error).message || "NewsAPI unavailable" };
        }
      },
    }),
  };
}
