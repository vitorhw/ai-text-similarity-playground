import type { SimilarityScore, Snippet } from "./types"

/**
 * Client for the similarity API (`app/api/similarity/route.ts`), which proxies the
 * Python service that computes the four text-similarity metrics. All scoring happens
 * server-side (with the reference NLP libraries) — there is intentionally no
 * JavaScript re-implementation here.
 */

interface ApiScore {
  jaccard: number
  posTfIsfCosine: number
  sbertCosine: number
  aspectSentimentMatch: number
}

export class SimilarityServiceError extends Error {}

export async function fetchSimilarities(
  responseText: string,
  snippets: Snippet[],
  signal?: AbortSignal,
): Promise<SimilarityScore[]> {
  if (snippets.length === 0) return []

  const res = await fetch("/api/similarity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      response: responseText,
      suggestions: snippets.map((s) => s.content),
    }),
    signal,
  })

  if (!res.ok) {
    let detail = `Similarity service returned ${res.status}`
    try {
      const body = await res.json()
      if (body?.error) detail = body.error
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new SimilarityServiceError(detail)
  }

  const data = (await res.json()) as { scores: ApiScore[] }
  const scores = data.scores ?? []

  return snippets.map((snippet, i) => {
    const s = scores[i] ?? { jaccard: 0, posTfIsfCosine: 0, sbertCosine: 0, aspectSentimentMatch: 0 }
    return {
      snippetId: snippet.id,
      jaccard: s.jaccard,
      posTfIsfCosine: s.posTfIsfCosine,
      sbertCosine: s.sbertCosine,
      aspectSentimentMatch: s.aspectSentimentMatch,
    }
  })
}
