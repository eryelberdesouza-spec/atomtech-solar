FROM python:3.12-slim

# poppler-utils -> pdftotext, usado por extract_conta.py para ler a fatura de energia.
RUN apt-get update && apt-get install -y --no-install-recommends \
      poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
