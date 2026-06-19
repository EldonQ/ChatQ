"use client";

import { Newspaper } from "lucide-react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { ToolCard } from "./ToolCard";
import type { SearchNewsOutput } from "@/lib/types";

export const SearchNewsTool = makeAssistantToolUI<
  { scientificName: string; commonName?: string },
  SearchNewsOutput
>({
  toolName: "searchNews",
  render: ({ result, status }) => {
    const isRunning = status.type === "running" || status.type === "requires-action";

    return (
      <ToolCard
        title={result?.success ? `News — ${result.returned} articles` : "Searching news..."}
        icon={<Newspaper className="h-3.5 w-3.5" />}
        status={isRunning ? "running" : result?.success ? "result" : "error"}
      >
        {!result ? (
          <p className="text-muted-foreground py-1.5">Searching NewsAPI for recent articles...</p>
        ) : result.success && result.articles ? (
          <div className="space-y-2">
            {result.articles.map((article, idx) => (
              <article
                key={idx}
                className="rounded-lg border border-border/40 p-2.5 hover:bg-muted/25 transition-colors"
              >
                <h4 className="font-medium leading-snug text-[13px]">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary hover:underline underline-offset-2"
                  >
                    {article.title}
                  </a>
                </h4>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="font-medium">{article.source}</span>
                  {article.publishedAt && (
                    <>
                      <span className="text-border">·</span>
                      <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
                {article.description && (
                  <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                    {article.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-destructive py-1.5 text-xs">{result.error ?? "News search failed"}</p>
        )}
      </ToolCard>
    );
  },
});
