# phase2_research/backend/app/core/

## Responsibility
Central configuration layer. Loads environment-backed runtime settings and exposes a singleton settings object used across API, services, and engine code.

## Design
Pydantic Settings pattern with `.env` loading and relaxed extra-field handling. Settings are typed, centralized, and imported rather than re-parsed in each module.

## Flow
Process startup instantiates `Settings()`, which resolves defaults and environment overrides. Downstream modules read `settings` for paths, API keys, host/port, and engine parameters.

## Integration
- Used by `app.main`, `app.services.engine_service`, `app.services.llm_service`, `app.services.game_analysis_service`
- Controls Stockfish path, engine limits, DeepSeek key/model, and server binding
