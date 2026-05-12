"""
Four complementary text-similarity metrics. Given two texts A and B, we score how
similar A is to B along four axes:

  1. Jaccard similarity        — lexical overlap   (Jaccard, 1901)
  2. POS TF-ISF cosine         — structural alignment   (after Vani & Gupta, 2015)
  3. SBERT (RoBERTa) cosine    — semantic alignment   (Sentence-BERT; Reimers & Gurevych, 2019)
  4. Aspect sentiment match    — sentiment alignment   (after Zhao et al., 2022)

(1) and (3) are unambiguous. (2) and (4) follow prose descriptions of their source
methods, so a few modelling choices are judgement calls — each is flagged with an
"INTERPRETATION:" comment below.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from functools import lru_cache
from typing import Iterable

import nltk
from nltk.corpus import wordnet
from nltk.stem import WordNetLemmatizer
from textblob import TextBlob

# ---------------------------------------------------------------------------
# NLTK data — downloaded once at import time (idempotent). Both the legacy
# resource names and the NLTK >= 3.9 names ("punkt_tab", "..._eng") are listed
# so this works regardless of the installed NLTK version.
# ---------------------------------------------------------------------------
_NLTK_RESOURCES = {
    "punkt": "tokenizers/punkt",
    "punkt_tab": "tokenizers/punkt_tab",
    "averaged_perceptron_tagger": "taggers/averaged_perceptron_tagger",
    "averaged_perceptron_tagger_eng": "taggers/averaged_perceptron_tagger_eng",
    "wordnet": "corpora/wordnet",
    "omw-1.4": "corpora/omw-1.4",
}
for _pkg, _path in _NLTK_RESOURCES.items():
    try:
        nltk.data.find(_path)
    except LookupError:
        try:
            nltk.download(_pkg, quiet=True)
        except Exception:  # pragma: no cover - older NLTK lacks the new names
            pass

_LEMMATIZER = WordNetLemmatizer()


# ===========================================================================
# 1) Jaccard similarity — LEXICAL OVERLAP
# ===========================================================================
#
# Definition: the Jaccard coefficient over the sets of word tokens extracted with
# the regex [A-Za-z']+ — i.e. unique tokens shared by both texts divided by unique
# tokens appearing in either.
#
# INTERPRETATION: the [A-Za-z']+ pattern is case-sensitive, so tokens are taken
# verbatim — no .lower().
_JACCARD_TOKEN_RE = re.compile(r"[A-Za-z']+")


def _jaccard_tokens(text: str) -> set[str]:
    return set(_JACCARD_TOKEN_RE.findall(text or ""))


def jaccard_similarity(a: str, b: str) -> float:
    set_a = _jaccard_tokens(a)
    set_b = _jaccard_tokens(b)
    union = set_a | set_b
    if not union:
        # Both texts contributed no tokens — define as 0 (no overlap to speak of).
        return 0.0
    return len(set_a & set_b) / len(union)


# ===========================================================================
# 2) POS TF-ISF cosine — STRUCTURAL ALIGNMENT
# ===========================================================================
#
# Definition: following Vani & Gupta (2015) — POS-tag each text, form "lemma+class"
# terms, and compute the cosine similarity between the texts' TF-ISF vectors
# (term frequency x inverse *sentence* frequency, sentences playing the role of
# "documents").
#
# INTERPRETATIONS:
#   * "class"  -> the WordNet open-class tag {n, v, a, r}; tokens whose Penn tag
#                 maps to none of these are dropped (they carry no lemma+class
#                 information). A term is written "<lemma>/<class>".
#   * lemmas are produced by WordNetLemmatizer on the lower-cased token using the
#                 mapped WordNet POS.
#   * the ISF "corpus" is the union of the sentences of *both* texts being
#                 compared (so the two vectors live in one shared term space).
#                 ISF(t) = ln(N_sentences / sf(t)), sf(t) = #sentences containing t.
#   * a text's TF(t) is the raw count of term t across that text's sentences.
#   * the per-text vector is [TF(t) * ISF(t)] over the shared vocabulary, and the
#                 metric is the cosine between the two text vectors.


def _penn_to_wordnet_class(penn_tag: str) -> str | None:
    if penn_tag.startswith("J"):
        return wordnet.ADJ          # "a"
    if penn_tag.startswith("V"):
        return wordnet.VERB         # "v"
    if penn_tag.startswith("N"):
        return wordnet.NOUN         # "n"
    if penn_tag.startswith("R"):
        return wordnet.ADV          # "r"
    return None


def _lemma_class_terms_per_sentence(text: str) -> list[list[str]]:
    """Return, for each sentence of `text`, the list of '<lemma>/<class>' terms."""
    sentences = nltk.sent_tokenize(text or "")
    out: list[list[str]] = []
    for sentence in sentences:
        tokens = nltk.word_tokenize(sentence)
        tagged = nltk.pos_tag(tokens)
        terms: list[str] = []
        for word, penn_tag in tagged:
            wn_class = _penn_to_wordnet_class(penn_tag)
            if wn_class is None:
                continue
            lemma = _LEMMATIZER.lemmatize(word.lower(), wn_class)
            terms.append(f"{lemma}/{wn_class}")
        out.append(terms)
    return out


def _tf_isf_vector(text_sentences: list[list[str]], isf: dict[str, float]) -> dict[str, float]:
    tf: Counter[str] = Counter()
    for sentence_terms in text_sentences:
        tf.update(sentence_terms)
    return {term: count * isf.get(term, 0.0) for term, count in tf.items()}


def _cosine(vec_a: dict[str, float], vec_b: dict[str, float]) -> float:
    if not vec_a or not vec_b:
        return 0.0
    dot = sum(value * vec_b.get(term, 0.0) for term, value in vec_a.items())
    norm_a = math.sqrt(sum(value * value for value in vec_a.values()))
    norm_b = math.sqrt(sum(value * value for value in vec_b.values()))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def pos_tf_isf_cosine(a: str, b: str, *, sentences_a: list[list[str]] | None = None) -> float:
    sents_a = sentences_a if sentences_a is not None else _lemma_class_terms_per_sentence(a)
    sents_b = _lemma_class_terms_per_sentence(b)

    all_sentences = sents_a + sents_b
    n_sentences = len(all_sentences)
    if n_sentences == 0:
        return 0.0

    sentence_freq: Counter[str] = Counter()
    for sentence_terms in all_sentences:
        for term in set(sentence_terms):
            sentence_freq[term] += 1

    isf = {term: math.log(n_sentences / sf) for term, sf in sentence_freq.items()}

    vec_a = _tf_isf_vector(sents_a, isf)
    vec_b = _tf_isf_vector(sents_b, isf)
    return _cosine(vec_a, vec_b)


# ===========================================================================
# 4) Aspect sentiment match — SENTIMENT ALIGNMENT
# ===========================================================================
#
# Definition: in line with the aspect-level sentiment consistency metric of Zhao
# et al. (2022) — split each text into sentences, compute the TextBlob polarity of
# each, label it positive/negative/neutral, and compare the two texts' label sets.
# 0 = weak sentiment alignment, 1 = strong.
#
# INTERPRETATIONS:
#   * a sentence's TextBlob polarity is mapped to {positive: p>0, negative: p<0,
#                 neutral: p==0}.
#   * "compare the aspect sentiment labels" -> agreement of the two label
#                 *distributions*, measured by histogram intersection of the
#                 normalised label counts:
#                     sum_label  min( count_A(label)/|A|, count_B(label)/|B| )
#                 which is 1 when the distributions match and approaches 0 as
#                 they diverge.

_SENTIMENT_LABELS = ("positive", "negative", "neutral")


def _sentiment_labels(text: str) -> list[str]:
    labels: list[str] = []
    for sentence in TextBlob(text or "").sentences:
        polarity = sentence.sentiment.polarity
        if polarity > 0:
            labels.append("positive")
        elif polarity < 0:
            labels.append("negative")
        else:
            labels.append("neutral")
    return labels


def aspect_sentiment_match(a: str, b: str, *, labels_a: list[str] | None = None) -> float:
    la = labels_a if labels_a is not None else _sentiment_labels(a)
    lb = _sentiment_labels(b)
    if not la or not lb:
        return 0.0
    ca, cb = Counter(la), Counter(lb)
    na, nb = len(la), len(lb)
    return sum(min(ca[label] / na, cb[label] / nb) for label in _SENTIMENT_LABELS)


# ===========================================================================
# 3) SBERT (RoBERTa) cosine — SEMANTIC ALIGNMENT
# ===========================================================================
#
# Definition: encode each text with Sentence-BERT (Reimers & Gurevych, 2019) and
# take the cosine similarity between the embeddings. Model:
#   https://huggingface.co/sentence-transformers/roberta-base-nli-mean-tokens
#
# Loaded lazily so the rest of the metrics (and `import metrics`) work without
# pulling in torch / downloading the model.

_SBERT_MODEL_NAME = "sentence-transformers/roberta-base-nli-mean-tokens"


@lru_cache(maxsize=1)
def _sbert_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(_SBERT_MODEL_NAME)


def warm_up() -> None:
    """Eagerly load the SBERT model (and pull in torch). Safe to call repeatedly."""
    _sbert_model()


def sbert_cosine_matrix(texts: list[str]) -> list[list[float]]:
    """Pairwise cosine similarity between the embeddings of `texts`."""
    from sentence_transformers import util

    model = _sbert_model()
    embeddings = model.encode(texts, convert_to_tensor=True)
    return util.cos_sim(embeddings, embeddings).tolist()


# ===========================================================================
# Convenience: score one response against many suggestions in one call.
# ===========================================================================


def score_response_against_suggestions(
    response: str, suggestions: Iterable[str]
) -> list[dict[str, float]]:
    suggestions = list(suggestions)

    # SBERT: one encode() for [response, *suggestions], then read off row 0.
    sbert_row: list[float]
    if suggestions:
        sims = sbert_cosine_matrix([response, *suggestions])
        sbert_row = sims[0][1:]
    else:
        sbert_row = []

    # Precompute the response side of the per-pair metrics once.
    response_pos_sentences = _lemma_class_terms_per_sentence(response)
    response_sentiment_labels = _sentiment_labels(response)

    results: list[dict[str, float]] = []
    for index, suggestion in enumerate(suggestions):
        results.append(
            {
                "jaccard": jaccard_similarity(response, suggestion),
                "posTfIsfCosine": pos_tf_isf_cosine(
                    response, suggestion, sentences_a=response_pos_sentences
                ),
                "sbertCosine": float(sbert_row[index]),
                "aspectSentimentMatch": aspect_sentiment_match(
                    response, suggestion, labels_a=response_sentiment_labels
                ),
            }
        )
    return results
