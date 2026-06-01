# backend/app/core/

## Responsibility

Central configuration layer for application settings and environment loading.

## Design

`Settings` extends `pydantic_settings.BaseSettings`, providing typed defaults with `.env` override support. The module exports a singleton `settings` object consumed across the app.

## Flow

Environment variables are loaded once at import time, merged with defaults, and then read by API bootstrap, engine service, LLM service, book service, and game analysis logic for runtime behavior.

## Integration

Imported by `main.py` for app metadata and route prefix, by `services/engine_service.py` for Stockfish tuning, by `services/llm_service.py` for DeepSeek config, and by `services/book_service.py` for external API credentials.
