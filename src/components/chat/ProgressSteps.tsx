"use client";

import { cn } from "@/lib/utils";
import { Check, Loader2, X, ChevronRight } from "lucide-react";
import type { ProgressStep } from "@/lib/types";

interface ProgressStepsProps {
  steps: ProgressStep[];
}

export function ProgressSteps({ steps }: ProgressStepsProps) {
  if (steps.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2.5">
      <div className="flex flex-col gap-1">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-2 text-xs py-0.5 transition-all duration-300",
              step.status === "running"
                ? "text-foreground font-medium"
                : step.status === "done"
                  ? "text-muted-foreground"
                  : step.status === "error"
                    ? "text-destructive"
                    : "text-muted-foreground/60",
            )}
          >
            <span className="shrink-0">
              {step.status === "running" && (
                <Loader2 className="size-3 animate-spin text-primary" />
              )}
              {step.status === "done" && (
                <Check className="size-3 text-emerald-500" />
              )}
              {step.status === "error" && (
                <X className="size-3 text-destructive" />
              )}
              {step.status === "pending" && (
                <ChevronRight className="size-3" />
              )}
            </span>
            <span className="leading-tight">{step.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
