"use client";

import { ChevronDown, ChevronUp, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  title: string;
  icon: React.ReactNode;
  status: "running" | "result" | "error";
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function ToolCard({
  title,
  icon,
  status,
  children,
  defaultOpen = true,
}: ToolCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "my-2 rounded-xl border transition-all duration-200",
        status === "running" && "border-primary/30 bg-primary/[0.02]",
        status === "result" && "border-border/80 bg-card",
        status === "error" && "border-destructive/40 bg-destructive/[0.02]",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={cn(
              "flex-shrink-0 size-6 rounded-md flex items-center justify-center",
              status === "running" && "bg-primary/10 text-primary",
              status === "result" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              status === "error" && "bg-destructive/10 text-destructive",
            )}
          >
            {icon}
          </span>
          <span className="font-medium text-sm truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {status === "running" && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          )}
          {status === "result" && (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-sm border-t border-border/40">
          {children}
        </div>
      )}
    </div>
  );
}