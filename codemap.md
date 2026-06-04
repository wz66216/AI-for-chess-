# Repository Atlas: ChessExplain

## Project Responsibility

ChessExplain is a chess analysis and search-visualization platform. The active
application lives in `phase2_research/` and combines:

- a FastAPI backend for Stockfish-backed analysis, Lichess opening-book lookup,
  and whitebox search endpoints;
- a Vite/React frontend with the analysis board and Search Lab;
- offline benchmark scripts for Alpha-Beta and MCTS experiments.

Legacy Phase 1 root-level app folders have been removed from the tracked
project. Historical design notes remain under `docs/`.

## System Entry Points

- `phase2_research/backend/app/main.py`: FastAPI application entrypoint.
- `phase2_research/backend/app/api/`: HTTP route layer.
- `phase2_research/backend/app/services/`: Stockfish, Lichess, and analysis services.
- `phase2_research/backend/app/engines/whitebox/`: Alpha-Beta, MCTS, and evaluator implementations.
- `phase2_research/backend/scripts/`: benchmark and reporting utilities.
- `phase2_research/frontend/src/main.tsx`: React browser entrypoint.
- `phase2_research/frontend/src/App.tsx`: route shell for the analysis page and Search Lab.
- `phase2_research/frontend/src/components/Chessboard/ChessGame.tsx`: main analysis-board workflow.
- `phase2_research/frontend/src/components/SearchLab/`: position editor, search controls, run history, and tree visualization.
- `railway.toml`: Railway deployment root configuration for the backend.

## Design

The project is organized as one active full-stack app:

```text
ChessExplain/
|-- phase2_research/
|   |-- backend/       # FastAPI API, services, whitebox engines, tests, scripts
|   `-- frontend/      # Vite + React + TypeScript client
|-- docs/              # project state, design notes, and historical implementation plans
|-- railway.toml       # Railway service root points to phase2_research/backend
|-- AGENTS.md          # repository working instructions
`-- README.md          # human-facing setup and deployment guide
```

## Flow

Local development runs two processes:

1. Backend: `phase2_research/backend`, usually on `http://127.0.0.1:8000`.
2. Frontend: `phase2_research/frontend`, usually on `http://localhost:5173`.

The frontend calls:

- `GET /api/v1/opening-book`
- `POST /api/v1/analyze-move`
- `POST /api/v1/analyze-game`
- `POST /api/whitebox/play`

Production uses Cloudflare Pages for the static frontend under `/chess/` and
Railway for the backend API.

## Integration

- Chess libraries: `python-chess`, `chess.js`, `react-chessboard`.
- Engine analysis: Stockfish.
- Opening book: Lichess Opening Explorer with `LICHESS_API_TOKEN` or
  `LICHESS_TOKEN`.
- LLM narration: OpenAI-compatible API configuration in backend environment.
- Visualization: ECharts and custom React panels.

## Directory Maps

Read deeper maps before changing a specific subtree:

- `phase2_research/codemap.md`
- `phase2_research/backend/codemap.md`
- `phase2_research/frontend/codemap.md`
