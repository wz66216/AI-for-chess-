# phase2_research/backend/app/

## Responsibility
Application package for the API server. Defines the FastAPI app, configuration, request/response schemas, service layer, and whitebox engine implementations.

## Design
Composition-root plus dependency-injected service architecture. Transport concerns live in `api`, runtime settings in `core`, business logic in `services`, and search algorithms in `engines`. Schemas define stable contracts between layers.

## Flow
`main.py` constructs the app and mounts routers. API handlers parse incoming payloads into schemas, call services, and serialize responses. Whitebox paths instantiate an engine, run search, and return a JSON tree for visualization.

## Integration
- `api` exposes HTTP routes
- `core.config` supplies environment-backed settings
- `services` integrates Stockfish, DeepSeek, and Lichess
- `engines.whitebox` powers explainable search output
