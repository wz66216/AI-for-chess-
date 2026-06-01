# backend/app/

## Responsibility

FastAPI application package for ChessExplain. Hosts the web API, configuration, request/response schemas, and domain services used to analyze chess moves, full games, and opening-book positions.

## Design

Layered architecture: `api/` exposes HTTP routes, `schemas/` defines Pydantic contracts, `services/` encapsulates engine/LLM/book logic, and `core/` centralizes runtime settings. Dependency injection is used at the route layer for service construction.

## Flow

`main.py` creates the FastAPI app, applies CORS, and mounts the analysis router under `settings.API_V1_STR`. Requests enter `api/analysis.py`, are validated by Pydantic models, passed into service objects, and returned as structured JSON or HTTP errors.

## Integration

Depends on `app.api.analysis`, `app.core.config.settings`, and all service/schema modules below. Integrates with Stockfish via `python-chess`, DeepSeek via OpenAI-compatible SDK, and Lichess Opening Explorer via HTTP.

## Directory Map

| Directory | Responsibility Summary | Detailed Map |
|---|---|---|
| `backend/app/api/` | HTTP route layer for analysis endpoints. | [View Map](api/codemap.md) |
| `backend/app/core/` | Runtime configuration and environment-backed settings. | [View Map](core/codemap.md) |
| `backend/app/schemas/` | Pydantic request/response contracts for API boundaries. | [View Map](schemas/codemap.md) |
| `backend/app/services/` | Chess analysis, engine, LLM, and opening-book service layer. | [View Map](services/codemap.md) |
