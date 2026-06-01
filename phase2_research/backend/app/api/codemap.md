# phase2_research/backend/app/api/

## Responsibility
HTTP route layer. Exposes analysis and whitebox endpoints, performs request validation, and maps domain/service errors to HTTP responses.

## Design
Thin controller pattern with FastAPI dependency injection. Route handlers orchestrate services but avoid chess logic themselves. Validation happens via Pydantic models and explicit `HTTPException` handling.

## Flow
Incoming JSON/query params become schema instances, then are passed to services. `/analyze-move` chains engine evaluation and LLM explanation; `/analyze-game` delegates PGN processing; `/opening-book` wraps Lichess lookup; `/whitebox/play` dispatches to Alpha-Beta or MCTS.

## Integration
- Consumed by `app.main` via router inclusion
- Depends on `app.schemas`, `app.services`, and `app.engines.whitebox`
- Returns JSON suitable for frontend rendering and visualization
