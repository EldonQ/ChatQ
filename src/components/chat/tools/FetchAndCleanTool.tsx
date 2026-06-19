"use client";

import { Database } from "lucide-react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { ToolCard } from "./ToolCard";
import type { FetchAndCleanOutput, MultiSpeciesFetchOutput } from "@/lib/types";

function SingleSpeciesView({ data }: { data: FetchAndCleanOutput }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <Metric label="Total" value={data.total} />
        <Metric label="Kept" value={data.kept} tone="success" />
        <Metric label="Removed" value={data.removed} tone={data.removed > 0 ? "warning" : "default"} />
        <Metric label="iNaturalist" value={data.sources.inaturalist} />
      </div>

      {Object.keys(data.removalReasons).length > 0 && (
        <div>
          <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 font-mono">
            Removal reasons
          </h4>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(data.removalReasons).map(([reason, count]) => (
              <div key={reason} className="flex justify-between items-baseline">
                <dt className="text-muted-foreground capitalize text-[11px]">{reason.replace(/_/g, " ")}</dt>
                <dd className="font-medium tabular-nums text-[11px] font-mono">{count}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {Object.keys(data.qualityFlags).length > 0 && (
        <div>
          <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 font-mono">
            Quality flags
          </h4>
          <div className="flex flex-wrap gap-1">
            {Object.entries(data.qualityFlags).map(([flag, count]) => (
              <span
                key={flag}
                className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-300"
              >
                {flag.replace(/_/g, " ")} ({count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "warning" }) {
  return (
    <div className="rounded border border-border/40 bg-muted/20 px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium font-mono">{label}</div>
      <div className={`text-sm font-semibold tabular-nums mt-0.5 font-mono ${
        tone === "success" ? "text-emerald-600 dark:text-emerald-400" :
        tone === "warning" ? "text-amber-600 dark:text-amber-400" : ""
      }`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

export const FetchAndCleanTool = makeAssistantToolUI<
  { scientificNames: string | string[] },
  FetchAndCleanOutput | MultiSpeciesFetchOutput
>({
  toolName: "fetchAndClean",
  render: ({ args, result, status }) => {
    const isRunning = status.type === "running" || status.type === "requires-action";
    const names = Array.isArray(args.scientificNames) ? args.scientificNames : [args.scientificNames];
    const title = names.length > 1 ? `Fetching ${names.length} species` : `Fetching ${names[0]}`;

    return (
      <ToolCard
        title={title}
        icon={<Database className="h-3 w-3" />}
        status={isRunning ? "running" : "result"}
      >
        {!result ? (
          <p className="text-muted-foreground py-1.5">Fetching from GBIF + iNaturalist, cleaning coordinates...</p>
        ) : "mode" in result && result.mode === "multi" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <Metric label="Species" value={result.speciesCount} />
              <Metric label="Total records" value={result.totalRecords} />
            </div>
            <div className="space-y-2">
              {result.perSpecies.map((species) => (
                <div key={species.scientificName} className="rounded border border-border/40 p-2 bg-muted/15">
                  <h4 className="mb-1.5 font-medium text-xs italic">{species.scientificName}</h4>
                  <SingleSpeciesView data={species} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <SingleSpeciesView data={result as FetchAndCleanOutput} />
        )}
      </ToolCard>
    );
  },
});
