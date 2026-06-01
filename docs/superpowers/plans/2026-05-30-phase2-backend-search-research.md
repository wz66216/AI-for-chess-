# Phase 2 Backend Search Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Phase 2 backend whitebox search code into a research-ready baseline by extracting evaluator logic from Alpha-Beta, adding richer Alpha-Beta instrumentation, and upgrading the benchmark harness so later RL-guided evaluators have a clean landing zone.

**Architecture:** Keep the existing FastAPI + whitebox-engine structure, but split responsibilities so Alpha-Beta search no longer owns evaluation logic directly. Introduce a small evaluator module and a structured instrumentation payload, then thread those through the API/schema and benchmark script without attempting any full RL training system.

**Tech Stack:** Python 3.11+, FastAPI, Pydantic, python-chess, pytest, CSV-based benchmark scripts.

---

## Execution Context

All commands in this plan assume the working directory is:

```bash
phase2_research/backend
```

Examples below therefore use backend-local paths like `tests/...`, `app/...`, and `scripts/...`.

---

## File Structure / Responsibility Map

- Create: `phase2_research/backend/app/engines/whitebox/evaluators.py`
  - Defines a small evaluator protocol/base and the first concrete `MaterialEvaluator`.
- Create: `phase2_research/backend/app/engines/whitebox/instrumentation.py`
  - Defines a structured instrumentation stats model/dict builder for Alpha-Beta.
- Modify: `phase2_research/backend/app/engines/whitebox/minimax.py`
  - Inject evaluator dependency, populate instrumentation, and keep tree serialization compatible.
- Modify: `phase2_research/backend/app/engines/whitebox/__init__.py`
  - Export new evaluator/instrumentation symbols used elsewhere.
- Modify: `phase2_research/backend/app/schemas/whitebox.py`
  - Extend request/response models for evaluator selection and instrumentation payload.
- Modify: `phase2_research/backend/app/api/whitebox.py`
  - Construct `AlphaBetaEngine` with evaluator selection and return instrumentation safely.
- Modify: `phase2_research/backend/scripts/benchmark_runner.py`
  - Record richer Alpha-Beta metrics and evaluator identity in benchmark CSVs.
- Create: `phase2_research/backend/tests/engines/whitebox/test_evaluators.py`
  - Unit tests for evaluator behavior.
- Create: `phase2_research/backend/tests/engines/whitebox/test_minimax_instrumentation.py`
  - Tests for Alpha-Beta instrumentation and evaluator injection.
- Create: `phase2_research/backend/tests/api/test_whitebox_api.py`
  - API-level tests for evaluator plumbing and response shape.
- Create: `phase2_research/backend/tests/scripts/test_benchmark_runner.py`
  - Regression tests for benchmark CSV columns and richer metrics.

---

### Task 1: Extract an evaluator module and lock it down with tests

**Files:**
- Create: `phase2_research/backend/app/engines/whitebox/evaluators.py`
- Create: `phase2_research/backend/tests/engines/whitebox/test_evaluators.py`
- Modify: `phase2_research/backend/app/engines/whitebox/__init__.py`

- [ ] **Step 1: Write the failing evaluator tests**

Create `phase2_research/backend/tests/engines/whitebox/test_evaluators.py`:

```python
import chess

from app.engines.whitebox.evaluators import MaterialEvaluator


def test_material_evaluator_returns_zero_for_start_position():
    board = chess.Board()

    assert MaterialEvaluator().evaluate(board) == 0.0


def test_material_evaluator_rewards_extra_white_queen():
    board = chess.Board("4k3/8/8/8/8/8/8/Q3K3 w - - 0 1")

    assert MaterialEvaluator().evaluate(board) == 9.0


def test_material_evaluator_handles_checkmate_and_draw_states():
    mate_board = chess.Board("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1")
    draw_board = chess.Board("8/8/8/8/8/8/2k5/3K4 w - - 0 1")
    evaluator = MaterialEvaluator()

    assert evaluator.evaluate(mate_board) == 9999.0
    assert evaluator.evaluate(draw_board) == 0.0
```

- [ ] **Step 2: Run the evaluator tests to verify they fail**

Run:

```bash
python -m pytest tests/engines/whitebox/test_evaluators.py -v
```

Expected:
- FAIL with `ModuleNotFoundError` or import failure for `app.engines.whitebox.evaluators`

- [ ] **Step 3: Implement the minimal evaluator module**

Create `phase2_research/backend/app/engines/whitebox/evaluators.py`:

```python
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import chess


PIECE_VALUES = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 0,
}


class BoardEvaluator(Protocol):
    name: str

    def evaluate(self, board: chess.Board) -> float:
        ...


@dataclass(slots=True)
class MaterialEvaluator:
    name: str = "material"

    def evaluate(self, board: chess.Board) -> float:
        if board.is_checkmate():
            return -9999.0 if board.turn == chess.WHITE else 9999.0
        if board.is_stalemate() or board.is_insufficient_material():
            return 0.0

        score = 0.0
        for piece_type, piece_value in PIECE_VALUES.items():
            score += len(board.pieces(piece_type, chess.WHITE)) * piece_value
            score -= len(board.pieces(piece_type, chess.BLACK)) * piece_value
        return score
```

Update `phase2_research/backend/app/engines/whitebox/__init__.py`:

```python
from .evaluators import BoardEvaluator, MaterialEvaluator
from .mcts import MCTSEngine
from .minimax import AlphaBetaEngine
from .models import TreeNode

__all__ = [
    "AlphaBetaEngine",
    "BoardEvaluator",
    "MaterialEvaluator",
    "MCTSEngine",
    "TreeNode",
]
```

- [ ] **Step 4: Run the evaluator tests to verify they pass**

Run:

```bash
python -m pytest tests/engines/whitebox/test_evaluators.py -v
```

Expected:
- PASS, 3 tests passed

- [ ] **Step 5: Commit the evaluator extraction**

```bash
git add phase2_research/backend/app/engines/whitebox/evaluators.py phase2_research/backend/app/engines/whitebox/__init__.py phase2_research/backend/tests/engines/whitebox/test_evaluators.py
git commit -m "feat: extract whitebox material evaluator"
```

---

### Task 2: Add Alpha-Beta instrumentation and evaluator injection

**Files:**
- Create: `phase2_research/backend/app/engines/whitebox/instrumentation.py`
- Modify: `phase2_research/backend/app/engines/whitebox/minimax.py`
- Create: `phase2_research/backend/tests/engines/whitebox/test_minimax_instrumentation.py`

- [ ] **Step 1: Write failing Alpha-Beta instrumentation tests**

Create `phase2_research/backend/tests/engines/whitebox/test_minimax_instrumentation.py`:

```python
import chess

from app.engines.whitebox.minimax import AlphaBetaEngine


class StubEvaluator:
    name = "stub"

    def evaluate(self, board: chess.Board) -> float:
        return 1.25


def test_alphabeta_uses_injected_evaluator_name_and_score():
    engine = AlphaBetaEngine(depth=1, use_move_ordering=False, evaluator=StubEvaluator())
    result = engine.search(chess.Board())

    assert result["evaluation"] == 1.25
    assert result["instrumentation"]["evaluator_name"] == "stub"


def test_alphabeta_reports_cutoff_and_depth_metrics():
    engine = AlphaBetaEngine(depth=2, use_move_ordering=True)
    result = engine.search(chess.Board())
    stats = result["instrumentation"]

    assert stats["nodes_evaluated"] >= 1
    assert stats["cutoff_count"] >= 0
    assert stats["max_depth_reached"] >= 1
    assert "per_depth_nodes" in stats
```

- [ ] **Step 2: Run the instrumentation tests to verify they fail**

Run:

```bash
python -m pytest tests/engines/whitebox/test_minimax_instrumentation.py -v
```

Expected:
- FAIL because `AlphaBetaEngine` does not yet accept `evaluator` or return `instrumentation`

- [ ] **Step 3: Create a minimal instrumentation helper**

Create `phase2_research/backend/app/engines/whitebox/instrumentation.py`:

```python
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class AlphaBetaInstrumentation:
    evaluator_name: str
    nodes_evaluated: int = 0
    cutoff_count: int = 0
    max_depth_reached: int = 0
    per_depth_nodes: dict[int, int] = field(default_factory=dict)

    def record_depth(self, depth: int) -> None:
        self.max_depth_reached = max(self.max_depth_reached, depth)
        self.per_depth_nodes[depth] = self.per_depth_nodes.get(depth, 0) + 1

    def as_dict(self) -> dict:
        return {
            "evaluator_name": self.evaluator_name,
            "nodes_evaluated": self.nodes_evaluated,
            "cutoff_count": self.cutoff_count,
            "max_depth_reached": self.max_depth_reached,
            "per_depth_nodes": dict(sorted(self.per_depth_nodes.items())),
        }
```

- [ ] **Step 4: Inject the evaluator and instrumentation into Alpha-Beta**

Update `phase2_research/backend/app/engines/whitebox/minimax.py` to this shape:

```python
from __future__ import annotations

import time

import chess

from .evaluators import BoardEvaluator, MaterialEvaluator
from .instrumentation import AlphaBetaInstrumentation
from .models import TreeNode


class AlphaBetaEngine:
    def __init__(
        self,
        depth: int = 3,
        use_move_ordering: bool = True,
        evaluator: BoardEvaluator | None = None,
    ):
        self.depth = depth
        self.use_move_ordering = use_move_ordering
        self.evaluator = evaluator or MaterialEvaluator()
        self.nodes_evaluated = 0
        self.stats = AlphaBetaInstrumentation(evaluator_name=self.evaluator.name)

    def evaluate_board(self, board: chess.Board) -> float:
        self.nodes_evaluated += 1
        self.stats.nodes_evaluated = self.nodes_evaluated
        return self.evaluator.evaluate(board)

    def search(self, board: chess.Board) -> dict:
        self.nodes_evaluated = 0
        self.stats = AlphaBetaInstrumentation(evaluator_name=self.evaluator.name)
        start_time = time.time()
        root = TreeNode(id="root", name="root", value=0.0, node_type="root", metadata={})
        best_move, evaluation = self._alphabeta(board, self.depth, -float("inf"), float("inf"), board.turn == chess.WHITE, root, current_depth=0)
        elapsed = time.time() - start_time
        return {
            "best_move": best_move.uci() if best_move else None,
            "evaluation": evaluation,
            "nodes_evaluated": self.nodes_evaluated,
            "nps": self.nodes_evaluated / elapsed if elapsed > 0 else 0,
            "time_ms": elapsed * 1000,
            "tree": root.dict_for_viz(),
            "instrumentation": self.stats.as_dict(),
        }

    def _alphabeta(self, board, depth, alpha, beta, maximizing_player, node, current_depth):
        self.stats.record_depth(current_depth)
        if depth == 0 or board.is_game_over():
            value = self.evaluate_board(board)
            node.value = value
            return None, value
        moves = self.order_moves(board, list(board.legal_moves))
        best_move = None
        if maximizing_player:
            best_value = -float("inf")
            for move in moves:
                board.push(move)
                child = TreeNode(id=f"{node.id}-{move.uci()}", name=move.uci(), value=0.0, node_type="move", metadata={"alpha": alpha, "beta": beta})
                node.children.append(child)
                _, value = self._alphabeta(board, depth - 1, alpha, beta, False, child, current_depth + 1)
                board.pop()
                if value > best_value:
                    best_value = value
                    best_move = move
                alpha = max(alpha, best_value)
                if beta <= alpha:
                    self.stats.cutoff_count += 1
                    break
            node.value = best_value
            return best_move, best_value
        best_value = float("inf")
        for move in moves:
            board.push(move)
            child = TreeNode(id=f"{node.id}-{move.uci()}", name=move.uci(), value=0.0, node_type="move", metadata={"alpha": alpha, "beta": beta})
            node.children.append(child)
            _, value = self._alphabeta(board, depth - 1, alpha, beta, True, child, current_depth + 1)
            board.pop()
            if value < best_value:
                best_value = value
                best_move = move
            beta = min(beta, best_value)
            if beta <= alpha:
                self.stats.cutoff_count += 1
                break
        node.value = best_value
        return best_move, best_value
```

- [ ] **Step 5: Run the new Alpha-Beta tests**

Run:

```bash
python -m pytest tests/engines/whitebox/test_minimax_instrumentation.py -v
```

Expected:
- PASS, 2 tests passed

- [ ] **Step 6: Run the evaluator + Alpha-Beta test subset together**

Run:

```bash
python -m pytest tests/engines/whitebox/test_evaluators.py tests/engines/whitebox/test_minimax_instrumentation.py -v
```

Expected:
- PASS, 5 tests passed

- [ ] **Step 7: Commit the Alpha-Beta instrumentation work**

```bash
git add phase2_research/backend/app/engines/whitebox/instrumentation.py phase2_research/backend/app/engines/whitebox/minimax.py phase2_research/backend/tests/engines/whitebox/test_minimax_instrumentation.py
git commit -m "feat: instrument whitebox alphabeta engine"
```

---

### Task 3: Expose evaluator + instrumentation through the whitebox API

**Files:**
- Modify: `phase2_research/backend/app/schemas/whitebox.py`
- Modify: `phase2_research/backend/app/api/whitebox.py`
- Create: `phase2_research/backend/tests/api/test_whitebox_api.py`

- [ ] **Step 1: Write failing API tests**

Create `phase2_research/backend/tests/api/test_whitebox_api.py`:

```python
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_whitebox_api_accepts_material_evaluator_and_returns_instrumentation():
    response = client.post(
        "/api/whitebox/play",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "engine": "alphabeta",
            "depth": 2,
            "use_move_ordering": True,
            "evaluator": "material",
        },
    )

    payload = response.json()
    assert response.status_code == 200
    assert payload["instrumentation"]["evaluator_name"] == "material"


def test_whitebox_api_rejects_unknown_evaluator_name():
    response = client.post(
        "/api/whitebox/play",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "engine": "alphabeta",
            "evaluator": "mystery",
        },
    )

    assert response.status_code == 400
```

- [ ] **Step 2: Run the API tests to verify they fail**

Run:

```bash
python -m pytest tests/api/test_whitebox_api.py -v
```

Expected:
- FAIL because request/response schema does not yet include `evaluator` or `instrumentation`

- [ ] **Step 3: Extend the whitebox schema**

Update `phase2_research/backend/app/schemas/whitebox.py`:

```python
from typing import Any, Literal

from pydantic import BaseModel, Field


class WhiteboxRequest(BaseModel):
    fen: str
    engine: Literal["alphabeta", "mcts"] = "alphabeta"
    depth: int = Field(default=3, ge=1, le=6)
    use_move_ordering: bool = True
    evaluator: Literal["material"] = "material"
    mcts_iterations: int = Field(default=100, ge=1, le=5000)
    mcts_exploration_constant: float = Field(default=1.414, gt=0)


class WhiteboxResponse(BaseModel):
    best_move: str | None
    evaluation: float
    nodes_evaluated: int
    nps: float
    time_ms: float
    tree: dict[str, Any]
    instrumentation: dict[str, Any] = Field(default_factory=dict)
```

- [ ] **Step 4: Thread evaluator selection through the API**

Update `phase2_research/backend/app/api/whitebox.py`:

```python
import chess
from fastapi import APIRouter, HTTPException

from app.engines.whitebox import AlphaBetaEngine, MaterialEvaluator, MCTSEngine
from app.schemas.whitebox import WhiteboxRequest, WhiteboxResponse


router = APIRouter(prefix="/api/whitebox", tags=["whitebox"])


def build_evaluator(name: str):
    if name == "material":
        return MaterialEvaluator()
    raise HTTPException(status_code=400, detail=f"Unsupported evaluator: {name}")


@router.post("/play", response_model=WhiteboxResponse)
async def play(req: WhiteboxRequest):
    try:
        board = chess.Board(req.fen)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {exc}") from exc

    if req.engine == "alphabeta":
        engine = AlphaBetaEngine(
            depth=req.depth,
            use_move_ordering=req.use_move_ordering,
            evaluator=build_evaluator(req.evaluator),
        )
    elif req.engine == "mcts":
        engine = MCTSEngine(
            iterations=req.mcts_iterations,
            exploration_constant=req.mcts_exploration_constant,
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unknown engine: {req.engine}")

    return WhiteboxResponse(**engine.search(board))
```

- [ ] **Step 5: Run the API tests to verify they pass**

Run:

```bash
python -m pytest tests/api/test_whitebox_api.py -v
```

Expected:
- PASS, 2 tests passed

- [ ] **Step 6: Run the whitebox backend test suite so far**

Run:

```bash
python -m pytest tests/engines/whitebox/test_evaluators.py tests/engines/whitebox/test_minimax_instrumentation.py tests/api/test_whitebox_api.py -v
```

Expected:
- PASS, all tests green

- [ ] **Step 7: Commit the API/schema extension**

```bash
git add phase2_research/backend/app/schemas/whitebox.py phase2_research/backend/app/api/whitebox.py phase2_research/backend/tests/api/test_whitebox_api.py
git commit -m "feat: expose whitebox evaluator instrumentation"
```

---

### Task 4: Upgrade the benchmark harness for research-grade Alpha-Beta comparisons

**Files:**
- Modify: `phase2_research/backend/scripts/benchmark_runner.py`
- Create: `phase2_research/backend/tests/scripts/test_benchmark_runner.py`

- [ ] **Step 1: Write failing benchmark-runner tests**

Create `phase2_research/backend/tests/scripts/test_benchmark_runner.py`:

```python
from scripts.benchmark_runner import fetch_puzzles, make_result_row


def test_fetch_puzzles_returns_nonempty_suite_with_ids_and_fens():
    puzzles = fetch_puzzles()

    assert puzzles
    assert {"id", "fen"}.issubset(puzzles[0].keys())


def test_make_result_row_includes_research_columns():
    row = make_result_row(
        puzzle_id="opening_1",
        engine_name="alphabeta",
        engine_config={"depth": 3, "use_ordering": True, "evaluator": "material"},
        result={
            "best_move": "e2e4",
            "nodes_evaluated": 42,
            "time_ms": 12.5,
            "nps": 3360.0,
            "evaluation": 0.3,
            "instrumentation": {
                "evaluator_name": "material",
                "cutoff_count": 7,
                "max_depth_reached": 3,
            },
        },
    )

    assert row["evaluator"] == "material"
    assert row["cutoff_count"] == 7
    assert row["max_depth_reached"] == 3
```

- [ ] **Step 2: Run the benchmark-runner tests to verify they fail**

Run:

```bash
python -m pytest tests/scripts/test_benchmark_runner.py -v
```

Expected:
- FAIL because `make_result_row` does not exist yet and CSV rows do not expose instrumentation columns

- [ ] **Step 3: Refactor the benchmark runner into explicit row-building helpers**

Update `phase2_research/backend/scripts/benchmark_runner.py` to introduce a helper like:

```python
def make_result_row(puzzle_id: str, engine_name: str, engine_config: dict, result: dict) -> dict:
    instrumentation = result.get("instrumentation", {})
    return {
        "puzzle_id": puzzle_id,
        "engine": engine_name,
        **engine_config,
        "best_move": result.get("best_move"),
        "nodes": result.get("nodes_evaluated"),
        "time_ms": result.get("time_ms"),
        "nps": result.get("nps"),
        "evaluation": result.get("evaluation"),
        "evaluator": instrumentation.get("evaluator_name", engine_config.get("evaluator", "n/a")),
        "cutoff_count": instrumentation.get("cutoff_count", 0),
        "max_depth_reached": instrumentation.get("max_depth_reached", 0),
    }
```

And use that helper inside `run_benchmark()` when appending Alpha-Beta rows.

- [ ] **Step 4: Keep the benchmark sweep intentionally narrow**

When updating Alpha-Beta rows, keep the sweep small and aligned with the design doc:

```python
for depth in [2, 3, 4]:
    for use_ordering in [True, False]:
        engine = AlphaBetaEngine(depth=depth, use_move_ordering=use_ordering, evaluator=MaterialEvaluator())
        result = engine.search(board.copy())
        results.append(
            make_result_row(
                puzzle_id=puzzle["id"],
                engine_name="alphabeta",
                engine_config={
                    "depth": depth,
                    "use_ordering": use_ordering,
                    "evaluator": "material",
                },
                result=result,
            )
        )
```

Do **not** add repeated-trial MCTS statistics or learned evaluators yet; those belong to later work.

- [ ] **Step 5: Run the benchmark-runner tests to verify they pass**

Run:

```bash
python -m pytest tests/scripts/test_benchmark_runner.py -v
```

Expected:
- PASS, 2 tests passed

- [ ] **Step 6: Run the full backend test suite introduced by this plan**

Run:

```bash
python -m pytest tests -v
```

Expected:
- PASS, all newly added backend research tests green

- [ ] **Step 7: Run a real benchmark smoke test**

Run:

```bash
python scripts/benchmark_runner.py
```

Expected:
- completes successfully
- writes a CSV under `phase2_research/backend/results/`
- CSV contains columns for `evaluator`, `cutoff_count`, and `max_depth_reached`

- [ ] **Step 8: Commit the benchmark upgrade**

```bash
git add phase2_research/backend/scripts/benchmark_runner.py phase2_research/backend/tests/scripts/test_benchmark_runner.py
git commit -m "feat: enrich whitebox benchmark metrics"
```

---

## Final verification checklist

- [ ] Run the backend test suite:

```bash
python -m pytest tests -v
```

- [ ] Run a type/syntax sanity pass:

```bash
python -m compileall app scripts
```

- [ ] Run the benchmark smoke test:

```bash
python scripts/benchmark_runner.py
```

- [ ] If the API was changed, run the backend locally and sanity-check one request:

```bash
uvicorn app.main:app --reload --port 8000
```

Then in another shell:

```bash
curl -X POST http://127.0.0.1:8000/api/whitebox/play ^
  -H "Content-Type: application/json" ^
  -d "{\"fen\":\"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1\",\"engine\":\"alphabeta\",\"depth\":2,\"use_move_ordering\":true,\"evaluator\":\"material\"}"
```

Expected:
- HTTP 200
- JSON includes `instrumentation.evaluator_name == "material"`

---

## Self-review against the design doc

### Coverage check

- Phase A instrumentation: covered by Task 2 and Task 4.
- Phase B evaluator abstraction: covered by Task 1 and Task 2.
- API/schema seam for future RL-guided evaluators: covered by Task 3, but intentionally constrained to `material` only.
- Benchmark strengthening: covered by Task 4.
- Explicit non-goals preserved: no self-play RL, no learned model serving, no AlphaZero-like integration.

### Placeholder scan

- No `TODO` / `TBD` placeholders remain.
- Each task names concrete files, commands, and expected failures/passes.
- Each implementation step includes concrete code, not just prose.

### Type consistency check

- `MaterialEvaluator` is the only evaluator introduced in this plan and is referenced consistently across tests, engine wiring, schema defaults, API plumbing, and benchmark rows.
- `instrumentation` is consistently a `dict[str, Any]` at the API boundary, populated from `AlphaBetaInstrumentation.as_dict()` inside the engine.
- `make_result_row()` is introduced before the benchmark task depends on it.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-30-phase2-backend-search-research.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
