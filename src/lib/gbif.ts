export interface GbifOccurrence {
  key: number;
  scientificName: string;
  decimalLatitude: number | null;
  decimalLongitude: number | null;
  eventDate: string | null;
  country: string | null;
  countryCode: string | null;
  locality: string | null;
  basisOfRecord: string | null;
  occurrenceStatus: string | null;
  coordinateUncertaintyInMeters: number | null;
  species: string | null;
  genus: string | null;
  family: string | null;
  order: string | null;
  class: string | null;
  phylum: string | null;
  kingdom: string | null;
  datasetName: string | null;
  publisher: string | null;
  license: string | null;
  hasCoordinate: boolean;
  issues: string[];
}

export interface GbifSearchResult {
  offset: number;
  limit: number;
  endOfRecords: boolean;
  count: number;
  results: GbifOccurrence[];
}

export interface GbifSpeciesMatch {
  usageKey: number;
  scientificName: string;
  canonicalName: string;
  rank: string;
  status: string;
  confidence: number;
  matchType: string;
  kingdom: string;
  phylum: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  species: string;
  synonym: boolean;
  acceptedKey?: number;
  accepted?: string;
}

const GBIF_API = "https://api.gbif.org/v1";

export async function matchSpecies(name: string): Promise<GbifSpeciesMatch | null> {
  try {
    const url = `${GBIF_API}/species/match?name=${encodeURIComponent(name)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.matchType === "NONE") return null;
    return data as GbifSpeciesMatch;
  } catch {
    return null;
  }
}

const GBIF_PAGE_SIZE = 300; // GBIF API hard cap per request

export async function fetchOccurrences(
  scientificName: string,
  limit = GBIF_PAGE_SIZE,
  offset = 0,
): Promise<GbifSearchResult | null> {
  try {
    const params = new URLSearchParams({
      scientificName,
      limit: String(Math.min(limit, GBIF_PAGE_SIZE)),
      offset: String(offset),
      hasCoordinate: "true",
    });
    const url = `${GBIF_API}/occurrence/search?${params}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as GbifSearchResult;
  } catch {
    return null;
  }
}

export async function fetchOccurrenceByTaxonKey(
  taxonKey: number,
  limit = GBIF_PAGE_SIZE,
  offset = 0,
): Promise<GbifSearchResult | null> {
  try {
    const params = new URLSearchParams({
      taxonKey: String(taxonKey),
      limit: String(Math.min(limit, GBIF_PAGE_SIZE)),
      offset: String(offset),
      hasCoordinate: "true",
    });
    const url = `${GBIF_API}/occurrence/search?${params}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as GbifSearchResult;
  } catch {
    return null;
  }
}

/** Paginate through ALL GBIF occurrence records using the given query params. */
export async function fetchAllOccurrences(
  scientificName: string,
  taxonKey?: number,
  acceptedKey?: number,
  maxRecords = 2000,
): Promise<GbifSearchResult> {
  const allResults: GbifSearchResult = { offset: 0, limit: 0, endOfRecords: true, count: 0, results: [] };
  let offset = 0;

  while (offset < maxRecords) {
    const page = taxonKey
      ? await fetchOccurrenceByTaxonKey(acceptedKey || taxonKey, GBIF_PAGE_SIZE, offset)
      : await fetchOccurrences(scientificName, GBIF_PAGE_SIZE, offset);

    if (!page || page.results.length === 0) break;

    allResults.count = page.count;
    allResults.results.push(...page.results);
    offset += page.results.length;

    if (page.endOfRecords || offset >= maxRecords) break;
  }

  allResults.offset = 0;
  allResults.limit = allResults.results.length;
  return allResults;
}
