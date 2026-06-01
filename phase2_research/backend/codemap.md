# phase2_research/backend/

## Responsibility
Backend of ChessExplain: exposes FastAPI endpoints for move/game analysis and whitebox engine introspection, and contains offline benchmark/plot utilities.

## Design
Layered FastAPI architecture. `app.main` is the composition root, `app.api` is the HTTP boundary, `app.services` encapsulates external integrations and analysis workflows, `app.engines.whitebox` contains search algorithms, and `scripts` provides batch tooling.

## Flow
Requests enter FastAPI, are validated by Pydantic schemas, then routed to service functions or whitebox engines. Analysis requests combine Stockfish evaluation with LLM narration; whitebox requests return algorithmic search trees; benchmark scripts emit CSVs that plot scripts convert to PNGs.

## Integration
- Consumed by frontend/client via `/api/v1/*` and `/api/whitebox/play`
- Depends on `python-chess`, Stockfish, DeepSeek/OpenAI-compatible API, and Lichess Opening Explorer
- Produces `results/` CSVs and `plots/` images for offline analysis
