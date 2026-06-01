# backend/app/api/

## Responsibility

Thin HTTP interface for chess-analysis endpoints. Translates FastAPI requests into service calls and normalizes success/error responses.

## Design

Uses FastAPI router composition plus dependency injection. Route handlers remain orchestration-only; chess computation and external I/O are delegated to services.

## Flow

`POST /analyze-move` validates `AnalyzeMoveRequest`, calls `EngineService.analyze_position()`, then `LLMService.explain_move()`, and returns `AnalyzeMoveResponse`. `POST /analyze-game` forwards PGN text to `analyze_full_game()`. `GET /opening-book` fetches Lichess book moves for a FEN. Exceptions are mapped to 4xx/5xx HTTP errors.

## Integration

Consumes `app.schemas.analysis`, `app.services.engine_service`, `app.services.llm_service`, `app.services.book_service`, and `app.services.game_analysis_service`. Mounted by `backend/app/main.py`.
