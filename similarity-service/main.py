"""
FastAPI service exposing the four text-similarity metrics in metrics.py. The
Next.js app talks to it through its own /api/similarity route, so this service
does not need to be exposed publicly.

Run locally:

    pip install -r requirements.txt
    python -m textblob.download_corpora lite       # one-time
    uvicorn main:app --reload --port 8000

Then point the web app at it:

    SIMILARITY_SERVICE_URL=http://localhost:8000   # in .env.local
"""

from __future__ import annotations

import os
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import metrics

app = FastAPI(title="Text similarity service", version="1.0.0")


@app.on_event("startup")
def _warm_up_model() -> None:
    """Load the SBERT model in a background thread so the first /similarity
    request isn't blocked on a cold model load. Helpful on hosts that sleep when
    idle (e.g. Hugging Face Spaces). Set WARM_SBERT_ON_STARTUP=0 to disable."""
    if os.environ.get("WARM_SBERT_ON_STARTUP", "1") != "0":
        threading.Thread(target=metrics.warm_up, name="sbert-warmup", daemon=True).start()

# CORS is only needed if the browser ever calls this service directly. By
# default the Next.js /api/similarity route proxies the request server-side, so
# this can stay closed unless ALLOWED_ORIGINS is set.
_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
if _origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_methods=["POST", "GET", "OPTIONS"],
        allow_headers=["*"],
    )


class SimilarityRequest(BaseModel):
    response: str = Field(..., description="The draft text (plain text).")
    suggestions: list[str] = Field(
        default_factory=list,
        description="The reference snippets to compare the draft against.",
    )


class SimilarityScore(BaseModel):
    jaccard: float
    posTfIsfCosine: float
    sbertCosine: float
    aspectSentimentMatch: float


class SimilarityResponse(BaseModel):
    scores: list[SimilarityScore]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/similarity", response_model=SimilarityResponse)
def similarity(req: SimilarityRequest) -> SimilarityResponse:
    response_text = (req.response or "").strip()
    if not response_text or not req.suggestions:
        return SimilarityResponse(
            scores=[
                SimilarityScore(
                    jaccard=0.0,
                    posTfIsfCosine=0.0,
                    sbertCosine=0.0,
                    aspectSentimentMatch=0.0,
                )
                for _ in req.suggestions
            ]
        )
    raw = metrics.score_response_against_suggestions(req.response, req.suggestions)
    return SimilarityResponse(scores=[SimilarityScore(**row) for row in raw])
