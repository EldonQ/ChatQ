export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

// Tool output types (what the LLM sees)
export interface SearchSpeciesOutput {
  found: boolean;
  scientificName?: string;
  canonicalName?: string;
  rank?: string;
  matchType?: string;
  confidence?: number;
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
  synonym?: boolean;
  acceptedName?: string;
  usageKey?: number;
  acceptedKey?: number;
  message?: string;
}

export interface FetchAndCleanOutput {
  scientificName: string;
  sessionKey: string;
  sources: { gbif: number; inaturalist: number };
  total: number;
  removed: number;
  kept: number;
  removalReasons: Record<string, number>;
  qualityFlags: Record<string, number>;
  sourceBreakdown: Record<string, number>;
  recordCount: number;
  sample: Array<{
    scientificName: string;
    decimalLatitude: number;
    decimalLongitude: number;
    country: string | null;
    eventDate: string | null;
    datasetName: string | null;
    flags: string[];
  }>;
}

export interface MultiSpeciesFetchOutput {
  mode: "multi";
  speciesCount: number;
  totalRecords: number;
  center: [number, number];
  combinedSessionKey: string;
  perSpecies: FetchAndCleanOutput[];
}

export interface GenerateMapOutput {
  success: boolean;
  mapUrl?: string;
  htmlUrl?: string | null;
  count?: number;
  center?: [number, number];
  species?: string | string[];
  error?: string;
}

export interface SearchNewsOutput {
  success: boolean;
  query?: string;
  totalResults?: number;
  returned?: number;
  articles?: Array<{
    title: string;
    source: string;
    author: string | null;
    publishedAt: string;
    url: string;
    description: string | null;
    urlToImage: string | null;
  }>;
  error?: string;
}
