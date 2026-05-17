"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table2,
  ChevronLeft,
  ChevronRight,
  Map,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DataPreview as DataPreviewType } from "@/lib/types";

interface DataPreviewProps {
  data: DataPreviewType;
}

export function DataPreview({ data }: DataPreviewProps) {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const totalPages = Math.ceil(data.rows.length / pageSize);
  const pageRows = data.rows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <Card className="mt-3 border border-border bg-background/50 overflow-hidden">
      <CardHeader className="py-2 px-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Table2 className="size-3.5 text-muted-foreground" />
          <CardTitle className="text-xs font-medium">
            {data.filename}
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">
            {data.rows.length} rows × {data.headers.length} cols
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="size-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {page + 1}/{Math.max(totalPages, 1)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="size-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-y border-border bg-muted/30">
                {data.headers.map((h) => (
                  <th
                    key={h}
                    className="px-3 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-b border-border/50",
                    i % 2 === 0 && "bg-muted/15",
                  )}
                >
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="px-3 py-1 whitespace-nowrap max-w-[200px] truncate"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-3 py-1.5 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Map className="size-3" />
            {data.type === "geojson" ? "GeoJSON" : "Tabular"}
          </span>
          <span>{data.summary}</span>
        </div>
      </CardContent>
    </Card>
  );
}
