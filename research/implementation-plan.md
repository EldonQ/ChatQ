# EcoQ Multi-Source Species Distribution Pipeline: Implementation Plan

## Phase 1: Multi-Source Data Fetching

### 1.1 Primary Sources (Phase 1)

| Source | Records | API Type | Strengths | Limits |
|--------|---------|----------|-----------|--------|
| **GBIF** | 2.7B+ | REST/JSON | Most comprehensive, Darwin Core standard, taxonomic backbone | Some quality issues, 300/page limit |
| **iNaturalist** | 200M+ | REST/JSON | Photo-verified, community ID, high accuracy | 200/page, rate-limited |
| **eBird** | 1B+ | REST/CSV | Bird specialists, effort-controlled, complete checklists | Birds only, requires auth |
| **OBIS** | 60M+ | REST/JSON | Marine authority, standardized taxonomy, environmental data | Marine only |

### 1.2 Secondary Sources (Phase 2)

| Source | Records | Access | Value |
|--------|---------|--------|-------|
| **VertNet** | 25M+ | REST API | Museum vouchers, physical specimens, historical baselines |
| **BOLD Systems** | 15M+ | REST API | DNA barcode vouchers, verified identifications |
| **PLAZI** | 1M+ | REST API | Taxonomic treatments with specimen citations |
| **User Upload** | Variable | File upload | Research datasets, local surveys |

### 1.3 Fetch Strategy

```
User specifies species → parallel fetch from all available sources:
  ├─ GBIF species/match → taxonKey → occurrence/search
  ├─ iNaturalist /observations?taxon_name=X
  ├─ OBIS /occurrence?scientificname=X (if marine)
  └─ eBird /ref/hotspot/list (if avian, Phase 2)

Each source returns { records: SourceRecord[], total: number, source: string }
Records normalized to internal Darwin-Core-like schema for merging.
```

---

## Phase 2: Data Normalization (Darwin Core Lite)

All sources mapped to this unified schema:

```typescript
interface NormalizedRecord {
  // Core identifiers
  source: "gbif" | "inaturalist" | "obis" | "ebird" | "user";
  sourceId: string;
  sourceUrl?: string;

  // Taxonomy (from GBIF backbone resolution)
  scientificName: string;
  acceptedName?: string;       // if synonym was resolved
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
  taxonRank?: string;

  // Coordinates
  decimalLatitude: number;
  decimalLongitude: number;
  coordinateUncertaintyInMeters?: number;
  coordinatePrecision?: number;  // decimal places

  // Temporal
  eventDate?: string;            // ISO 8601
  year?: number;
  month?: number;
  day?: number;

  // Record metadata
  basisOfRecord: string;        // HUMAN_OBSERVATION, PRESERVED_SPECIMEN, etc.
  datasetName: string;
  publisher: string;
  license: string;
  occurrenceStatus: "present" | "absent";
  establishmentMeans?: string;  // native, introduced, etc.

  // Quality (populated during cleaning)
  flags: string[];
  qualityScore?: number;        // 0-1 composite score
}
```

---

## Phase 3: Cleaning Pipeline

### Step 1: Coordinate Validation
```
✓ bounds check: lat ∈ [-90, 90], lng ∈ [-180, 180]
✓ zero check: flag if both lat=0 and lng=0 (Atlantic null island)
✓ precision: flag if coordinatePrecision < 3 decimal places (~100m)
✓ country centroid: check against known centroid database
✓ institution centroid: check against GBIF institution locations
✓ land/sea: reverse-geocode against coastline (if geopandas available)
```

### Step 2: Taxonomic Resolution
```
✓ All names resolved against GBIF Backbone Taxonomy
✓ Synonyms merged to accepted name
✓ Higher taxonomy backfilled from GBIF
✓ Fuzzy match (Levenshtein < 2) for suspected misspellings
```

### Step 3: Deduplication (Three-Tier)
```
Tier 1 — EXACT: Same source + same sourceId → keep first
Tier 2 — CROSS-SOURCE: Same acceptedName + same lat(4dp) + same lng(4dp) + same date → keep by priority:
  1. PRESERVED_SPECIMEN (vouchered)
  2. iNaturalist research-grade
  3. HUMAN_OBSERVATION
  4. Other
Tier 3 — SPATIAL: Within 100m radius + same species + same date → keep highest quality
```

### Step 4: Spatial Thinning
```
Grid: 0.1° × 0.1° (~11km at equator)
Per cell: keep up to N=1 record (highest qualityScore)
Output: thinned dataset suitable for SDM
```

### Step 5: Quality Scoring
```
qualityScore = weighted average of:
  - coordinatePrecision (0-1, higher = better)
  - basisOfRecord (PRESERVED_SPECIMEN > HUMAN_OBSERVATION > ...)
  - hasDate (0 or 1)
  - sourceReliability (iNat-research > GBIF > iNat-casual)
  - flagCount (inverse, fewer flags = higher score)
```

---

## Phase 4: Map Visualization

### 4.1 Interactive Map (Folium HTML)
- CartoDB Positron tiles (clean, modern basemap)
- Marker clusters (MarkerCluster plugin) for dense distributions
- Popup with: species name, date, source, coordinates
- Layer control: toggle sources on/off
- Fullscreen control
- Legend with quality colors
- Output: `public/maps/{species}_interactive.html`

### 4.2 Static Map (Matplotlib PNG)
- Natural Earth landmass background (geopandas)
- Points colored by source (GBIF=blue, iNat=green, OBIS=cyan)
- Grid overlay with lat/lng labels
- Title with species name + record count
- Legend
- Stats panel: N records, date range, quality summary
- Output: `public/maps/{species}_static.png`

### 4.3 Future: Deck.gl / MapLibre Interactive
- GPU-accelerated rendering for large datasets
- 3D globe mode for global species
- Time slider for temporal distribution
- Heatmap layer for density visualization

---

## Phase 5: AI Agent Integration (Chat Layer)

With the Vercel AI SDK, the pipeline becomes LLM-callable tools:

```typescript
// Tool definitions for the AI agent
const ecoQTools = {
  searchSpecies: tool({
    description: "Search for a species in GBIF taxonomy. Returns matched name, rank, and key.",
    parameters: z.object({ name: z.string().describe("Species name (common or scientific)") }),
    execute: async ({ name }) => { /* GBIF species/match */ }
  }),

  fetchOccurrences: tool({
    description: "Fetch species occurrence records from GBIF, iNaturalist, and OBIS.",
    parameters: z.object({
      speciesName: z.string(),
      sources: z.array(z.enum(["gbif", "inat", "obis"])).default(["gbif", "inat"]),
      limit: z.number().default(500),
    }),
    execute: async ({ speciesName, sources, limit }) => { /* parallel fetch */ }
  }),

  cleanData: tool({
    description: "Clean occurrence data: validate coordinates, resolve taxonomy, deduplicate, spatially thin.",
    parameters: z.object({
      records: z.array(/* ... */),
      thinningGrid: z.number().default(0.1),
    }),
    execute: async ({ records, thinningGrid }) => { /* cleaning pipeline */ }
  }),

  generateMap: tool({
    description: "Generate a distribution map for the given species and records.",
    parameters: z.object({
      speciesName: z.string(),
      records: z.array(/* ... */),
      mapType: z.enum(["interactive", "static", "both"]).default("both"),
    }),
    execute: async ({ speciesName, records, mapType }) => { /* Python subprocess */ }
  }),
};
```

The AI agent (Claude/GPT) can then handle conversations like:
- "Show me the distribution of snow leopards" → `searchSpecies` → `fetchOccurrences` → `cleanData` → `generateMap`
- "Clean this CSV and check for coordinate errors" → `cleanData` on uploaded file
- "I pasted a photo, what species is this?" → vision model → `searchSpecies`
- "Compare the distributions of lions and tigers" → multiple tool calls

---

## Phase 6: Implementation Roadmap

| Week | Task | Deliverable |
|------|------|-------------|
| 1 | Set up Vercel AI SDK + Chatbot template, define tools | Working chat with basic tool calling |
| 1-2 | Port GBIF + iNat clients to tool functions | Species search + fetch working |
| 2 | Implement full cleaning pipeline (coord, taxon, dedup, thin) | Cleaned CSV output in chat |
| 2-3 | Add OBIS + eBird sources | Multi-source fusion |
| 3 | Enhance map viz (interactive HTML + static PNG improvements) | Beautiful maps in chat |
| 3-4 | Polish UX: file upload processing, image paste → species ID | Full zenmux-style experience |
| 4 | Testing, documentation, deployment | Production-ready |
