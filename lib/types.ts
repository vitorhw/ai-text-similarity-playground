export interface Snippet {
  id: string
  content: string
  createdAt: number
}

/**
 * Per-snippet similarity between the editor draft and a saved snippet, across
 * four complementary dimensions:
 *   - jaccard               Jaccard coefficient on `[A-Za-z']+` word tokens (lexical overlap)
 *   - posTfIsfCosine        cosine of POS-tagged lemma/class TF-ISF vectors (structural alignment)
 *   - sbertCosine           cosine of Sentence-BERT (roberta-base-nli-mean-tokens) embeddings (semantic alignment)
 *   - aspectSentimentMatch  agreement of per-sentence TextBlob sentiment labels (sentiment alignment)
 *
 * All four are computed by the Python similarity service (see /similarity-service)
 * and surfaced through the /api/similarity route.
 */
export interface SimilarityScore {
  snippetId: string
  jaccard: number
  posTfIsfCosine: number
  sbertCosine: number
  aspectSentimentMatch: number
}

export type SimilarityStatus = "idle" | "loading" | "ready" | "error"

export interface SimilarityState {
  status: SimilarityStatus
  scores: SimilarityScore[]
  error?: string
}
