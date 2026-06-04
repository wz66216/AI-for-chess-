# Deployment Smoke Checks

Use this checklist after local changes, Railway redeploys, or Cloudflare Pages
publishes. It is intentionally small enough to run manually, but each item maps
to behavior that should eventually become automated.

## Local

Backend:

```powershell
cd phase2_research/backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd phase2_research/frontend
npm run dev
```

Smoke URLs:

- `http://127.0.0.1:8000/health`
- `http://localhost:5173/analyze`
- `http://localhost:5173/search-lab`
- `http://localhost:5173/health`

Automated backend smoke check:

```powershell
cd phase2_research/backend
python scripts/deployment_smoke.py --api-base http://127.0.0.1:8000
```

Expected `/health` shape:

```json
{
  "status": "healthy",
  "service": "ChessExplain API",
  "version": "1.0.0",
  "api_prefix": "/api/v1",
  "checks": {
    "api": "ok",
    "whitebox": "ok"
  }
}
```

## Railway Backend

Required variables:

- `LICHESS_API_TOKEN` or `LICHESS_TOKEN`
- LLM provider variables, if narration routes are enabled

Smoke requests:

```powershell
$api = "https://ai-for-chess-production.up.railway.app"
Invoke-RestMethod "$api/health"
Invoke-RestMethod "$api/api/v1/opening-book?fen=rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR%20w%20KQkq%20-%200%201&moves=10&topGames=0"
Invoke-RestMethod "$api/api/whitebox/play" -Method Post -ContentType "application/json" -Body '{"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","engine":"alphabeta","depth":1,"evaluator":"heuristic"}'
```

Equivalent script:

```powershell
cd phase2_research/backend
python scripts/deployment_smoke.py --api-base https://ai-for-chess-production.up.railway.app
```

Expected:

- `/health` returns `status: healthy`.
- `opening-book` returns HTTP 200. Empty `moves` means no data or token/upstream
  fallback; it should not crash the frontend.
- `whitebox/play` returns a white-centric `evaluation`, `tree`, and candidates.
- Expensive interactive parameters are rejected by validation rather than
  running unbounded searches: Alpha-Beta depth above `8`, MCTS iterations above
  `50000`, or MCTS exploration constant above `5.0` should return HTTP 422.

## Cloudflare Pages Frontend

Production routes:

- `https://thu-wangzhai.pages.dev/chess/`
- `https://thu-wangzhai.pages.dev/chess/analyze/`
- `https://thu-wangzhai.pages.dev/chess/search-lab/`
- `https://thu-wangzhai.pages.dev/chess/health/`

Checks:

- Internal links stay under `/chess/`.
- The Search Lab button from the analysis page routes to
  `/chess/search-lab/`, not `/search-lab`.
- `VITE_API_BASE` points to the Railway backend.
- Search Lab result labels show white-centric scores.
- The deployment health page shows the Railway API base and `/health` checks.

## Automated Gates

Run before deploying:

```powershell
cd phase2_research/backend
python -m pytest tests -q

cd ..\frontend
npm test -- --run
npm run type-check
npm run build
```
