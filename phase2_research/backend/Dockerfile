FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN wget -qO /tmp/sf.tar https://github.com/official-stockfish/Stockfish/releases/download/sf_17/stockfish-ubuntu-x86-64.tar && \
    mkdir -p /tmp/sf && tar xf /tmp/sf.tar -C /tmp/sf && \
    cp /tmp/sf/stockfish/stockfish-ubuntu-x86-64 /usr/local/bin/stockfish && \
    chmod +x /usr/local/bin/stockfish && \
    /usr/local/bin/stockfish --version && \
    rm -rf /tmp/sf /tmp/sf.tar

WORKDIR /app
COPY . .

RUN pip install --no-cache-dir -r requirements.txt

ENV STOCKFISH_PATH=/usr/local/bin/stockfish
ENV PORT=8080

EXPOSE 8080

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
