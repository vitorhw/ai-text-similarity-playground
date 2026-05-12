"use client"

import { useState } from "react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { SimilarityScore, SimilarityStatus, Snippet } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Type,
  GitCompareArrows,
  Network,
  SmilePlus,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SimilarityMetricsProps {
  similarities: SimilarityScore[]
  status: SimilarityStatus
  error?: string
  editorText: string
  snippets: Snippet[]
}

/**
 * The four similarity metrics. Values are computed by the Python similarity
 * service; this component shows the average across the currently-listed snippets.
 */
const METRICS = [
  {
    key: "jaccard" as const,
    label: "Lexical overlap",
    formalName: "Jaccard similarity",
    description: "How much exact vocabulary you share with the snippet.",
    icon: Type,
    iconClass: "text-blue-600",
    barClass: "bg-blue-600",
  },
  {
    key: "posTfIsfCosine" as const,
    label: "Structural alignment",
    formalName: "POS TF-ISF cosine",
    description: "How much your word stems and parts of speech overlap.",
    icon: GitCompareArrows,
    iconClass: "text-purple-600",
    barClass: "bg-purple-600",
  },
  {
    key: "sbertCosine" as const,
    label: "Semantic alignment",
    formalName: "SBERT (RoBERTa) cosine",
    description: "How close the overall meaning is, even with different words.",
    icon: Network,
    iconClass: "text-emerald-600",
    barClass: "bg-emerald-600",
  },
  {
    key: "aspectSentimentMatch" as const,
    label: "Sentiment alignment",
    formalName: "Aspect sentiment match",
    description: "How well your sentences' tone (positive / negative / neutral) matches.",
    icon: SmilePlus,
    iconClass: "text-amber-600",
    barClass: "bg-amber-600",
  },
]

export function SimilarityMetrics({ similarities, status, error, editorText, snippets }: SimilarityMetricsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(METRICS.map((m) => [m.key, true])),
  )

  const count = similarities.length || 1
  const averages = METRICS.reduce(
    (acc, m) => {
      acc[m.key] = similarities.reduce((sum, s) => sum + (s[m.key] ?? 0), 0) / count
      return acc
    },
    {} as Record<(typeof METRICS)[number]["key"], number>,
  )

  const getScoreColor = (value: number) => {
    if (value >= 0.7) return "text-green-600"
    if (value >= 0.4) return "text-amber-600"
    return "text-red-600"
  }

  if (!editorText.trim()) {
    return (
      <div className="px-4 py-6 text-center">
        <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Start typing to see analysis</p>
      </div>
    )
  }

  if (snippets.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">No snippets to compare</p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="px-4 py-6 text-center">
        <AlertCircle className="h-10 w-10 mx-auto mb-2 text-destructive" />
        <p className="text-xs font-medium text-destructive">Couldn&apos;t compute similarity</p>
        <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
          {error ?? "The similarity service is unavailable."}
        </p>
      </div>
    )
  }

  const showSkeleton = status === "loading" && similarities.length === 0
  if (showSkeleton || (status === "idle" && similarities.length === 0)) {
    return (
      <div className="px-4 py-6 text-center">
        {showSkeleton ? (
          <>
            <Loader2 className="h-10 w-10 mx-auto mb-2 text-muted-foreground animate-spin" />
            <p className="text-xs text-muted-foreground">Computing similarity…</p>
          </>
        ) : (
          <>
            <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Start typing to see analysis</p>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="px-4 py-3 space-y-3">
        {status === "loading" && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Updating…
          </div>
        )}

        {METRICS.map((metric) => {
          const Icon = metric.icon
          const value = averages[metric.key] ?? 0
          const isOpen = expanded[metric.key]
          return (
            <div key={metric.key} className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((prev) => ({ ...prev, [metric.key]: !prev[metric.key] }))}
                className="w-full justify-between h-auto p-0 hover:bg-transparent"
              >
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", metric.iconClass)} strokeWidth={2.5} />
                        <span className="text-sm font-semibold">{metric.label}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{metric.formalName}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex items-center gap-2">
                  <span className={cn("text-lg font-bold", getScoreColor(value))}>{(value * 100).toFixed(0)}%</span>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </Button>

              {isOpen && (
                <div className="space-y-2.5 pl-6">
                  <div className="text-xs text-muted-foreground leading-relaxed">{metric.description}</div>
                  <Progress value={value * 100} className="h-1.5" indicatorClassName={metric.barClass} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
