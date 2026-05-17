"use client";

import { useRef, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Leaf, User, Loader2, Search, Database, Map, Check, ChevronDown, FileImage } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DataPreview } from "./DataPreview";
import type { UIMessage, ToolUIPart } from "ai";
import { useState } from "react";

// ---- Tool Card: collapsible card for each tool invocation ----
function ToolCard({
  toolName,
  icon: Icon,
  label,
  part,
}: {
  toolName: string;
  icon: typeof Search;
  label: string;
  part: ToolUIPart;
}) {
  const [open, setOpen] = useState(true);

  const isInputReady =
    part.state === "input-available" ||
    part.state === "output-available" ||
    part.state === "input-streaming";

  const isOutputReady = part.state === "output-available";

  return (
    <div className="my-2 rounded-lg border border-border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-muted/50 transition-colors"
      >
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left">{label}</span>
        <span className="shrink-0">
          {part.state === "input-streaming" ? (
            <Loader2 className="size-3 animate-spin text-primary" />
          ) : part.state === "input-available" ? (
            <Loader2 className="size-3 animate-spin text-amber-500" />
          ) : part.state === "output-available" ? (
            <Check className="size-3 text-emerald-500" />
          ) : (
            <Loader2 className="size-3 animate-spin text-muted-foreground" />
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-3 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && isInputReady && (
        <div className="px-3 pb-3 text-xs border-t border-border/50 pt-2 space-y-2">
          {isOutputReady && part.output ? (
            <ToolOutput toolName={toolName} output={part.output} />
          ) : isInputReady ? (
            <div className="text-muted-foreground italic">
              {part.state === "input-available"
                ? "Running..."
                : "Preparing..."}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ---- Tool-specific output renderers ----
function ToolOutput({
  toolName,
  output,
}: {
  toolName: string;
  output: unknown;
}) {
  const data = (output ?? {}) as Record<string, unknown>;

  switch (toolName) {
    case "searchSpecies": {
      if (!data.found) return <div className="text-destructive">{data.message as string}</div>;
      return (
        <div className="space-y-1">
          <div className="font-semibold text-sm">{data.scientificName as string}</div>
          <div className="text-muted-foreground">
            Rank: {String(data.rank)} · Match: {String(data.matchType)} ({Number(data.confidence)}%)
          </div>
          <div className="text-muted-foreground">
            {[data.kingdom, data.phylum, data.class, data.order, data.family, data.genus]
              .filter(Boolean)
              .join(" → ")}
          </div>
          {data.synonym ? (
            <div className="text-amber-600">Synonym — accepted: {String(data.acceptedName)}</div>
          ) : null}
        </div>
      );
    }

    case "fetchAndClean": {
      const flags = data.qualityFlags as Record<string, number> | undefined;
      const sources = data.sourceBreakdown as Record<string, number> | undefined;
      return (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            GBIF: {String((data.sources as Record<string, unknown> | undefined)?.gbif ?? "?")} records | iNaturalist: {String((data.sources as Record<string, unknown> | undefined)?.inaturalist ?? "?")} records
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded bg-muted/50 p-1.5">
              <div className="font-semibold text-sm">{data.total as number}</div>
              <div className="text-[10px] text-muted-foreground">Merged</div>
            </div>
            <div className="rounded bg-destructive/10 p-1.5">
              <div className="font-semibold text-sm text-destructive">{data.removed as number}</div>
              <div className="text-[10px] text-muted-foreground">Removed</div>
            </div>
            <div className="rounded bg-emerald-500/10 p-1.5">
              <div className="font-semibold text-sm text-emerald-600">{data.kept as number}</div>
              <div className="text-[10px] text-muted-foreground">Clean</div>
            </div>
          </div>
          {sources && Object.keys(sources).length > 0 && (
            <div className="text-xs text-muted-foreground space-y-0.5 border-t border-border/50 pt-1.5">
              <div className="font-medium text-[11px]">Per Source:</div>
              {Object.entries(sources).map(([source, count]) => (
                <div key={source} className="flex justify-between"><span>{source}</span><span className="font-medium">{count} records</span></div>
              ))}
            </div>
          )}
          {flags && Object.keys(flags).length > 0 && (
            <div className="text-xs text-muted-foreground space-y-0.5 border-t border-border/50 pt-1.5">
              <div className="font-medium text-[11px]">Quality Flags:</div>
              {Object.entries(flags).map(([flag, count]) => (
                <div key={flag} className="flex justify-between"><span>⚠️ {flag.replace(/^gbif_/, "").replace(/_/g, " ")}</span><span className="font-medium">{count}</span></div>
              ))}
            </div>
          )}
          {!!data.sample && Array.isArray(data.sample) && data.sample.length > 0 && (
            <DataPreview
              data={{
                type: "csv",
                filename: `${String(data.scientificName || "species")}_cleaned.csv`,
                headers: Object.keys(data.sample[0] as Record<string, unknown>),
                rows: (data.sample as Record<string, unknown>[]).map((r) => Object.keys(r).map((k) => String(r[k] ?? ""))),
                summary: `${String(data.kept)} cleaned records`,
              }}
            />
          )}
        </div>
      );
    }

    case "generateMap": {
      if (!data.success) {
        return <div className="text-destructive">{String(data.error)}</div>;
      }
      return (
        <div className="space-y-2">
          {data.mapUrl != null && (
            <img
              src={String(data.mapUrl)}
              alt="Distribution map"
              className="max-w-full rounded-lg border border-border shadow-sm"
              loading="lazy"
            />
          )}
          <div className="text-muted-foreground">
            {String(data.count)} records visualized
          </div>
        </div>
      );
    }

    default:
      return (
        <pre className="text-[10px] text-muted-foreground overflow-auto max-h-32">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
  }
}

// ---- Message bubble ----
function MessageBubble({
  msg,
  status,
}: {
  msg: UIMessage;
  status?: string;
}) {
  const isUser = msg.role === "user";
  const isLoading = !isUser && msg.parts.length === 0 && status === "streaming";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3 animate-in fade-in slide-in-from-bottom-2",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <Avatar
        className={cn(
          "size-8 shrink-0",
          isUser
            ? "bg-accent text-accent-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        <AvatarFallback>
          {isUser ? <User className="size-4" /> : <Leaf className="size-4" />}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-md"
            : "bg-card border border-border rounded-tl-md",
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            <span className="text-xs">Thinking…</span>
          </div>
        ) : isUser ? (
          <UserMessageParts msg={msg} />
        ) : (
          <AssistantMessageParts msg={msg} />
        )}
      </div>
    </div>
  );
}

// ---- User message: text + files ----
function UserMessageParts({ msg }: { msg: UIMessage }) {
  return (
    <div className="space-y-2">
      {msg.parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.text}</span>;
        }
        if (part.type === "file" && part.mediaType?.startsWith("image/")) {
          return (
            <img
              key={i}
              src={part.url}
              alt={part.filename || "Attached"}
              className="max-h-48 max-w-full rounded-lg border border-border/30 object-cover"
            />
          );
        }
        if (part.type === "file") {
          return (
            <div key={i} className="flex items-center gap-1.5 text-xs opacity-70">
              <FileImage className="size-3" />
              {part.filename}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

// ---- Assistant message: text + tool cards ----
function AssistantMessageParts({ msg }: { msg: UIMessage }) {
  return (
    <div className="space-y-1">
      {msg.parts.map((part, i) => {
        const key = `${msg.id}-${i}`;

        // Text parts → markdown
        if (part.type === "text") {
          return (
            <div key={key} className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ src, alt }) => (
                    <span className="block my-3">
                      <img
                        src={src}
                        alt={alt || ""}
                        className="max-w-full rounded-lg border border-border shadow-sm"
                        loading="lazy"
                      />
                      {alt && !alt?.startsWith("Pasted") && (
                        <span className="block text-center text-xs text-muted-foreground mt-1">
                          {alt}
                        </span>
                      )}
                    </span>
                  ),
                }}
              >
                {part.text}
              </ReactMarkdown>
            </div>
          );
        }

        // Reasoning parts
        if (part.type === "reasoning") {
          return (
            <details key={key} className="text-xs">
              <summary className="text-muted-foreground cursor-pointer">
                Reasoning
              </summary>
              <pre className="mt-1 text-[10px] text-muted-foreground whitespace-pre-wrap">
                {part.text}
              </pre>
            </details>
          );
        }

        // Tool parts
        if (part.type === "tool-searchSpecies") {
          return (
            <ToolCard
              key={key}
              toolName="searchSpecies"
              icon={Search}
              label="Searching taxonomy"
              part={part}
            />
          );
        }

        if (part.type === "tool-fetchAndClean") {
          return (
            <ToolCard
              key={key}
              toolName="fetchAndClean"
              icon={Database}
              label="Fetching & cleaning data"
              part={part}
            />
          );
        }

        if (part.type === "tool-generateMap") {
          return (
            <ToolCard
              key={key}
              toolName="generateMap"
              icon={Map}
              label="Generating distribution map"
              part={part}
            />
          );
        }

        // File parts (images from model)
        if (part.type === "file" && part.mediaType?.startsWith("image/")) {
          return (
            <img
              key={key}
              src={part.url}
              alt={part.filename || "Generated"}
              className="max-w-full rounded-lg border border-border shadow-sm"
              loading="lazy"
            />
          );
        }

        return null;
      })}
    </div>
  );
}

// ---- Container ----
export function MessageList({
  messages,
  status,
  error,
}: {
  messages: UIMessage[];
  status: string;
  error?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      const el = viewportRef.current;
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages.length]);

  return (
    <div ref={viewportRef} className="flex-1 overflow-y-auto">
      <div className="flex flex-col py-4">
        {/* Welcome message when empty */}
        {messages.length === 0 && (
          <div className="px-4 py-3">
            <div className="rounded-xl px-4 py-2.5 text-sm leading-relaxed bg-card border border-border">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  Welcome to <strong>EcoQ</strong> — your AI-powered species distribution data
                  assistant.
                </p>
                <p>Just tell me which species you need, and I'll:</p>
                <ul>
                  <li>🔍 <strong>Search</strong> GBIF taxonomy</li>
                  <li>📊 <strong>Fetch</strong> occurrence data from GBIF + iNaturalist</li>
                  <li>🧹 <strong>Clean</strong> coordinates, remove duplicates, flag quality issues</li>
                  <li>🗺️ <strong>Generate</strong> a distribution map</li>
                </ul>
                <p>
                  <strong>Try it</strong> — type a scientific name like{" "}
                  <code>Panthera tigris</code> or say "Show me snow leopard distribution".
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} status={status} />
        ))}

        {/* Error display */}
        {error && (
          <div className="px-4 py-3">
            <div className="rounded-xl px-4 py-2.5 text-sm bg-destructive/10 border border-destructive/30 text-destructive">
              ⚠️ {error}
            </div>
          </div>
        )}

        <div className="h-4 shrink-0" />
      </div>
    </div>
  );
}
