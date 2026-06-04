# API Contract

The browser client calls the FastAPI backend through one API base URL. Local
development usually uses `http://127.0.0.1:8000`; production Cloudflare Pages
uses the Railway backend URL from `VITE_API_BASE`.

## Health

```http
GET /health
```

Used to verify that the FastAPI process is reachable.

## Opening Book

```http
GET /api/v1/opening-book?fen=<fen>&moves=10&topGames=0
```

Returns Lichess Opening Explorer moves for a FEN. The backend should call
Lichess directly with `LICHESS_API_TOKEN` or `LICHESS_TOKEN`; the retired
Cloudflare Worker opening-book proxy should not be part of the active path.

Expected fallback behavior:

- If the token is missing or Lichess returns an upstream error, the endpoint
  should not crash the frontend.
- Empty book data is represented by an empty `moves` list.

## Move Analysis

```http
POST /api/v1/analyze-move
```

Runs Stockfish-backed move analysis and optional explanation generation.
Stockfish score output must follow the white-centric scoring contract described
in [scoring.md](scoring.md).

## Game Analysis

```http
POST /api/v1/analyze-game
```

Analyzes a PGN or move sequence and returns per-move analysis for review.
Consumer code should treat all centipawn-style values as white-centric unless
the response field explicitly states otherwise.

## Whitebox Search

```http
POST /api/whitebox/play
Content-Type: application/json
```

Request:

```json
{
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "engine": "alphabeta",
  "evaluator": "heuristic",
  "depth": 3,
  "use_move_ordering": true,
  "mcts_iterations": 100,
  "mcts_exploration_constant": 1.414
}
```

Response:

```json
{
  "best_move": "e2e4",
  "evaluation": 0.32,
  "nodes_evaluated": 128,
  "nps": 6400,
  "time_ms": 20,
  "instrumentation": {},
  "tree": {},
  "candidates": [
    { "move": "e4", "evaluation": 0.32, "nodes": 42 }
  ]
}
```

Contract notes:

- `evaluation` and `candidates[].evaluation` are white-centric. Positive is
  good for White; negative is good for Black.
- `candidates` are ordered by the best choice for the side to move.
- Alpha-Beta accepts `material`, `pst`, and `heuristic` evaluators.
- Alpha-Beta `depth` is limited to `1..8` for interactive Web requests.
- MCTS `mcts_iterations` is limited to `1..50000`; the frontend control starts
  at `10` for a smoother teaching default.
- MCTS `mcts_exploration_constant` must be greater than `0` and no larger than
  `5.0`.
- Alpha-Beta returns `instrumentation` with search counters and evaluator name.
- MCTS may omit `instrumentation`; clients must tolerate `null`.
- `tree.metadata.fen` and `tree.metadata.move_path` are intended for UI
  traceability and should remain stable when possible.

## Validation

Backend contract checks:

```powershell
cd phase2_research/backend
python -m pytest tests -q
```

Frontend contract checks:

```powershell
cd phase2_research/frontend
npm test -- --run
npm run type-check
npm run build
```
