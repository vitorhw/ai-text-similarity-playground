import { NextResponse } from "next/server"

/**
 * Proxy to the Python similarity service (see /similarity-service), which computes
 * the four text-similarity metrics. The browser calls this same-origin route; it
 * forwards to the service so the service URL and any CORS concerns stay on the
 * server.
 *
 * Configure with `SIMILARITY_SERVICE_URL` (e.g. http://localhost:8000).
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface ApiScore {
  jaccard: number
  posTfIsfCosine: number
  sbertCosine: number
  aspectSentimentMatch: number
}

function emptyScores(count: number): ApiScore[] {
  return Array.from({ length: count }, () => ({
    jaccard: 0,
    posTfIsfCosine: 0,
    sbertCosine: 0,
    aspectSentimentMatch: 0,
  }))
}

export async function POST(request: Request) {
  let payload: { response?: string; suggestions?: unknown }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const responseText = typeof payload.response === "string" ? payload.response : ""
  const suggestions = Array.isArray(payload.suggestions)
    ? payload.suggestions.filter((s): s is string => typeof s === "string")
    : []

  if (suggestions.length === 0) {
    return NextResponse.json({ scores: [] })
  }
  if (!responseText.trim()) {
    return NextResponse.json({ scores: emptyScores(suggestions.length) })
  }

  const serviceUrl = process.env.SIMILARITY_SERVICE_URL
  if (!serviceUrl) {
    return NextResponse.json(
      {
        error:
          "SIMILARITY_SERVICE_URL is not configured. Start the Python similarity service (see /similarity-service) and set SIMILARITY_SERVICE_URL.",
      },
      { status: 503 },
    )
  }

  try {
    const upstream = await fetch(`${serviceUrl.replace(/\/$/, "")}/similarity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: responseText, suggestions }),
      // Allow time for a cold model load / first-token download.
      signal: AbortSignal.timeout(120_000),
    })

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "")
      return NextResponse.json(
        { error: `Similarity service error (${upstream.status}): ${text.slice(0, 500)}` },
        { status: 502 },
      )
    }

    const data = await upstream.json()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: `Could not reach similarity service: ${message}` }, { status: 502 })
  }
}
