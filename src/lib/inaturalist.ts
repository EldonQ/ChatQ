export interface INatObservation {
  id: number;
  species_guess: string;
  taxon: {
    id: number;
    name: string;
    preferred_common_name: string;
    rank: string;
    iconic_taxon_name: string;
  } | null;
  observed_on: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  positional_accuracy: number | null;
  quality_grade: string;
  photos: { url: string; attribution: string }[];
  uri: string;
}

export interface INatSearchResult {
  total_results: number;
  page: number;
  per_page: number;
  results: INatObservation[];
}

const INAT_API = "https://api.inaturalist.org/v1";

export async function searchObservations(
  taxonName: string,
  perPage = 200,
  page = 1,
): Promise<INatSearchResult | null> {
  try {
    const params = new URLSearchParams({
      taxon_name: taxonName,
      per_page: String(perPage),
      page: String(page),
      order: "desc",
      order_by: "observed_on",
      has: "geo",
    });
    const url = `${INAT_API}/observations?${params}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as INatSearchResult;
  } catch {
    return null;
  }
}
