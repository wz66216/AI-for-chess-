FROM ubuntu:22.04

RUN apt-get update && apt-get install -y python3 python3-pip python3-venv stockfish && \
    stockfish --version && \
    echo "Stockfish: $(which stockfish)"

WORKDIR /app/
COPY . /app

RUN python3 -m venv /opt/venv && \
    . /opt/venv/bin/activate && \
    pip install --no-cache-dir -r requirements.txt

ENV PATH=/opt/venv/bin:$PATH
ENV STOCKFISH_PATH=/usr/games/stockfish
ENV PORT=8080
ENV HOST=0.0.0.0

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
