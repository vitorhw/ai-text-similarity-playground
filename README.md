# AI Text Similarity Playground

A small writing tool that shows, in real time, how closely your draft resembles
a set of reference snippets (e.g. AI responses you've consulted) — measured along
**four complementary dimensions** rather than a single number:

| Dimension | Metric | What it measures |
| --- | --- | --- |
| **Lexical** | Jaccard similarity | exact vocabulary overlap (`[A-Za-z']+` word tokens, intersection ÷ union) |
| **Structural** | POS TF-ISF cosine | overlap of part-of-speech-tagged word stems, TF-ISF-weighted, compared by cosine — after [Vani & Gupta, 2015](https://doi.org/10.1109/ICACCI.2015.7275843) |
| **Semantic** | SBERT cosine | cosine between [Sentence-BERT](https://arxiv.org/abs/1908.10084) embeddings (`sentence-transformers/roberta-base-nli-mean-tokens`) — catches paraphrasing |
| **Sentiment** | aspect sentiment match | agreement of per-sentence sentiment labels (positive / negative / neutral, via [TextBlob](https://textblob.readthedocs.io/)) — after [Zhao et al., 2022](https://doi.org/10.1016/j.knosys.2022.109942) |

Type in the editor, add a few snippets, and watch the four bars move as you paste,
paraphrase, or rewrite. The point isn't to police reuse — it's to make how much a
reference is shaping your text *visible*.

## How it's put together

Two pieces:

- **Web app** — Next.js (App Router) + Tiptap editor + Tailwind. It debounces your
  typing and calls its own `/api/similarity` route.
- **Similarity service** — a small Python (FastAPI) service in
  [`similarity-service/`](./similarity-service) that computes the four metrics with
  the same libraries the methods come from (`re`, NLTK, `sentence-transformers`,
  TextBlob). The Next.js route forwards requests to it, so the service URL and any
  CORS concerns stay server-side.

```
browser ──▶ /api/similarity (Next.js) ──▶ POST /similarity (Python service)
```

## Running it locally

### 1. Start the similarity service

See [`similarity-service/README.md`](./similarity-service/README.md) for details.
In short:

```bash
cd similarity-service
python3.10 -m venv .venv && source .venv/bin/activate   # Python 3.10 or 3.11
pip install -r requirements.txt
python -m textblob.download_corpora lite
uvicorn main:app --reload --port 8000
```

(The first request downloads the RoBERTa model, ~500 MB, then it's cached.)

### 2. Start the web app

```bash
pnpm install
echo "SIMILARITY_SERVICE_URL=http://localhost:8000" > .env.local
pnpm dev
```

Open <http://localhost:3000>. If `SIMILARITY_SERVICE_URL` is unset, the similarity
panel shows an "unavailable" message rather than falling back to a different
calculation.

## Deploying

- **Web app** → any Next.js host (e.g. Vercel). Set `SIMILARITY_SERVICE_URL` in the
  environment to wherever the Python service lives.
- **Similarity service** → any container host. The
  [`Dockerfile`](./similarity-service/Dockerfile) bakes in the model + NLTK/TextBlob
  data, and the directory is also a ready-made Hugging Face **Docker Space** (see
  the `app_port` / `sdk: docker` header in `similarity-service/README.md`). Note the
  service needs ~1–2 GB RAM (PyTorch + RoBERTa), and on hosts that sleep when idle
  the first request after a wake-up is slow while the model reloads.

## Notes

- The lexical and semantic metrics are well-defined; the structural and sentiment
  metrics follow prose descriptions of their source methods, so a few modelling
  choices (e.g. the sentence corpus used for inverse-sentence-frequency, how
  sentiment-label distributions are compared) are judgement calls — each is marked
  with an `INTERPRETATION:` comment in `similarity-service/metrics.py`.
- Snippets live in `localStorage`; there's no backend for them.

## Tech stack

Next.js 15 · React 19 · Tiptap · Tailwind CSS v4 · shadcn/ui · FastAPI ·
NLTK · sentence-transformers · TextBlob
