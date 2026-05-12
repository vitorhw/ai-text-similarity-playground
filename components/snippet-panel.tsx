"use client"

import { useState } from "react"
import type { Snippet, SimilarityScore, SimilarityStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SnippetCard } from "./snippet-card"
import { SimilarityMetrics } from "./similarity-metrics"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ChevronDown, ChevronRight, Plus } from "lucide-react"

interface SnippetPanelProps {
  snippets: Snippet[]
  similarities: SimilarityScore[]
  similarityStatus: SimilarityStatus
  similarityError?: string
  editorText: string
  onAddSnippet: (content: string) => void
  onDeleteSnippet: (id: string) => void
  onEditSnippet: (id: string, content: string) => void
}

export function SnippetPanel({
  snippets,
  similarities,
  similarityStatus,
  similarityError,
  editorText,
  onAddSnippet,
  onDeleteSnippet,
  onEditSnippet,
}: SnippetPanelProps) {
  const [newSnippet, setNewSnippet] = useState("")
  const [isAddSnippetOpen, setIsAddSnippetOpen] = useState(false)
  const [snippetsExpanded, setSnippetsExpanded] = useState(false)
  const [isAnimationComplete, setIsAnimationComplete] = useState(false)

  const handleAddSnippet = () => {
    if (!newSnippet.trim()) return
    onAddSnippet(newSnippet)
    setNewSnippet("")
    setIsAddSnippetOpen(false)
  }

  const handleToggleSnippets = () => {
    if (snippetsExpanded) {
      setIsAnimationComplete(false)
      setSnippetsExpanded(false)
    } else {
      setSnippetsExpanded(true)
      setTimeout(() => setIsAnimationComplete(true), 150)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-2">
      <div className="flex-shrink-0 glass-strong rounded-3xl shadow-lg p-1">
        <SimilarityMetrics
          similarities={similarities}
          status={similarityStatus}
          error={similarityError}
          editorText={editorText}
          snippets={snippets}
        />
      </div>

      <div
        className={`glass-strong rounded-3xl shadow-lg flex flex-col p-1 ${snippetsExpanded ? "flex-1 min-h-0" : "flex-shrink-0"}`}
      >
        <div className="flex-shrink-0 flex items-center gap-2 pr-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleSnippets}
            className="flex-1 justify-start gap-1.5 h-auto px-4 py-3 rounded-none hover:bg-muted/50"
          >
            {snippetsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="text-sm font-semibold">Snippets ({snippets.length})</span>
          </Button>

          <Dialog open={isAddSnippetOpen} onOpenChange={setIsAddSnippetOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 px-3 gap-1.5 flex-shrink-0">
                <Plus className="h-4 w-4" />
                <span className="text-xs">Add Snippet</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New snippet</DialogTitle>
                <DialogDescription>
                  Paste an AI response (or any text) to compare your draft against.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                <Label htmlFor="snippet-content">Content</Label>
                <Textarea
                  id="snippet-content"
                  value={newSnippet}
                  onChange={(e) => setNewSnippet(e.target.value)}
                  placeholder="Paste or type the snippet here…"
                  className="min-h-[120px] max-h-[300px] overflow-y-auto font-mono"
                />
              </div>
              <Button onClick={handleAddSnippet} className="w-full">
                Add snippet
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        <div
          className={`grid transition-all duration-150 ease-in-out ${snippetsExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className="overflow-hidden min-h-0">
            <div className={`min-h-0 ${snippetsExpanded && isAnimationComplete ? "overflow-y-auto" : "overflow-hidden"}`}>
              <div className="px-3 pb-3 pt-2 space-y-2">
                {snippets.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No snippets yet — add one to start comparing.
                  </p>
                ) : (
                  snippets.map((snippet) => (
                    <SnippetCard
                      key={snippet.id}
                      snippet={snippet}
                      similarity={similarities.find((s) => s.snippetId === snippet.id)}
                      onDelete={onDeleteSnippet}
                      onEdit={onEditSnippet}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
