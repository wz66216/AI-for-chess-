# ChessExplain

ChessExplain is a chess analysis and whitebox search lab. It combines a Stockfish-backed analysis board with an interactive Search Lab for comparing Alpha-Beta and MCTS search behavior.

The active application is in `phase2_research/`.

## What Works Now

- Analysis page: play through a position, fetch opening-book moves, analyze moves, and review PGNs.
- Search Lab: import the current FEN, edit positions, choose Alpha-Beta or MCTS, inspect candidates and search trees.
- Local mode: Vite frontend + FastAPI backend.
- Production mode: Cloudflare Pages frontend under `/chess/` + Railway backend.
- Opening book: backend calls Lichess Opening Explorer directly with `LICHESS_API_TOKEN` or `LICHESS_TOKEN`.

## Project Layout

```text
ChessExplain/
├── phase2_research/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── api/                # FastAPI routes
│   │   │   ├── engines/whitebox/   # Alpha-Beta, MCTS, evaluators
│   │   │   ├── schemas/            # Pydantic models
│   │   │   └── services/           # Stockfish, Lichess, analysis services
│   │   ├── scripts/                # benchmark tooling
│   │   ├── tests/                  # backend tests
│   │   ├── Procfile                # Railway start command
│   │   └── requirements.txt
│   └── frontend/
│       ├── src/
│       │   ├── api/                # API base and whitebox client
│       │   ├── components/
│       │   │   ├── Chessboard/     # analysis board
│       │   │   └── SearchLab/      # Search Lab workflow
│       │   ├── engine/             # browser-side engine worker experiments
│       │   └── pages/
│       ├── package.json
│       └── vite.config.ts
├── docs/                           # project state and design notes
├── codemap.md                      # architecture map for agents
├── railway.toml                    # Railway root points at phase2_research/backend
└── AGENTS.md
```

Removed legacy clutter: the old root-level Phase 1 frontend, Cloudflare Worker opening-book proxy, generated benchmark plots/CSV, and local agent/plugin scaffolding are no longer part of the tracked project.

## Local Development

### 1. Backend

```powershell
cd C:\Users\15096\Desktop\ChessExplain\phase2_research\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Health check:

```text
http://127.0.0.1:8000/health
```

### 2. Frontend

Open a second terminal:

```powershell
cd C:\Users\15096\Desktop\ChessExplain\phase2_research\frontend
npm install
npm run dev
```

Use these URLs:

- Analysis page: `http://localhost:5173/analyze`
- Search Lab: `http://localhost:5173/search-lab`

On Windows, prefer `localhost:5173` for Vite. Depending on how Vite binds IPv6, `127.0.0.1:5173` may not respond.

## Environment Variables

Backend `.env` example:

```env
LICHESS_API_TOKEN=lip_xxxxxx
```

`LICHESS_TOKEN` is also accepted for compatibility.

Production frontend build uses:

```env
VITE_API_BASE=https://ai-for-chess-production.up.railway.app
VITE_APP_BASE=/chess
```

## Verification

Backend:

```powershell
cd phase2_research/backend
python -m pytest tests -q
```

Frontend:

```powershell
cd phase2_research/frontend
npm test -- --run
npm run lint
npm run type-check
npm run build
```

## Deployment

### Backend: Railway

Railway is configured from the repository root with:

```toml
[build]
builder = "nixpacks"

[service]
rootDirectory = "phase2_research/backend"
```

The backend process is defined by `phase2_research/backend/Procfile`:

```text
web: uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Set `LICHESS_API_TOKEN` in Railway variables for opening-book support.

### Frontend: Cloudflare Pages

Build the frontend:

```powershell
cd phase2_research/frontend
npm run build
```

Copy `phase2_research/frontend/dist/` into the blog repository at:

```text
E:\计算机\wangzhai-blog\my-blog\public\chess
```

The deployed routes are:

- `https://thu-wangzhai.pages.dev/chess/`
- `https://thu-wangzhai.pages.dev/chess/analyze/`
- `https://thu-wangzhai.pages.dev/chess/search-lab/`

## Notes For Future Work

- Keep frontend internal navigation on React Router `Link`/`NavLink`, not raw root-relative `<a href="/...">`, because production is mounted under `/chess`.
- Keep opening-book calls in the backend. The old Cloudflare Worker proxy has been retired.
- Generated outputs such as `dist/`, `node_modules/`, virtualenvs, benchmark result CSVs, and plots should stay out of git.
