import type { Snippet } from "./types"

const SNIPPETS_KEY = "ai-text-similarity-snippets"

export function getSnippets(): Snippet[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(SNIPPETS_KEY)
    return stored ? (JSON.parse(stored) as Snippet[]) : []
  } catch {
    return []
  }
}

export function saveSnippets(snippets: Snippet[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SNIPPETS_KEY, JSON.stringify(snippets))
}
