# backend/

## Responsibility
Phase 1 backend service for the original ChessExplain application. It exposes HTTP endpoints for single-move analysis, full-PGN review, and opening-book lookup.

## Design
FastAPI service with a conventional layered structure: `app/main.py` composes the app, `app/api/` defines HTTP routes, `app/schemas/` defines request/response DTOs, `app/services/` encapsulates Stockfish, DeepSeek, Lichess, and scoring logic, and `app/core/` holds environment-backed settings.

## Flow
Requests enter via `app.main`, pass through the analysis router, and are delegated into service-layer functions. Move analysis evaluates the position with Stockfish and then asks the LLM service for a Markdown explanation. Full-game analysis parses PGN, evaluates each move, computes Lichess-style accuracy metrics, and returns a move-by-move dataset for the frontend.

## Integration
- Browser client: `frontend/` calls this backend at `/api/v1/*`.
- External systems: Stockfish, DeepSeek/OpenAI-compatible API, Lichess Opening Explorer.
- Internal map: detailed module boundaries live in [app/codemap.md](app/codemap.md).
