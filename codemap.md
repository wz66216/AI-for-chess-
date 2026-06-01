# Repository Atlas: ChessExplain

## Project Responsibility
ChessExplain is a two-track chess-analysis repository. The root project combines a Phase 1 Stockfish + LLM review application with a Phase 2 research/teaching platform for whitebox search-engine visualization and offline benchmarking.

## System Entry Points
- `README.md`: overall project positioning and run instructions.
- `backend/app/main.py`: Phase 1 FastAPI entrypoint.
- `frontend/src/main.tsx`: Phase 1 browser entrypoint.
- `phase2_research/backend/app/main.py`: Phase 2 FastAPI entrypoint.
- `phase2_research/frontend/src/main.tsx`: Phase 2 browser entrypoint.
- `IMPLEMENTATION_PLAN.md`, `RESEARCH.md`, `SETUP.md`: planning and research context.

## Design
The repository is organized as two parallel full-stack applications. Both use a layered backend (`api/`, `schemas/`, `services/`, `core/`) and a thin React shell that delegates most client logic to a large `ChessGame` orchestration component. Phase 2 extends the concept with a dedicated `engines/whitebox/` algorithm layer and frontend visualization components for Alpha-Beta and MCTS search trees.

## Flow
For both phases, the browser mounts a React app, renders `ChessGame`, and issues HTTP requests to the FastAPI backend for opening-book lookups, move analysis, or game analysis. In Phase 1, backend services call Stockfish, the DeepSeek-compatible LLM API, and Lichess Opening Explorer. In Phase 2, the same analysis flow coexists with whitebox endpoints that execute pure-Python search engines and return tree-shaped JSON for visualization and offline benchmarking artifacts.

## Integration
- External chess/runtime dependencies: `python-chess`, Stockfish, Lichess Opening Explorer, `chess.js`, `react-chessboard`.
- LLM integration: DeepSeek via OpenAI-compatible SDK.
- Visualization: Recharts in Phase 1 and ECharts tree rendering in Phase 2.
- Development/runtime split: Python/FastAPI backends and Vite/React/TypeScript frontends.

## Repository Directory Map
| Directory | Responsibility Summary | Detailed Map |
|---|---|---|
| `backend/` | Phase 1 backend for Stockfish-backed chess analysis, opening-book lookup, and LLM explanation APIs. | [View Map](backend/codemap.md) |
| `frontend/` | Phase 1 frontend for interactive board play, move/game analysis, and explanation display. | [View Map](frontend/codemap.md) |
| `phase2_research/` | Research branch packaging whitebox engines, search-tree visualization, and offline benchmarking. | [View Map](phase2_research/codemap.md) |
| `backend/app/` | Phase 1 FastAPI application package and service layer. | [View Map](backend/app/codemap.md) |
| `phase2_research/backend/` | Phase 2 backend with analysis APIs, whitebox endpoints, and experiment scripts. | [View Map](phase2_research/backend/codemap.md) |
| `phase2_research/frontend/` | Phase 2 frontend combining board analysis UI with whitebox controls and tree visualization. | [View Map](phase2_research/frontend/codemap.md) |
