# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) and other AI agents when working with code in this repository.

## Project Overview

EcoQ is an AI-powered species distribution data assistant. The full pipeline:
1. **AI Agent** (Vercel AI SDK `streamText` + `tool()`) orchestrates the workflow with a goal-oriented prompt and typed tool outputs
2. Multi-source species occurrence data fetching (GBIF + iNaturalist, all records, no truncation)
3. Automated data cleaning (coordinate validation, deduplication, quality flagging)
4. Map visualization (Python Cartopy + folium → publication-quality PNG + interactive HTML; supports single and multi-species maps)
5. Chat-based web interface with streaming, assistant-ui Thread/Composer, file upload, and custom tool UIs

## Architecture

```
User types species name / pastes image / uploads file
  → ChatArea.tsx (assistant-ui runtime via @assistant-ui/react-ai-sdk)
    → /api/chat (streamText + tool() + toUIMessageStreamResponse)
      → Anthropic-compatible LLM (DeepSeek V4 Pro via api.deepseek.com/anthropic)
      → Tools (defined in lib/agent-tools.ts):
        - searchSpecies   → GBIF species/match
        - fetchAndClean   → GBIF + iNaturalist (parallel, supports single or multi-species)
                            → SessionCache (LRU + TTL, scoped by conversation)
                            → Cleaner (coordinate validation, dedup)
        - generateMap     → lib/map-runner → Python Cartopy + folium
        - searchNews      → NewsAPI context articles
    → Custom tool UIs (assistant-ui makeAssistantToolUI) render search/fetch/map/news cards
    → Map image displayed inline with link to interactive HTML
```

**Key architectural decisions**:
- Raw occurrence records are stored in a server-side `SessionCache` (LRU + TTL, keyed by conversation + species). The LLM only receives summary metadata (counts, source breakdown, quality flags) and a small sample. This prevents data truncation and ensures all fetched records are processed.
- The agent prompt is goal-oriented, not a hardcoded chain. The LLM can call tools in parallel and can compare multiple species by passing arrays to `fetchAndClean`/`generateMap`.
- Map generation is invoked directly via `lib/map-runner.ts` (no internal HTTP round-trip). The Python interpreter path is configurable via `PYTHON_PATH` env variable.
- The chat UI is built on assistant-ui primitives (`useChatRuntime`, `Thread`, `Composer`) with custom tool renderers.

## Project Structure

```
E:\ChatQ\
├── .env.local                         # Environment config (ANTHROPIC_BASE_URL, ANTHROPIC_MODEL, ANTHROPIC_AUTH_TOKEN, NEWSAPI_API_KEY, PYTHON_PATH)
├── package.json                       # Next.js 16 web app
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts                   # Vitest test runner
├── .prettierrc.json                   # Prettier config
├── requirements.txt                   # Python dependencies
├── environment.yml                    # Conda environment spec
├── research/                          # Research documents
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts          # AI Agent API (streamText + tools)
│   │   ├── api/map/route.ts           # Map generation HTTP endpoint (uses map-runner)
│   │   └── globals.css                # OKLCH nature theme
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatArea.tsx           # assistant-ui runtime provider + Thread
│   │   │   ├── Sidebar.tsx            # Conversation sidebar
│   │   │   └── tools/                 # Custom assistant-ui tool UIs
│   │   │       ├── ToolCard.tsx
│   │   │       ├── SearchSpeciesTool.tsx
│   │   │       ├── FetchAndCleanTool.tsx
│   │   │       ├── GenerateMapTool.tsx
│   │   │       └── SearchNewsTool.tsx
│   │   └── ui/                        # shadcn/ui v4 (@base-ui/react)
│   └── lib/
│       ├── agent-tools.ts             # Tool definitions + typed schemas
│       ├── session-cache.ts           # Server-side LRU cache for raw records
│       ├── map-runner.ts              # Direct Python map invocation
│       ├── attachment-adapter.ts      # assistant-ui attachment adapter (images + text files)
│       ├── env.ts                     # Zod environment validation
│       ├── gbif.ts                    # GBIF API client
│       ├── inaturalist.ts             # iNaturalist API client
│       ├── cleaner.ts                 # Data cleaning engine
│       ├── store.ts                   # Zustand (conversations only)
│       ├── types.ts                   # TypeScript types (tool outputs, etc.)
│       └── utils.ts                   # cn() utility
├── scripts/
│   └── map_viz.py                     # Cartopy + folium map script (single + multi-species)
├── public/
│   └── maps/                          # Generated map images
└── skills/                            # Codex Skills (project skill package)
```

## Commands

```bash
# Development
npm run dev        # http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # TypeScript check
npm run test       # Vitest tests
npm run format     # Prettier format

# Map visualization (requires conda env "new" or PYTHON_PATH env var)
E:\anaconda3\envs\new\python.exe scripts/map_viz.py --csv data.csv --species "Panthera tigris" --output-dir public/maps
E:\anaconda3\envs\new\python.exe scripts/map_viz.py --csv data.csv --species-column scientificName --output-dir public/maps
```

## Key Technical Notes

- **AI SDK v6**: `streamText()` + `tool()` + `toUIMessageStreamResponse()`. Provider: `createAnthropic()` with custom `baseURL` for DeepSeek. Model: `deepseek-v4-pro`.
- **Client**: assistant-ui runtime via `@assistant-ui/react-ai-sdk` (`useChatRuntime` + `DefaultChatTransport`). `Thread` and `Composer` from `@assistant-ui/react-ui`. Custom tool UIs via `makeAssistantToolUI`.
- **Server-side cache**: `SessionCache` (LRU + TTL, conversation-scoped) stores full records. LLM only receives summary metadata. Per-species keys + combined keys for multi-species comparisons.
- **Agent prompt**: Goal-oriented; LLM decides tool order and can call independent tools in parallel.
- **Multi-species**: `fetchAndClean` accepts `scientificNames: string | string[]`. `generateMap` accepts multiple names and produces color-coded multi-species maps.
- **GBIF pagination**: `fetchAllOccurrences()` paginates up to 2000 records (GBIF API caps at 300/page, 7 pages max). iNaturalist: 200 records (API limit). All quality grades included, no filter.
- **GBIF confidence**: API returns integer 0–100 (not 0–1). `searchSpecies` tool passes raw value as `confidence: Math.round(match.confidence)`.
- **shadcn/ui v4**: Uses `@base-ui/react` (not Radix). Dropdown triggers use `render` prop, not `asChild`.
- **Toast**: `sonner`.
- **Theme**: CSS variables OKLCH, `next-themes` with `ThemeProvider`.
- **Map viz**: Cartopy Robinson projection + Natural Earth features for static PNG; folium + MarkerCluster + LayerControl for interactive HTML. Multi-species maps use a colorblind-friendly palette and per-species layers/clusters.
- **Python**: Path resolved from `PYTHON_PATH` env var, falling back to `python`/`python3` and the legacy Anaconda path. Dependencies listed in `requirements.txt` / `environment.yml`.
- **CSV escaping**: Quotes doubled (`""`) for fields containing commas, quotes, or newlines.
- **Store**: Zustand manages conversation list + sidebar state only. assistant-ui runtime manages messages; they are synced to Zustand for JSON export.
- **Testing**: Vitest for unit tests on `cleaner.ts` and `session-cache.ts`.
- **Environment validation**: `src/lib/env.ts` validates required env vars with Zod at startup.

## UI Design Patterns

- **ChatArea**: Wraps assistant-ui `AssistantRuntimeProvider` and renders `Thread` + custom tool UIs. Conversation-scoped runtime via `id` and injected `conversationId` body.
- **Sidebar**: Collapsible with conversation list, per-conversation dropdown menu (Save JSON / Delete), theme toggle, new analysis button. Uses base-ui `DropdownMenuTrigger` with `render` prop for accessibility.
- **Save Conversation**: Exports full message history as JSON from the Zustand `chatMessages` cache.
- **Tool Cards**: Custom assistant-ui tool UIs (`ToolCard`) with collapsible body, status icon, and tool-specific output rendering for `searchSpecies`, `fetchAndClean`, `generateMap`, `searchNews`.
- **File upload**: Handled by assistant-ui Composer + `EcoQAttachmentAdapter` (images as data URLs, text/CSV/GeoJSON as file parts).

## Installed Skills

| Skill | Purpose |
|-------|---------|
| `ai-sdk` | Vercel AI SDK reference |
| `agent-builder-vercel-sdk` | Agent building patterns |
| `frontend-design` | Production-grade UI |
| `vercel-react-best-practices` | React/Next.js patterns |
| `next-best-practices` | Next.js latest practices |
| `vercel-composition-patterns` | React composition patterns |
| `shadcn` | UI components |
| `web-design-guidelines` | Design review |
| `geospatial-data-pipeline` | GIS processing |
| `pandas-data-analysis` | Data analysis |
| `data-science-expert` | Data science |
