"use client";

import { Map } from "lucide-react";
import Image from "next/image";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { ToolCard } from "./ToolCard";
import type { GenerateMapOutput } from "@/lib/types";

export const GenerateMapTool = makeAssistantToolUI<
  { scientificNames: string | string[] },
  GenerateMapOutput
>({
  toolName: "generateMap",
  render: ({ args, result, status }) => {
    const isRunning = status.type === "running" || status.type === "requires-action";
    const names = Array.isArray(args.scientificNames) ? args.scientificNames : [args.scientificNames];
    const title = names.length > 1 ? "Generating comparison map" : `Generating map for ${names[0]}`;

    return (
      <ToolCard
        title={title}
        icon={<Map className="h-3.5 w-3.5" />}
        status={isRunning ? "running" : result?.success ? "result" : "error"}
      >
        {!result ? (
          <p className="text-muted-foreground py-1">Generating distribution map...</p>
        ) : result.success && result.mapUrl ? (
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden border bg-muted/20">
              <Image
                src={result.mapUrl}
                alt="Species distribution map"
                width={1200}
                height={800}
                className="w-full h-auto object-contain"
                unoptimized
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="tabular-nums">{result.count?.toLocaleString()} records</span>
              {result.center && (
                <span className="tabular-nums">
                  {result.center[0].toFixed(2)}°, {result.center[1].toFixed(2)}°
                </span>
              )}
              {result.htmlUrl && (
                <a
                  href={result.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Open interactive map →
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-destructive py-1">{result.error ?? "Map generation failed"}</p>
        )}
      </ToolCard>
    );
  },
});