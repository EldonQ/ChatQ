---
name: ecoq-species-data-cleaner
description: AI-powered species distribution data cleaning and visualization platform. Multi-source occurrence data (GBIF + iNaturalist), automated coordinate validation and deduplication, Cartopy-powered publication-quality maps, streaming chat interface with tool calling. Triggers: "species distribution", "occurrence data cleaning", "GBIF data", "species map", "物种分布", "分布地图", "数据清洗".
license: MIT
---

# EcoQ — AI-Powered Species Distribution Data Assistant

EcoQ is an AI agent-powered platform for species distribution data. It combines Vercel AI SDK tool calling with domain-specific pipelines to fetch, clean, and visualize occurrence data from GBIF and iNaturalist.

## Architecture

```
User query → useChat() → /api/chat (streamText + tools)
  ├─ searchSpecies    → GBIF taxonomy match
  ├─ fetchAndClean    → GBIF + iNaturalist (paginated, all records)
  │                     → Server-side cache (LLM never touches raw data)
  │                     → Coordinate validation, deduplication, quality flags
  └─ generateMap      → Python Cartopy (Robinson) + folium
```

## Capabilities

### Multi-Source Data Fetching
- GBIF occurrence search with offset pagination (up to 2000 records, 300/page)
- iNaturalist observations API (200 records, all quality grades)
- Automatic cross-source deduplication (species + rounded lat/lng)
- Full source breakdown in results (GBIF vs iNaturalist counts)

### Data Cleaning Pipeline
- Coordinate boundary validation (-90/90 lat, -180/180 lng)
- Zero-coordinate flagging, precision assessment
- GBIF issue flag integration (COUNTRY_COORDINATE_MISMATCH, etc.)
- Fossil/living specimen flagging
- CSV output with proper escaping (commas, quotes, newlines)

### Map Visualization
- Cartopy Robinson projection with Natural Earth features (publication-quality PNG)
- Folium interactive HTML with MarkerCluster and LayerControl
- Fallback to geopandas when Cartopy unavailable

### Modern Chat Interface
- AI SDK v6 streaming with tool card rendering
- File upload (CSV, GeoJSON, images) + clipboard paste
- Conversation management with JSON export
- Skill selector UI, dark/light theme

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router + Turbopack) |
| AI Agent | Vercel AI SDK v6 (streamText + tool + useChat) |
| Model | Anthropic-compatible (DeepSeek V4 Pro) |
| UI | React 19 + shadcn/ui v4 (@base-ui/react) + Tailwind CSS v4 |
| State | Zustand |
| Maps | Python Cartopy + folium + matplotlib + geopandas |
| Data | GBIF API + iNaturalist API |

## Project Structure

```
E:\ChatQ\
├── src/
│   ├── src/app/api/chat/route.ts     # AI Agent (streamText + tools)
│   ├── src/app/api/map/route.ts      # Map generation (Python subprocess)
│   ├── src/components/chat/          # Chat UI components
│   ├── src/lib/                      # GBIF, iNaturalist, cleaner, store
│   └── scripts/map_viz.py            # Cartopy + folium map script
├── research/                          # Research documents
└── skills/                            # This skill package
```

## Commands

```bash
cd E:\ChatQ\src
npm run dev        # http://localhost:3000
npm run build      # Production build
npx tsc --noEmit   # Type check
```

## Map Script Usage

```bash
python scripts/map_viz.py --csv data.csv --species "Panthera tigris" --output-dir public/maps
```

Requires: cartopy, folium, geopandas, matplotlib, pandas (conda environment recommended).
