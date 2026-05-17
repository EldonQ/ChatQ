# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EcoQ is an AI-powered species distribution data assistant. The full pipeline:
1. **AI Agent** (Vercel AI SDK `streamText` + `tool()`) orchestrates the workflow
2. Multi-source species occurrence data fetching (GBIF + iNaturalist, all records, no truncation)
3. Automated data cleaning (coordinate validation, deduplication, quality flagging)
4. Map visualization (Python Cartopy + folium → publication-quality PNG + interactive HTML)
5. Chat-based web interface with streaming, tool cards, file upload, image paste

## Architecture

```
User types species name / pastes image / uploads file
  → ChatArea.tsx (useChat hook from @ai-sdk/react)
    → /api/chat (streamText + tool() + toUIMessageStreamResponse)
      → Anthropic-compatible LLM (DeepSeek V4 Pro via api.deepseek.com/anthropic)
      → Tools:
        - searchSpecies   → GBIF species/match
        - fetchAndClean   → GBIF + iNaturalist (parallel, all records)
                           → Server-side cache (LLM never sees raw data)
                           → Cleaner (coordinate validation, dedup)
        - generateMap     → /api/map → Python Cartopy + folium
    → Tool cards streamed in real-time (input-available → output-available)
    → Map image displayed inline
```

**Key architectural decision**: Raw occurrence records are stored in a server-side `Map` cache. The LLM only receives summary metadata (counts, source breakdown, quality flags). This prevents data truncation and ensures ALL fetched records are processed.

## Project Structure

```
E:\ChatQ\
├── research/
│   ├── data-cleaning-pipeline.md      # Data quality methodology
│   ├── research-plan.md               # Full research plan (bilingual)
│   ├── multi-source-pipeline.md       # Multi-source fusion scheme
│   ├── implementation-plan.md         # 6-week implementation roadmap
│   └── framework-review.md            # Open-source framework comparison
├── src/                               # Next.js 16 web app
│   ├── .env.local                     # Environment config (ANTHROPIC_BASE_URL)
│   ├── src/app/
│   │   ├── page.tsx                   # Main chat page
│   │   ├── layout.tsx                 # Layout + sidebar + theme
│   │   ├── api/chat/route.ts          # AI Agent API (streamText + tools)
│   │   ├── api/map/route.ts           # Map generation (Python subprocess)
│   │   └── globals.css                # OKLCH nature theme
│   ├── src/components/chat/
│   │   ├── ChatArea.tsx               # useChat hook + store sync
│   │   ├── ChatInput.tsx              # Text + file + image paste + stop
│   │   ├── MessageList.tsx            # Message bubbles + tool cards + markdown
│   │   ├── ProgressSteps.tsx          # Step progress (reusable)
│   │   ├── Sidebar.tsx                # Conversation sidebar
│   │   └── DataPreview.tsx            # Table preview in tool cards
│   ├── src/components/ui/             # shadcn/ui v4 (@base-ui/react)
│   ├── src/lib/
│   │   ├── gbif.ts                    # GBIF API client (limit: 1000)
│   │   ├── inaturalist.ts             # iNaturalist API client (all grades)
│   │   ├── cleaner.ts                 # Data cleaning engine
│   │   ├── store.ts                   # Zustand (conversations only)
│   │   ├── types.ts                   # TypeScript types
│   │   └── utils.ts                   # cn() utility
│   ├── scripts/map_viz.py             # Cartopy + folium map script
│   └── public/maps/                   # Generated map images
└── skills/                            # Claude Code Skills
```

## Commands

```bash
# Development
cd E:\ChatQ\src
npm run dev        # http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint
npx tsc --noEmit   # Type check

# Map visualization (requires conda env "new")
E:\anaconda3\envs\new\python.exe scripts/map_viz.py --csv data.csv --species "Panthera tigris" --output-dir public/maps
```

## Key Technical Notes

- **AI SDK v6**: `streamText()` + `tool()` + `toUIMessageStreamResponse()`. Provider: `createAnthropic()` with custom `baseURL` for DeepSeek. Model: `deepseek-v4-pro`.
- **Client**: `useChat()` with `DefaultChatTransport`. Messages use `parts[]` array. Tool parts: `tool-searchSpecies`, `tool-fetchAndClean`, `tool-generateMap`.
- **Server-side cache**: `Map<string, SessionEntry>` stores full records. LLM only receives summary metadata (counts, source breakdown, quality flags). `sessionKey` links `fetchAndClean` → `generateMap`. Prevents data truncation.
- **GBIF pagination**: `fetchAllOccurrences()` paginates up to 2000 records (GBIF API caps at 300/page, 7 pages max). iNaturalist: 200 records (API limit). All quality grades included, no filter.
- **GBIF confidence**: API returns integer 0–100 (not 0–1). `searchSpecies` tool passes raw value as `confidence: Math.round(match.confidence)`.
- **shadcn/ui v4**: Uses `@base-ui/react` (not Radix). No `asChild`. No `viewportRef` on ScrollArea.
- **Toast**: `sonner` (not deprecated `toast`).
- **Theme**: CSS variables OKLCH, `next-themes` with `ThemeProvider`.
- **Map viz**: Cartopy Robinson projection + Natural Earth features for static PNG; folium + MarkerCluster for interactive HTML. Conda env `new`.
- **Python**: `E:\\anaconda3\\envs\\new\\python.exe` (hardcoded in `api/map/route.ts`). Dependencies: cartopy, folium, geopandas, matplotlib, pandas. Cartopy installed via conda-forge.
- **CSV escaping**: Quotes doubled (`""`) for fields containing commas, quotes, or newlines.
- **Store**: Zustand manages conversation list + sidebar state only. AI SDK `useChat` manages messages.

## UI Design Patterns

- **ChatInput**: Modern pill-shaped container (rounded-2xl) with integrated + button (popover: Upload Image / Upload File), skill selector (Sparkles button with tool list), auto-growing textarea, send/stop button. Green emerald accent for send button.
- **Sidebar**: Collapsible with conversation list, per-conversation dropdown menu (Save JSON / Delete), theme toggle, new analysis button.
- **Save Conversation**: Exports full message history as JSON (includes AI SDK parts array). Implemented via `chatMessages` cache in Zustand store sync'd from `useChat` messages.
- **Tool Cards**: Collapsible (`ToolCard` component) with tool name, status icon (spinner for running, check for done), input/output rendering. Supports `searchSpecies`, `fetchAndClean`, `generateMap` tool types.
- **Image paste**: Clipboard API with local variable capture (fix: `ext` captured before async `reader.onload` to avoid undefined `items[i]` in closure).

## Installed Skills

| Skill | Purpose |
|-------|---------|
| `ai-sdk` | Vercel AI SDK reference (27.6K installs) |
| `agent-builder-vercel-sdk` | Agent building patterns |
| `frontend-design` | Production-grade UI |
| `vercel-react-best-practices` | React/Next.js patterns |
| `shadcn` | UI components |
| `web-design-guidelines` | Design review |
| `geospatial-data-pipeline` | GIS processing |
| `pandas-data-analysis` | Data analysis |
| `data-science-expert` | Data science |
