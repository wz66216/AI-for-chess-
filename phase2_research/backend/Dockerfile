FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends stockfish && \
    rm -rf /var/lib/apt/lists/* && \
    stockfish --version

WORKDIR /app
COPY . .

RUN pip install --no-cache-dir -r requirements.txt

ENV STOCKFISH_PATH=/usr/games/stockfish
ENV PORT=8080

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
