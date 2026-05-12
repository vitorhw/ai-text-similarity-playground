"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { TextEditor } from "@/components/text-editor"
import { SnippetPanel } from "@/components/snippet-panel"
import type { Snippet, SimilarityState } from "@/lib/types"
import { getSnippets, saveSnippets } from "@/lib/storage"
import { fetchSimilarities } from "@/lib/similarity"

const SIMILARITY_DEBOUNCE_MS = 800

const DEFAULT_PANEL_WIDTH = 380
const MIN_PANEL_WIDTH = 320
const MAX_PANEL_WIDTH = 600

function stripHtml(html: string): string {
  if (typeof window === "undefined") return ""
  const tmp = document.createElement("div")
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ""
}

export default function Home() {
  const [editorText, setEditorText] = useState("")
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [mounted, setMounted] = useState(false)
  const [isPanelVisible, setIsPanelVisible] = useState(true)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [similarityState, setSimilarityState] = useState<SimilarityState>({ status: "idle", scores: [] })
  const requestSeq = useRef(0)

  useEffect(() => {
    setMounted(true)
    setSnippets(getSnippets())
  }, [])

  // Drag-to-resize the side panel.
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX
      const constrainedWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth))
      setPanelWidth(constrainedWidth)
      if (constrainedWidth <= 330) {
        setIsPanelCollapsed(true)
        setIsResizing(false)
      }
    }
    const handleMouseUp = () => setIsResizing(false)

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    document.body.style.cursor = "ew-resize"
    document.body.style.userSelect = "none"
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing])

  // Debounced similarity computation against the current set of snippets.
  useEffect(() => {
    if (!mounted) return

    const plainText = stripHtml(editorText)
    if (!plainText.trim() || snippets.length === 0) {
      setSimilarityState({ status: "idle", scores: [] })
      return
    }

    const controller = new AbortController()
    const seq = ++requestSeq.current
    setSimilarityState((prev) => ({ status: "loading", scores: prev.scores }))
    const timer = setTimeout(() => {
      fetchSimilarities(plainText, snippets, controller.signal)
        .then((scores) => {
          if (seq === requestSeq.current) setSimilarityState({ status: "ready", scores })
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || seq !== requestSeq.current) return
          setSimilarityState({
            status: "error",
            scores: [],
            error: err instanceof Error ? err.message : "Failed to compute similarity",
          })
        })
    }, SIMILARITY_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [editorText, snippets, mounted])

  const sortedSnippets = useMemo(() => [...snippets].sort((a, b) => b.createdAt - a.createdAt), [snippets])

  const addSnippet = (content: string) => {
    const next = [...snippets, { id: Date.now().toString(), content, createdAt: Date.now() }]
    setSnippets(next)
    saveSnippets(next)
  }
  const deleteSnippet = (id: string) => {
    const next = snippets.filter((s) => s.id !== id)
    setSnippets(next)
    saveSnippets(next)
  }
  const editSnippet = (id: string, content: string) => {
    const next = snippets.map((s) => (s.id === id ? { ...s, content } : s))
    setSnippets(next)
    saveSnippets(next)
  }

  if (!mounted) return null

  return (
    <main className="h-screen flex overflow-hidden relative">
      <div className="flex-1 min-w-0 p-4 overflow-auto">
        <TextEditor
          value={editorText}
          onChange={setEditorText}
          isPanelCollapsed={isPanelCollapsed}
          onExpandPanel={() => {
            setIsPanelCollapsed(false)
            setPanelWidth(DEFAULT_PANEL_WIDTH)
          }}
          isPanelVisible={isPanelVisible}
          onTogglePanel={() => setIsPanelVisible(!isPanelVisible)}
        />
      </div>

      {!isPanelCollapsed && (
        <div
          className="hidden md:block fixed top-0 bottom-0 w-1 bg-border/60 hover:bg-border cursor-ew-resize transition-colors z-50"
          style={{ right: `${panelWidth}px` }}
          onMouseDown={() => setIsResizing(true)}
        />
      )}

      <div
        className={`
          flex-shrink-0 fixed md:relative top-0 bottom-0 md:top-4 md:bottom-4 right-0
          z-40 md:z-auto transition-all duration-300
          ${isPanelVisible ? "translate-x-0" : "translate-x-full"}
          md:translate-x-0
          ${isPanelCollapsed ? "md:hidden" : "md:block"}
        `}
        style={{ width: `min(100vw, ${panelWidth}px)`, maxWidth: "100vw" }}
      >
        <div className="h-full p-4 md:pt-2 md:pb-4 overflow-auto">
          <SnippetPanel
            snippets={sortedSnippets}
            similarities={similarityState.scores}
            similarityStatus={similarityState.status}
            similarityError={similarityState.error}
            editorText={stripHtml(editorText)}
            onAddSnippet={addSnippet}
            onDeleteSnippet={deleteSnippet}
            onEditSnippet={editSnippet}
          />
        </div>
      </div>

      {isPanelVisible && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsPanelVisible(false)}
        />
      )}
    </main>
  )
}
