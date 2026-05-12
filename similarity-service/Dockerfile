FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    # Cache HF / sentence-transformers models inside the image (and at runtime)
    HF_HOME=/models \
    SENTENCE_TRANSFORMERS_HOME=/models \
    NLTK_DATA=/usr/local/nltk_data

WORKDIR /app

COPY requirements.txt .

# CPU-only torch wheel keeps the image far smaller than the default CUDA build.
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch==2.2.2 \
 && pip install -r requirements.txt

COPY metrics.py main.py ./

# Pre-download everything the metrics need so the first request isn't slow:
#  - NLTK: punkt / averaged_perceptron_tagger / wordnet / omw-1.4
#  - TextBlob corpora (lite)
#  - the SBERT RoBERTa model
RUN python -c "import nltk; [nltk.download(p) for p in ('punkt','punkt_tab','averaged_perceptron_tagger','averaged_perceptron_tagger_eng','wordnet','omw-1.4')]" \
 && python -m textblob.download_corpora lite \
 && python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/roberta-base-nli-mean-tokens')"

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
