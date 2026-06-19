"use client";

import { Search } from "lucide-react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { ToolCard } from "./ToolCard";
import type { SearchSpeciesOutput } from "@/lib/types";

export const SearchSpeciesTool = makeAssistantToolUI<
  { name: string },
  SearchSpeciesOutput
>({
  toolName: "searchSpecies",
  render: ({ result, status }) => {
    const data = result ?? undefined;
    const isRunning = status.type === "running" || status.type === "requires-action";

    return (
      <ToolCard
        title={data?.found ? `Species: ${data.scientificName}` : "Searching GBIF taxonomy..."}
        icon={<Search className="h-3.5 w-3.5" />}
        status={isRunning ? "running" : data?.found ? "result" : "error"}
      >
        {data?.found ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm py-1">
            <dt className="text-muted-foreground font-medium">Scientific name</dt>
            <dd className="font-semibold">{data.scientificName}</dd>
            <dt className="text-muted-foreground font-medium">Canonical name</dt>
            <dd>{data.canonicalName}</dd>
            <dt className="text-muted-foreground font-medium">Rank</dt>
            <dd className="capitalize">{data.rank}</dd>
            <dt className="text-muted-foreground font-medium">Match confidence</dt>
            <dd>
              <span className={(data.confidence ?? 0) >= 90 ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>
                {data.confidence}%
              </span>
            </dd>
            <dt className="text-muted-foreground font-medium">Match type</dt>
            <dd>{data.matchType}</dd>
            {data.synonym && (
              <>
                <dt className="text-muted-foreground font-medium">Synonym</dt>
                <dd>
                  Yes {data.acceptedName ? `(accepted: ${data.acceptedName})` : ""}
                </dd>
              </>
            )}
          </dl>
        ) : (
          <p className="text-muted-foreground py-1">{data?.message ?? "Searching..."}</p>
        )}
      </ToolCard>
    );
  },
});