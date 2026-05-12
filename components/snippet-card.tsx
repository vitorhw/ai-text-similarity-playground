"use client"

import { useState } from "react"
import type { Snippet, SimilarityScore } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Pencil, Trash2, Check, X } from "lucide-react"

interface SnippetCardProps {
  snippet: Snippet
  similarity?: SimilarityScore
  onDelete: (id: string) => void
  onEdit: (id: string, content: string) => void
}

const METRIC_ABBR: { key: keyof Omit<SimilarityScore, "snippetId">; label: string }[] = [
  { key: "jaccard", label: "Lex" },
  { key: "posTfIsfCosine", label: "Struct" },
  { key: "sbertCosine", label: "Sem" },
  { key: "aspectSentimentMatch", label: "Sent" },
]

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function SnippetCard({ snippet, similarity, onDelete, onEdit }: SnippetCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(snippet.content)

  const handleSave = () => {
    if (!editContent.trim()) return
    onEdit(snippet.id, editContent)
    setIsEditing(false)
  }
  const handleCancel = () => {
    setEditContent(snippet.content)
    setIsEditing(false)
  }

  return (
    <div className="py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(snippet.createdAt)}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isEditing ? (
            <>
              <Button size="sm" variant="ghost" onClick={handleSave} className="h-6 w-6 p-0" title="Save">
                <Check className="h-3.5 w-3.5 text-green-600" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} className="h-6 w-6 p-0" title="Cancel">
                <X className="h-3.5 w-3.5 text-red-600" />
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-6 w-6 p-0" title="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(snippet.id)}
                className="h-6 w-6 p-0 hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="min-h-[100px] max-h-[300px] overflow-y-auto font-mono text-sm"
        />
      ) : (
        <>
          <p className="text-xs font-mono text-foreground/90 line-clamp-3 whitespace-pre-wrap break-words">
            {snippet.content}
          </p>
          {similarity && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
              {METRIC_ABBR.map(({ key, label }) => (
                <span key={key}>
                  {label} <span className="font-medium text-foreground/80">{Math.round(similarity[key] * 100)}%</span>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
