"use client";

import { Database } from "lucide-react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { ToolCard } from "./ToolCard";
import type { FetchAndCleanOutput, MultiSpeciesFetchOutput } from "@/lib/types";

function SingleSpeciesView({ data }: { data: FetchAndCleanOutput }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Metric label="Total" value={data.total} variant="default" />
        <Metric label="Kept" value={data.kept} variant="success" />
        <Metric label="Removed" value={data.removed} variant={data.removed > 0 ? "warning" : "default"} />
        <Metric label="GBIF" value={data.sources.gbif} variant="default" />
      </div>

      {Object.keys(data.removalReasons).length > 0 && (
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Removal reasons
          </h4>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {Object.entries(data.removalReasons).map(([reason, count]) => (
              <div key={reason} className="flex justify-between items-baseline">
                <dt className="text-muted-foreground capitalize text-xs">{reason.replace(/_/g, " ")}</dt>
                <dd className="font-medium tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {Object.keys(data.qualityFlags).length > 0 && (
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quality flags
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(data.qualityFlags).map(([flag, count]) => (
              <span
                key={flag}
                className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-300"
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

function Metric({ label, value, variant }: { label: string; value: number; variant: "default" | "success" | "warning" }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</div>
      <div className={`text-lg font-semibold tabular-nums mt-0.5 ${
        variant === "success" ? "text-emerald-600 dark:text-emerald-400" :
        variant === "warning" ? "text-amber-600 dark:text-amber-400" : ""
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
        icon={<Database className="h-3.5 w-3.5" />}
        status={isRunning ? "running" : "result"}
      >
        {!result ? (
          <p className="text-muted-foreground py-1">Fetching and cleaning occurrence records...</p>
        ) : "mode" in result && result.mode === "multi" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Metric label="Species" value={result.speciesCount} variant="default" />
              <Metric label="Total records" value={result.totalRecords} variant="default" />
            </div>
            <div className="space-y-3">
              {result.perSpecies.map((species) => (
                <div key={species.scientificName} className="rounded-lg border p-3.5 bg-muted/20">
                  <h4 className="mb-2.5 font-medium text-sm italic">{species.scientificName}</h4>
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