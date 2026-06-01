# phase2_research/backend/app/services/

## Responsibility
Service layer containing chess analysis workflows, external API adapters, and engine orchestration helpers.

## Design
Facade/adaptor mix. `EngineService` wraps Stockfish analysis, `LLMService` wraps DeepSeek, `BookService` wraps Lichess Explorer, and `game_analysis_service` composes these primitives into full-game accuracy analysis.

## Flow
API handlers call services with FEN/PGN/move input. Services execute blocking engine work in a thread when needed, normalize scores into domain models, and return structured evaluation objects or JSON-compatible dicts.

## Integration
- Consumed by `app.api.analysis`
- Depends on `python-chess`, `httpx`, OpenAI SDK, and Lichess/Stockfish infrastructure
- Uses `app.schemas.analysis` for typed evaluation payloads
