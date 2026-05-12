---
title: Text Similarity Service
emoji: 📝
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 8000
pinned: false
license: apache-2.0
short_description: Four text-similarity metrics — lexical, structural, semantic, sentiment
---

<!--
  This file is both the README and the Hugging Face Space card. The YAML block
  above configures the Space (Docker SDK; the container listens on port 8000).
  See https://huggingface.co/docs/hub/spaces-config-reference
-->

# Text similarity service

Small FastAPI service that scores how similar one text is to a set of reference
texts along four complementary dimensions, using the libraries the methods come
from:

| Metric | Dimension | How it's computed |
| --- | --- | --- |
| Jaccard similarity | lexical overlap | word tokens via regex `[A-Za-z']+`, `|A∩B| / |A∪B|` |
| POS TF-ISF cosine | structural alignment | NLTK POS-tagging → `lemma/class` terms → TF-ISF vectors → cosine (after Vani & Gupta, 2015) |
| SBERT cosine | semantic alignment | `sentence-transformers/roberta-base-nli-mean-tokens` embeddings → cosine (Reimers & Gurevych, 2019) |
| Aspect sentiment match | sentiment alignment | per-sentence TextBlob polarity → `positive/negative/neutral` labels → label-distribution agreement (after Zhao et al., 2022) |

The metric code is in [`metrics.py`](./metrics.py). Jaccard and SBERT are
unambiguous; the structural and sentiment metrics follow prose descriptions of
their source methods, so a few modelling choices are judgement calls — each is
flagged with an `INTERPRETATION:` comment.

## Run locally

```bash
cd similarity-service
python3.10 -m venv .venv && source .venv/bin/activate   # Python 3.10 or 3.11
pip install -r requirements.txt
python -m textblob.download_corpora lite                # one-time corpora download
uvicorn main:app --reload --port 8000
```

The first request downloads the RoBERTa model (~500 MB) and NLTK data; it's
cached afterwards. Point the web app at it via `SIMILARITY_SERVICE_URL` in its
`.env.local` (e.g. `http://localhost:8000`).

## Run with Docker

```bash
cd similarity-service
docker build -t text-similarity-service .
docker run -p 8000:8000 text-similarity-service
```

The image bundles the RoBERTa model + NLTK/TextBlob corpora, so it's large
(~2 GB) but starts fast. Deploy it anywhere that runs a container (Fly.io,
Render, Railway, Cloud Run, a Hugging Face Space, …); it needs ~1–2 GB RAM.

## Deploy as a Hugging Face Space (Docker SDK)

The YAML header above already configures the Space. The `huggingface-cli`
(a.k.a. `hf`) tool ships with `huggingface_hub` (`pipx install "huggingface_hub[cli]"`,
or it's a dependency of `sentence-transformers` in the `.venv`).

```bash
cd similarity-service
huggingface-cli login        # paste a *write* token from https://hf.co/settings/tokens
```

Create a Space (web UI: <https://huggingface.co/new-space> → SDK = **Docker** →
Blank template), then upload this folder:

```bash
huggingface-cli upload <your-hf-username>/text-similarity-service ./ . --repo-type space --exclude ".venv/*" --exclude "**/__pycache__/*"
```

The Space builds the Docker image (first build ~5–15 min — it downloads torch and
the RoBERTa model). Once it shows **Running**, the API base URL is
`https://<your-hf-username>-text-similarity-service.hf.space` — set that as
`SIMILARITY_SERVICE_URL` in the web app's environment. On the free CPU tier the
Space sleeps when idle; the first request after a wake-up is slow (~30 s) while
the model reloads into RAM (the startup hook in `main.py` warms it in the
background).

## API

`POST /similarity`

```jsonc
// request
{ "response": "the draft text", "suggestions": ["snippet 1", "snippet 2"] }

// response — one entry per suggestion, in order
{ "scores": [
    { "jaccard": 0.108, "posTfIsfCosine": 0.042, "sbertCosine": 0.676, "aspectSentimentMatch": 0.092 },
    { "jaccard": 0.031, "posTfIsfCosine": 0.010, "sbertCosine": 0.601, "aspectSentimentMatch": 0.0 }
] }
```

`GET /health` → `{ "status": "ok" }`
