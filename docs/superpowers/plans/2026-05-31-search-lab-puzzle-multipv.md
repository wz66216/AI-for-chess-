# Search Lab Puzzle Import + Multi-PV Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Lichess puzzle import button to Search Lab, and display Top-3 candidate moves from alpha-beta/MCTS search.

**Architecture:** New backend `/api/puzzle/import` endpoint proxies Lichess Puzzle API; backend alpha-beta/MCTS engines return `candidates[]` array; frontend adds `PuzzleImporter` card above search config, and `SearchResultSummary` renders up to 3 candidate move rows with evaluation bars.

**Tech Stack:** FastAPI, httpx (backend HTTP client), React, TypeScript, Tailwind, chess.js

---

## File Structure

| File | Role |
|------|------|
| **Create** `phase2_research/backend/app/api/puzzle.py` | Puzzle import API endpoint |
| **Create** `phase2_research/frontend/src/components/SearchLab/PuzzleImporter.tsx` | Puzzle fetch UI card |
| **Modify** `phase2_research/backend/app/main.py` | Register puzzle router |
| **Modify** `phase2_research/backend/app/engines/whitebox/minimax.py` | Return `candidates[]` in search result |
| **Modify** `phase2_research/backend/app/engines/whitebox/mcts.py` | Return `candidates[]` in search result |
| **Modify** `phase2_research/backend/app/schemas/whitebox.py` | Add `Candidate` model, add `candidates` to response |
| **Modify** `phase2_research/frontend/src/types/whitebox.ts` | Add `Candidate` interface, add `candidates` to `WhiteboxResult` |
| **Modify** `phase2_research/frontend/src/components/SearchLab/SearchResultSummary.tsx` | Render candidate row list |
| **Modify** `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx` | Integrate `PuzzleImporter`, pass puzzle FEN |
| **Modify** `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.test.tsx` | Update tests for new UI |
| **Modify** `phase2_research/frontend/src/components/SearchLab/SearchResultSummary.test.tsx` | Update tests for candidates |

**DO NOT MODIFY:** `api/whitebox.ts`, editor components, tree visualizer, position inspector, run history.

---

### Task 1: Backend Puzzle Import API

**Files:**
- Create: `phase2_research/backend/app/api/puzzle.py`
- Modify: `phase2_research/backend/app/main.py:8`

- [ ] **Step 1: Create puzzle API module**

```python
# phase2_research/backend/app/api/puzzle.py
import httpx
from fastapi import APIRouter, Query

router = APIRouter()

LICHESS_PUZZLE_URL = "https://lichess.org/api/puzzle/activity"


@router.get("/import")
async def import_puzzle(
    min_rating: int = Query(1200, ge=800, le=3000),
    max_rating: int = Query(2500, ge=800, le=3000),
):
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            LICHESS_PUZZLE_URL,
            params={"maxRating": max_rating},
        )
        resp.raise_for_status()
        data = resp.json()

    # Pick first puzzle within rating range (activity returns an array)
    puzzle = data[0] if isinstance(data, list) else data
    return {
        "id": puzzle["puzzle"]["id"],
        "fen": puzzle["puzzle"]["fen"],
        "rating": puzzle["puzzle"]["rating"],
        "themes": puzzle["puzzle"]["themes"],
        "solution": puzzle["puzzle"]["solution"],
        "players": puzzle["game"]["players"],
    }
```

- [ ] **Step 2: Register router in main.py**

```python
# In main.py, add after existing api imports:
from app.api import analysis, whitebox, puzzle

# Add after the existing router registrations:
app.include_router(puzzle.router, prefix="/api/puzzle", tags=["puzzle"])
```

- [ ] **Step 3: Verify backend**

Run: `uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload` from `phase2_research/backend`

Test: `Invoke-RestMethod http://127.0.0.1:8000/api/puzzle/import?minRating=1500&maxRating=2000`

Expected: JSON with `{id, fen, rating, themes, solution, players}`

---

### Task 2: Backend Multi-PV Candidates

**Files:**
- Modify: `phase2_research/backend/app/schemas/whitebox.py:18-26`
- Modify: `phase2_research/backend/app/engines/whitebox/minimax.py:37-69`
- Modify: `phase2_research/backend/app/engines/whitebox/mcts.py:33-60`

- [ ] **Step 1: Add Candidate schema**

```python
# Add to whitebox.py schemas, before WhiteboxResponse:
from pydantic import BaseModel

class Candidate(BaseModel):
    move: str
    evaluation: float
    nodes: int = 0


class WhiteboxResponse(BaseModel):
    best_move: Optional[str] = Field(None)
    evaluation: float = Field(...)
    nodes_evaluated: int = Field(...)
    nps: int = Field(...)
    time_ms: int = Field(...)
    instrumentation: Optional[Dict[str, Any]] = Field(None)
    tree: Dict[str, Any] = Field(...)
    candidates: list[Candidate] = Field(default_factory=list)   # NEW
```

- [ ] **Step 2: Alpha-Beta candidates**

```python
# In minimax.py search(), after the alphabeta call and before the return dict, add:

    # Collect top-3 candidate moves from root children
    candidates = []
    for child in root_node.children[:]:
        if not child.is_pruned and child.name not in (None, "Pruned"):
            candidates.append({
                "move": child.name,
                "evaluation": child.value or 0,
                "nodes": 0,
            })
    # Sort: best first for white (desc), best first for black (asc?)
    # For simplicity, sort by absolute value; later the frontend handles display
    candidates.sort(key=lambda c: abs(c["evaluation"]), reverse=True)
    candidates = candidates[:3]

    # Add to return dict:
        "candidates": candidates,
```

- [ ] **Step 3: MCTS candidates**

```python
# In mcts.py search(), after best_child, before return, add:

    candidates = []
    for child in root.children[:]:
        if child.visits > 0:
            candidates.append({
                "move": child.move.uci() if child.move else "?",
                "evaluation": child.wins / child.visits,
                "nodes": child.visits,
            })
    candidates.sort(key=lambda c: c["nodes"], reverse=True)
    candidates = candidates[:3]

    # Add to return dict:
        "candidates": candidates,
```

- [ ] **Step 4: Test candidates return**

Run backend, call API:
```powershell
$body = '{"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","engine":"alphabeta","evaluator":"material","depth":2,"useMoveOrdering":true}'
$r = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/whitebox/play" -Method Post -Body $body -ContentType "application/json"
$r.candidates | ConvertTo-Json
```

Expected: array of 3 objects with `{move, evaluation, nodes}`.

---

### Task 3: Frontend Types + Puzzle Importer UI

**Files:**
- Modify: `phase2_research/frontend/src/types/whitebox.ts:51-58`
- Create: `phase2_research/frontend/src/components/SearchLab/PuzzleImporter.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx`

- [ ] **Step 1: Add Candidate type to frontend**

```typescript
// In whitebox.ts types, before WhiteboxResult:

export interface Candidate {
  move: string;
  evaluation: number;
  nodes?: number;
}

export interface WhiteboxResult {
  best_move: string | null;
  evaluation: number;
  nodes_evaluated: number;
  nps: number;
  time_ms: number;
  instrumentation?: WhiteboxInstrumentation | null;
  tree: SearchTreeNode;
  candidates?: Candidate[];   // NEW
}
```

- [ ] **Step 2: Create PuzzleImporter.tsx**

```tsx
import { useState } from "react";

type PuzzleData = {
  id: string;
  fen: string;
  rating: number;
  themes: string[];
  solution: string[];
  players: { name: string; color: string; rating: number }[];
};

type Props = {
  onImportFen: (fen: string) => void;
};

export default function PuzzleImporter({ onImportFen }: Props) {
  const [loading, setLoading] = useState(false);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [minRating, setMinRating] = useState(1200);
  const [maxRating, setMaxRating] = useState(2500);

  const fetchPuzzle = async () => {
    setLoading(true);
    try {
      const resp = await fetch(
        `http://localhost:8000/api/puzzle/import?minRating=${minRating}&maxRating=${maxRating}`,
      );
      const data = (await resp.json()) as PuzzleData;
      setPuzzle(data);
      onImportFen(data.fen);
    } catch {
      // ignore errors
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">导入谜题</h3>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-600">评分</span>
        <input
          type="number"
          className="w-16 rounded border border-slate-300 px-1 py-0.5 text-sm"
          value={minRating}
          min={800}
          max={3000}
          onChange={(e) => setMinRating(Number(e.target.value))}
        />
        <span className="text-slate-400">–</span>
        <input
          type="number"
          className="w-16 rounded border border-slate-300 px-1 py-0.5 text-sm"
          value={maxRating}
          min={800}
          max={3000}
          onChange={(e) => setMaxRating(Number(e.target.value))}
        />
      </div>
      <button
        type="button"
        className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50"
        onClick={fetchPuzzle}
        disabled={loading}
      >
        {loading ? "获取中…" : "获取随机谜题"}
      </button>
      {puzzle ? (
        <div className="rounded border border-slate-200 bg-slate-50 p-2 text-sm space-y-1">
          <div>
            <span className="font-medium">#{puzzle.id}</span>
            <span className="ml-2 text-slate-500">评分 {puzzle.rating}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {puzzle.themes.map((t) => (
              <span
                key={t}
                className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="text-xs text-slate-500">
            解法: {puzzle.solution.join(" → ")}
          </div>
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 3: Integrate PuzzleImporter into SearchWorkbench**

```tsx
// In SearchWorkbench.tsx, add import:
import PuzzleImporter from "./PuzzleImporter";

// Add handlePuzzleImport function:
const handlePuzzleImport = (fen: string) => {
  setFenDraft(fen);
  try {
    new Chess(fen);
    const state = createEditorStateFromFen(fen);
    setEditingPosition(state);
    setCommittedPosition(state);
    setSelectedTrayPiece(null);
    setError("");
  } catch {
    setError(INVALID_FEN_MESSAGE);
  }
};

// In JSX, add PuzzleImporter right BEFORE <SearchHyperparamsPanel>:
<PuzzleImporter onImportFen={handlePuzzleImport} />
```

- [ ] **Step 4: Run type-check + focused test**

```bash
npm run type-check
npm test -- SearchWorkbench.test.tsx
```

---

### Task 4: Frontend Multi-PV Candidate Display

**Files:**
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchResultSummary.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchResultSummary.test.tsx`

- [ ] **Step 1: Add candidate row rendering to SearchResultSummary**

Replace the "最佳着法" StatCard with a candidate list when candidates exist:

```tsx
// In SearchResultSummary.tsx, add this block right after the first </p> line and BEFORE the stat grid:

      {result.candidates?.length ? (
        <div className="space-y-1.5">
          {result.candidates.map((c, i) => {
            const isBest = c.move === result.best_move;
            const maxEval = Math.max(
              ...result.candidates!.map((x) => Math.abs(x.evaluation)),
              0.01,
            );
            const barPct = Math.round(
              (Math.abs(c.evaluation) / maxEval) * 100,
            );
            return (
              <div
                key={c.move}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                  isBest
                    ? "border-blue-300 bg-blue-50 font-semibold"
                    : "border-slate-200"
                }`}
              >
                <span className="w-6 text-xs text-slate-400">#{i + 1}</span>
                <span className="w-16 font-mono">{c.move}</span>
                <span
                  className={`w-14 text-right ${
                    c.evaluation > 0
                      ? "text-emerald-600"
                      : c.evaluation < 0
                        ? "text-rose-600"
                        : "text-slate-500"
                  }`}
                >
                  {c.evaluation > 0 ? "+" : ""}
                  {c.evaluation.toFixed(2)}
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      isBest ? "bg-blue-500" : "bg-slate-300"
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="最佳着法" value={result.best_move} />
          ...
        </div>
      )}
```

And keep the rest of the stat grid below as-is (minus best_move which is now in the candidate list):

```tsx
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="评分" value={result.evaluation} />
        ...
      </div>
```

- [ ] **Step 2: Update SearchResultSummary test**

```tsx
// In SearchResultSummary.test.tsx, add a new test:

  it("renders candidate move rows when candidates are present", () => {
    render(
      <SearchResultSummary
        result={{
          best_move: "e4",
          evaluation: 0.12,
          nodes_evaluated: 42,
          nps: 1000,
          time_ms: 50,
          candidates: [
            { move: "e4", evaluation: 0.12 },
            { move: "d4", evaluation: -0.05 },
            { move: "Nf3", evaluation: -0.08 },
          ],
          tree: { id: "r", name: "ROOT", value: 0, node_type: "root", is_pruned: false, metadata: {} },
        }}
      />,
    );

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("e4")).toBeInTheDocument();
    // Verify the old single best_move card is NOT rendered
    expect(screen.queryByText("最佳着法")).not.toBeInTheDocument();
  });
```

- [ ] **Step 3: Run tests**

```bash
npm run type-check
npm test -- SearchResultSummary.test.tsx
```

---

### Task 5: Full Verification & Browser Smoke

- [ ] **Step 1: Full test suite**

```bash
npm test
```

Expected: 11 files, 36+ tests pass (new tests may increase count)

- [ ] **Step 2: Full build**

```bash
npm run type-check
npm run lint
npm run build
```

- [ ] **Step 3: Browser smoke**

- Click "获取随机谜题" → verify puzzle FEN loads on board
- Click "确认并开始计算" → verify Top-3 candidates render
- Switch to MCTS → verify Top-3 candidates render
- Verify candidate rows show: rank (#1/#2/#3), move name, evaluation, bar

- [ ] **Step 4: Final git status**

```bash
git status --short
```

Never stage `phase2_research/backend/results/`.
