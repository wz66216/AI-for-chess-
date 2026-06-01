# backend/app/services/

## Responsibility

Domain service layer for chess evaluation, game analysis, language explanation, opening-book lookup, and Lichess-inspired scoring math.

## Design

Service objects isolate external integrations and blocking work. `EngineService` wraps Stockfish and returns typed evaluations; `LLMService` wraps the OpenAI-compatible DeepSeek client; `BookService` wraps Lichess HTTP calls; `game_analysis_service.py` is a procedural analyzer built from `python-chess` plus scoring helpers; `lichess_math.py` provides deterministic conversion/utilities.

## Flow

Move analysis starts with FEN + UCI, optionally applies the move to a board, then runs Stockfish and converts PVs into SAN. Full-game analysis parses PGN, iterates mainline moves, evaluates each position, derives win-percentage deltas, accuracies, and judgment labels, then aggregates headers and summaries. Book lookups query Lichess with FEN and return sorted move weights.

## Integration

Used by `app.api.analysis` and depends on `app.core.config.settings`, `app.schemas.analysis`, `python-chess`, `httpx`, `openai`, and the Lichess scoring helpers. External integrations: local Stockfish binary, DeepSeek API, and Lichess Opening Explorer API.
