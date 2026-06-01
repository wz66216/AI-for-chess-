# Phase 2 Heuristic Evaluator Ladder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bounded handcrafted evaluator ladder for the Phase 2 whitebox Alpha-Beta engine so the backend can compare `material`, `pst`, and `heuristic` evaluation quality under the same search loop.

**Architecture:** Keep `AlphaBetaEngine` as the search orchestrator and expand the evaluator seam that already exists. Add two new handcrafted evaluators plus a small evaluator factory, thread evaluator selection through the whitebox API/schema, and extend the benchmark harness so evaluator variants become first-class experiment dimensions without touching MCTS behavior.

**Tech Stack:** Python 3.11+, FastAPI, Pydantic, python-chess, pytest, CSV benchmark scripts.

---

## Execution Context

All commands in this plan assume the working directory is:

```bash
phase2_research/backend
```

Examples below therefore use backend-local paths like `tests/...`, `app/...`, and `scripts/...`.

---

## File Structure / Responsibility Map

- Modify: `phase2_research/backend/app/engines/whitebox/evaluators.py`
  - Extend the current single `MaterialEvaluator` module into a small evaluator ladder with a builder/factory and shared scoring helpers.
- Modify: `phase2_research/backend/app/engines/whitebox/__init__.py`
  - Export new evaluator symbols and builder functions used by API/tests.
- Modify: `phase2_research/backend/app/engines/whitebox/minimax.py`
  - Keep search behavior stable while allowing richer evaluator variants to flow through instrumentation cleanly.
- Modify: `phase2_research/backend/app/schemas/whitebox.py`
  - Expand evaluator `Literal` from only `"material"` to the full handcrafted ladder.
- Modify: `phase2_research/backend/app/api/whitebox.py`
  - Replace the ad-hoc `if req.evaluator == "material"` dispatch with a small evaluator builder call.
- Modify: `phase2_research/backend/scripts/benchmark_runner.py`
  - Sweep Alpha-Beta across evaluator variants and preserve stable benchmark CSV rows.
- Modify: `phase2_research/backend/tests/engines/whitebox/test_evaluators.py`
  - Lock in evaluator semantics, builder behavior, and simple positional preferences.
- Modify: `phase2_research/backend/tests/engines/whitebox/test_minimax_instrumentation.py`
  - Verify Alpha-Beta instrumentation exposes evaluator variant names beyond `material`.
- Modify: `phase2_research/backend/tests/api/test_whitebox_api.py`
  - Verify API accepts the evaluator ladder and still rejects unknown evaluators via schema validation.
- Modify: `phase2_research/backend/tests/scripts/test_benchmark_runner.py`
  - Verify benchmark rows and evaluator sweeps stay explicit and stable.

---

### Task 1: Expand the evaluator ladder in `evaluators.py`

**Files:**
- Modify: `phase2_research/backend/app/engines/whitebox/evaluators.py`
- Modify: `phase2_research/backend/app/engines/whitebox/__init__.py`
- Modify: `phase2_research/backend/tests/engines/whitebox/test_evaluators.py`

- [ ] **Step 1: Write failing evaluator-ladder tests**

Update `tests/engines/whitebox/test_evaluators.py` to:

```python
import chess

from app.engines.whitebox.evaluators import (
    HeuristicEvaluator,
    MaterialEvaluator,
    PstEvaluator,
    available_evaluator_names,
    build_evaluator,
)


def test_material_evaluator_returns_zero_for_start_position():
    board = chess.Board()

    assert MaterialEvaluator().evaluate(board) == 0.0


def test_material_evaluator_rewards_extra_white_queen():
    board = chess.Board("4k3/8/8/8/8/8/8/Q3K3 w - - 0 1")

    assert MaterialEvaluator().evaluate(board) == 900.0


def test_material_evaluator_handles_checkmate_and_draw_states():
    mate_board = chess.Board("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1")
    draw_board = chess.Board("8/8/8/8/8/8/2k5/3K4 w - - 0 1")
    evaluator = MaterialEvaluator()

    assert evaluator.evaluate(mate_board) == 99999.0
    assert evaluator.evaluate(draw_board) == 0.0


def test_available_evaluator_names_exposes_stable_handcrafted_ladder():
    assert available_evaluator_names() == ("material", "pst", "heuristic")


def test_build_evaluator_returns_expected_concrete_variants():
    assert isinstance(build_evaluator("material"), MaterialEvaluator)
    assert isinstance(build_evaluator("pst"), PstEvaluator)
    assert isinstance(build_evaluator("heuristic"), HeuristicEvaluator)


def test_pst_evaluator_prefers_centralized_knight_to_corner_knight():
    center_board = chess.Board("4k3/8/8/3N4/8/8/8/4K3 w - - 0 1")
    corner_board = chess.Board("4k3/8/8/8/8/8/8/N3K3 w - - 0 1")
    evaluator = PstEvaluator()

    assert evaluator.evaluate(center_board) > evaluator.evaluate(corner_board)


def test_heuristic_evaluator_rewards_active_castled_position_over_passive_one():
    active_board = chess.Board("rnbq1rk1/pppp1ppp/5n2/4p3/3PP3/5N2/PPP2PPP/RNBQ1RK1 w - - 0 6")
    passive_board = chess.Board("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
    evaluator = HeuristicEvaluator()

    assert evaluator.evaluate(active_board) > evaluator.evaluate(passive_board)
```

- [ ] **Step 2: Run the evaluator tests to verify the new ladder cases fail**

Run:

```bash
python -m pytest tests/engines/whitebox/test_evaluators.py -v
```

Expected:
- FAIL because `PstEvaluator`, `HeuristicEvaluator`, `available_evaluator_names`, and `build_evaluator` do not exist yet.

- [ ] **Step 3: Implement the minimal evaluator ladder**

Replace `app/engines/whitebox/evaluators.py` with:

```python
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

import chess


EvaluatorName = Literal["material", "pst", "heuristic"]

PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 0,
}

KNIGHT_PST = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
]

PAWN_PST = [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, -20, -20, 10, 10, 5,
    5, -5, -10, 0, 0, -10, -5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, 5, 10, 25, 25, 10, 5, 5,
    10, 10, 20, 30, 30, 20, 10, 10,
    50, 50, 50, 50, 50, 50, 50, 50,
    0, 0, 0, 0, 0, 0, 0, 0,
]

BISHOP_PST = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
]

ROOK_PST = [
    0, 0, 0, 5, 5, 0, 0, 0,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    5, 10, 10, 10, 10, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
]

QUEEN_PST = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 5, 0, -10,
    -10, 0, 5, 5, 5, 5, 5, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
]

KING_PST = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
]

PST_TABLES = {
    chess.PAWN: PAWN_PST,
    chess.KNIGHT: KNIGHT_PST,
    chess.BISHOP: BISHOP_PST,
    chess.ROOK: ROOK_PST,
    chess.QUEEN: QUEEN_PST,
    chess.KING: KING_PST,
}


class BoardEvaluator(Protocol):
    name: str

    def evaluate(self, board: chess.Board) -> float:
        ...


def _terminal_or_draw_score(board: chess.Board) -> float | None:
    if board.is_checkmate():
        return -99999.0 if board.turn == chess.WHITE else 99999.0
    if board.is_stalemate() or board.is_insufficient_material():
        return 0.0
    return None


def _material_score(board: chess.Board) -> float:
    score = 0.0
    for piece_type, piece_value in PIECE_VALUES.items():
        score += len(board.pieces(piece_type, chess.WHITE)) * piece_value
        score -= len(board.pieces(piece_type, chess.BLACK)) * piece_value
    return score


def _pst_score(board: chess.Board) -> float:
    score = 0.0
    for piece_type, table in PST_TABLES.items():
        for square in board.pieces(piece_type, chess.WHITE):
            score += table[square]
        for square in board.pieces(piece_type, chess.BLACK):
            score -= table[chess.square_mirror(square)]
    return score


def _mobility_score(board: chess.Board) -> float:
    white_board = board.copy(stack=False)
    white_board.turn = chess.WHITE
    black_board = board.copy(stack=False)
    black_board.turn = chess.BLACK
    return 5.0 * (white_board.legal_moves.count() - black_board.legal_moves.count())


def _pawn_structure_score(board: chess.Board) -> float:
    score = 0.0
    for color, sign in ((chess.WHITE, 1.0), (chess.BLACK, -1.0)):
        pawns = board.pieces(chess.PAWN, color)
        files = [chess.square_file(square) for square in pawns]
        for file_index in set(files):
            count = files.count(file_index)
            if count > 1:
                score -= sign * 12.0 * (count - 1)
        for square in pawns:
            file_index = chess.square_file(square)
            if file_index - 1 not in files and file_index + 1 not in files:
                score -= sign * 8.0
    return score


def _king_safety_score(board: chess.Board) -> float:
    score = 0.0
    for color, sign in ((chess.WHITE, 1.0), (chess.BLACK, -1.0)):
        king_square = board.king(color)
        if king_square is None:
            continue
        if king_square in {chess.G1, chess.C1, chess.G8, chess.C8}:
            score += sign * 35.0
        elif king_square in {chess.E1, chess.E8}:
            score -= sign * 15.0
    return score


@dataclass(slots=True)
class MaterialEvaluator:
    name: str = "material"

    def evaluate(self, board: chess.Board) -> float:
        terminal = _terminal_or_draw_score(board)
        if terminal is not None:
            return terminal
        return _material_score(board)


@dataclass(slots=True)
class PstEvaluator:
    name: str = "pst"

    def evaluate(self, board: chess.Board) -> float:
        terminal = _terminal_or_draw_score(board)
        if terminal is not None:
            return terminal
        return _material_score(board) + _pst_score(board)


@dataclass(slots=True)
class HeuristicEvaluator:
    name: str = "heuristic"

    def evaluate(self, board: chess.Board) -> float:
        terminal = _terminal_or_draw_score(board)
        if terminal is not None:
            return terminal
        return (
            _material_score(board)
            + _pst_score(board)
            + _mobility_score(board)
            + _pawn_structure_score(board)
            + _king_safety_score(board)
        )


def available_evaluator_names() -> tuple[EvaluatorName, ...]:
    return ("material", "pst", "heuristic")


def build_evaluator(name: EvaluatorName) -> BoardEvaluator:
    if name == "material":
        return MaterialEvaluator()
    if name == "pst":
        return PstEvaluator()
    return HeuristicEvaluator()
```

Update `app/engines/whitebox/__init__.py` to:

```python
from .evaluators import (
    BoardEvaluator,
    HeuristicEvaluator,
    MaterialEvaluator,
    PstEvaluator,
    available_evaluator_names,
    build_evaluator,
)
from .instrumentation import AlphaBetaInstrumentation
from .mcts import MCTSEngine
from .minimax import AlphaBetaEngine
from .models import TreeNode

__all__ = [
    "AlphaBetaEngine",
    "AlphaBetaInstrumentation",
    "BoardEvaluator",
    "HeuristicEvaluator",
    "MaterialEvaluator",
    "MCTSEngine",
    "PstEvaluator",
    "TreeNode",
    "available_evaluator_names",
    "build_evaluator",
]
```

- [ ] **Step 4: Run the evaluator tests to verify the ladder passes**

Run:

```bash
python -m pytest tests/engines/whitebox/test_evaluators.py -v
```

Expected:
- PASS, 7 tests passed.

- [ ] **Step 5: Commit the evaluator ladder expansion**

```bash
git add phase2_research/backend/app/engines/whitebox/evaluators.py phase2_research/backend/app/engines/whitebox/__init__.py phase2_research/backend/tests/engines/whitebox/test_evaluators.py
git commit -m "feat: add heuristic evaluator ladder"
```

---

### Task 2: Wire evaluator variants through Alpha-Beta instrumentation and the whitebox API

**Files:**
- Modify: `phase2_research/backend/app/engines/whitebox/minimax.py`
- Modify: `phase2_research/backend/app/schemas/whitebox.py`
- Modify: `phase2_research/backend/app/api/whitebox.py`
- Modify: `phase2_research/backend/tests/engines/whitebox/test_minimax_instrumentation.py`
- Modify: `phase2_research/backend/tests/api/test_whitebox_api.py`

- [ ] **Step 1: Write failing Alpha-Beta/API tests for evaluator variants**

Update `tests/engines/whitebox/test_minimax_instrumentation.py` by appending:

```python
from app.engines.whitebox import build_evaluator


def test_alphabeta_instrumentation_reports_pst_variant_name():
    engine = AlphaBetaEngine(depth=1, evaluator=build_evaluator("pst"))

    result = engine.search(chess.Board())

    assert result["instrumentation"]["evaluator_name"] == "pst"


def test_alphabeta_instrumentation_reports_heuristic_variant_name():
    engine = AlphaBetaEngine(depth=1, evaluator=build_evaluator("heuristic"))

    result = engine.search(chess.Board())

    assert result["instrumentation"]["evaluator_name"] == "heuristic"
```

Update `tests/api/test_whitebox_api.py` by appending:

```python
def test_whitebox_accepts_pst_evaluator_for_alphabeta():
    response = client.post(
        "/api/whitebox/play",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "engine": "alphabeta",
            "depth": 1,
            "evaluator": "pst",
        },
    )

    assert response.status_code == 200
    assert response.json()["instrumentation"]["evaluator_name"] == "pst"


def test_whitebox_accepts_heuristic_evaluator_for_alphabeta():
    response = client.post(
        "/api/whitebox/play",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "engine": "alphabeta",
            "depth": 1,
            "evaluator": "heuristic",
        },
    )

    assert response.status_code == 200
    assert response.json()["instrumentation"]["evaluator_name"] == "heuristic"
```

- [ ] **Step 2: Run the focused Alpha-Beta/API tests to verify they fail**

Run:

```bash
python -m pytest tests/engines/whitebox/test_minimax_instrumentation.py tests/api/test_whitebox_api.py -v
```

Expected:
- FAIL because schema/API currently only accept `"material"` and the builder is not wired through the API.

- [ ] **Step 3: Implement evaluator-ladder plumbing with minimal code changes**

Update `app/schemas/whitebox.py`:

```python
from pydantic import BaseModel, Field
from typing import Literal
from typing import Optional, Dict, Any


class WhiteboxRequest(BaseModel):
    fen: str = Field(..., description="FEN string of the current board position")
    engine: Literal["alphabeta", "mcts"] = Field(..., description="Type of engine: 'alphabeta' or 'mcts'")
    evaluator: Literal["material", "pst", "heuristic"] = Field("material", description="Alpha-Beta evaluator to use")

    depth: int = Field(3, ge=1, le=12, description="Search depth for Alpha-Beta")
    use_move_ordering: bool = Field(True, description="Enable heuristic move ordering (MVV-LVA)")

    mcts_iterations: int = Field(100, ge=1, le=100000, description="Number of Monte Carlo iterations")
    mcts_exploration_constant: float = Field(1.414, gt=0.0, le=10.0, description="Exploration constant (c) in UCB1 formula")


class WhiteboxResponse(BaseModel):
    best_move: Optional[str] = Field(None, description="The best move selected by the engine in UCI format")
    evaluation: float = Field(..., description="Evaluation score of the position")
    nodes_evaluated: int = Field(..., description="Total number of evaluated leaf nodes")
    nps: int = Field(..., description="Nodes Per Second calculation")
    time_ms: int = Field(..., description="Total calculation time in milliseconds")
    instrumentation: Optional[Dict[str, Any]] = Field(None, description="Search instrumentation data")
    tree: Dict[str, Any] = Field(..., description="JSON serialized search tree for visualization")
```

Update `app/api/whitebox.py`:

```python
from fastapi import APIRouter, HTTPException
from typing import Any
import chess

from app.schemas.whitebox import WhiteboxRequest, WhiteboxResponse
from app.engines.whitebox import AlphaBetaEngine, MCTSEngine, build_evaluator

router = APIRouter()


@router.post("/play", response_model=WhiteboxResponse)
async def play_whitebox(req: WhiteboxRequest) -> Any:
    try:
        board = chess.Board(req.fen)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid FEN string")

    if req.engine == "alphabeta":
        engine = AlphaBetaEngine(
            depth=req.depth,
            use_move_ordering=req.use_move_ordering,
            evaluator=build_evaluator(req.evaluator),
        )
    else:
        engine = MCTSEngine(
            iterations=req.mcts_iterations,
            exploration_constant=req.mcts_exploration_constant,
        )

    try:
        result = engine.search(board)
        return WhiteboxResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
```

Update `app/engines/whitebox/minimax.py` only to remove the stale local `PIECE_VALUES` block, leaving evaluator injection/instrumentation behavior otherwise unchanged.

- [ ] **Step 4: Run the focused Alpha-Beta/API tests to verify they pass**

Run:

```bash
python -m pytest tests/engines/whitebox/test_minimax_instrumentation.py tests/api/test_whitebox_api.py -v
```

Expected:
- PASS, all evaluator-variant Alpha-Beta/API tests pass.

- [ ] **Step 5: Commit evaluator API plumbing**

```bash
git add phase2_research/backend/app/engines/whitebox/minimax.py phase2_research/backend/app/schemas/whitebox.py phase2_research/backend/app/api/whitebox.py phase2_research/backend/tests/engines/whitebox/test_minimax_instrumentation.py phase2_research/backend/tests/api/test_whitebox_api.py
git commit -m "feat: expose heuristic evaluator ladder in whitebox api"
```

---

### Task 3: Make the benchmark harness compare evaluator variants explicitly

**Files:**
- Modify: `phase2_research/backend/scripts/benchmark_runner.py`
- Modify: `phase2_research/backend/tests/scripts/test_benchmark_runner.py`

- [ ] **Step 1: Write failing benchmark tests for evaluator sweeps**

Update `tests/scripts/test_benchmark_runner.py` by appending:

```python
from scripts.benchmark_runner import ALPHABETA_EVALUATORS


def test_alphabeta_evaluator_ladder_is_explicit_and_stable():
    assert ALPHABETA_EVALUATORS == ("material", "pst", "heuristic")


def test_make_result_row_preserves_selected_evaluator_name():
    row = make_result_row(
        puzzle_id="puzzle_eval",
        engine="alphabeta",
        param_1_name="depth",
        param_1_val=2,
        param_2_name="use_ordering",
        param_2_val=True,
        result={
            "best_move": "e2e4",
            "nodes_evaluated": 8,
            "time_ms": 2,
            "nps": 4000,
            "evaluation": 35.0,
            "instrumentation": {
                "cutoffs": 1,
                "nodes_visited": 9,
                "leaf_evaluations": 8,
                "generated_children": 20,
                "remaining_depth_counts": {2: 1, 1: 8},
                "children_by_remaining_depth": {2: 20},
                "evaluator_name": "heuristic",
            },
        },
        evaluator_name="heuristic",
    )

    assert row["evaluator"] == "heuristic"
```

- [ ] **Step 2: Run the benchmark tests to verify they fail**

Run:

```bash
python -m pytest tests/scripts/test_benchmark_runner.py -v
```

Expected:
- FAIL because `ALPHABETA_EVALUATORS` is not defined yet.

- [ ] **Step 3: Implement the minimal evaluator sweep in the benchmark harness**

Update `scripts/benchmark_runner.py` to:

```python
import sys
import os
import csv
import time
import chess
import urllib.request
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

sys.path.append(str(Path(__file__).parent.parent))

from app.engines.whitebox import AlphaBetaEngine, MCTSEngine, build_evaluator


ALPHABETA_EVALUATORS = ("material", "pst", "heuristic")

CSV_FIELDNAMES = [
    "puzzle_id",
    "engine",
    "param_1_name",
    "param_1_val",
    "param_2_name",
    "param_2_val",
    "best_move",
    "nodes",
    "time_ms",
    "nps",
    "evaluation",
    "evaluator",
    "cutoffs",
    "cutoff_count",
    "max_depth_reached",
    "nodes_visited",
    "leaf_evaluations",
    "generated_children",
    "remaining_depth_counts",
    "children_by_remaining_depth",
]


def make_result_row(
    *,
    puzzle_id: str,
    engine: str,
    param_1_name: str,
    param_1_val: Any,
    param_2_name: str,
    param_2_val: Any,
    result: Dict[str, Any],
    evaluator_name: Optional[str] = None,
) -> Dict[str, Any]:
    row = {
        "puzzle_id": puzzle_id,
        "engine": engine,
        "param_1_name": param_1_name,
        "param_1_val": param_1_val,
        "param_2_name": param_2_name,
        "param_2_val": param_2_val,
        "best_move": result.get("best_move"),
        "nodes": result.get("nodes_evaluated"),
        "time_ms": result.get("time_ms"),
        "nps": result.get("nps"),
        "evaluation": result.get("evaluation"),
        "evaluator": evaluator_name,
        "cutoffs": None,
        "cutoff_count": None,
        "max_depth_reached": None,
        "nodes_visited": None,
        "leaf_evaluations": None,
        "generated_children": None,
        "remaining_depth_counts": None,
        "children_by_remaining_depth": None,
    }

    instrumentation = result.get("instrumentation") or {}
    if engine == "alphabeta" and instrumentation:
        remaining_depth_counts = instrumentation.get("remaining_depth_counts", {})
        max_depth_reached = None
        if remaining_depth_counts and param_1_name == "depth":
            requested_depth = int(param_1_val)
            min_remaining_depth = min(int(depth) for depth in remaining_depth_counts.keys())
            max_depth_reached = requested_depth - min_remaining_depth
        row.update(
            {
                "evaluator": evaluator_name,
                "cutoffs": instrumentation.get("cutoffs"),
                "cutoff_count": instrumentation.get("cutoffs"),
                "max_depth_reached": max_depth_reached,
                "nodes_visited": instrumentation.get("nodes_visited"),
                "leaf_evaluations": instrumentation.get("leaf_evaluations"),
                "generated_children": instrumentation.get("generated_children"),
                "remaining_depth_counts": json.dumps(remaining_depth_counts, sort_keys=True),
                "children_by_remaining_depth": json.dumps(instrumentation.get("children_by_remaining_depth", {}), sort_keys=True),
            }
        )

    return row


def fetch_puzzles(count: int = 10) -> list:
    print(f"Fetching {count} puzzles from Lichess...")
    puzzles = []
    hardcoded_fens = [
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5",
        "r1bqk2r/ppppbppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 6",
        "8/8/8/4k3/8/8/4K3/8 w - - 0 1",
        "1k6/8/8/8/8/8/8/1K5R w - - 0 1",
        "r2q1rk1/1b2bppp/p1n1pn2/1p6/3P4/P1N2N2/1P1B1PPP/RB1QR1K1 w - - 1 15",
        "8/p7/1p6/2p5/2P5/1P6/P7/8 w - - 0 1",
        "2r1r1k1/pp3pbp/1qn3p1/3p1b2/3P4/B3PN2/P3BPPP/R1Q2RK1 w - - 2 16",
        "rnbq1rk1/pp2ppbp/3p1np1/8/3pP3/2N2N2/PPP1BPPP/R1BQ1RK1 w - - 0 8",
        "8/3k4/8/8/8/3K4/8/8 w - - 0 1",
    ]

    for i in range(min(count, len(hardcoded_fens))):
        puzzles.append({
            "id": f"puzzle_{i}",
            "fen": hardcoded_fens[i],
        })

    return puzzles


def run_benchmark():
    puzzles = fetch_puzzles(10)
    results = []

    print("Running Alpha-Beta Benchmark...")
    for puzzle in puzzles:
        board = chess.Board(puzzle["fen"])
        for evaluator_name in ALPHABETA_EVALUATORS:
            for depth in [2, 3, 4]:
                for use_ordering in [True, False]:
                    engine = AlphaBetaEngine(
                        depth=depth,
                        use_move_ordering=use_ordering,
                        evaluator=build_evaluator(evaluator_name),
                    )
                    res = engine.search(board.copy())
                    results.append(
                        make_result_row(
                            puzzle_id=puzzle["id"],
                            engine="alphabeta",
                            param_1_name="depth",
                            param_1_val=depth,
                            param_2_name="use_ordering",
                            param_2_val=str(use_ordering),
                            result=res,
                            evaluator_name=evaluator_name,
                        )
                    )

    print("Running MCTS Benchmark...")
    for puzzle in puzzles:
        board = chess.Board(puzzle["fen"])
        for iterations in [50, 100, 200]:
            for c_val in [0.5, 1.414, 2.0]:
                engine = MCTSEngine(iterations=iterations, exploration_constant=c_val)
                res = engine.search(board.copy())
                results.append(
                    make_result_row(
                        puzzle_id=puzzle["id"],
                        engine="mcts",
                        param_1_name="iterations",
                        param_1_val=iterations,
                        param_2_name="c_val",
                        param_2_val=c_val,
                        result=res,
                    )
                )

    os.makedirs("results", exist_ok=True)
    filename = f"results/benchmark_{int(time.time())}.csv"
    with open(filename, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)
    print(f"Benchmark completed. Data saved to {filename}")
```

- [ ] **Step 4: Run the benchmark tests to verify they pass**

Run:

```bash
python -m pytest tests/scripts/test_benchmark_runner.py -v
```

Expected:
- PASS, all benchmark helper tests pass.

- [ ] **Step 5: Commit benchmark evaluator sweep support**

```bash
git add phase2_research/backend/scripts/benchmark_runner.py phase2_research/backend/tests/scripts/test_benchmark_runner.py
git commit -m "feat: benchmark heuristic evaluator ladder"
```

---

### Task 4: Run full backend verification for the evaluator ladder

**Files:**
- No new files expected
- Re-run the modified backend and test surfaces from prior tasks

- [ ] **Step 1: Run the full targeted evaluator/backend suite**

Run:

```bash
python -m pytest tests/engines/whitebox/test_evaluators.py tests/engines/whitebox/test_minimax_instrumentation.py tests/api/test_whitebox_api.py tests/scripts/test_benchmark_runner.py -v
```

Expected:
- PASS, all evaluator ladder tests pass.

- [ ] **Step 2: Run the full backend suite**

Run:

```bash
python -m pytest tests -v
```

Expected:
- PASS, backend suite passes with only existing non-fatal warnings if any.

- [ ] **Step 3: Run a compile sanity check**

Run:

```bash
python -m compileall app scripts
```

Expected:
- PASS, compileall completes successfully.

- [ ] **Step 4: Run a benchmark smoke check**

Run:

```bash
python scripts/benchmark_runner.py
```

Expected:
- PASS, writes a `results/benchmark_<timestamp>.csv` file.

- [ ] **Step 5: Run a whitebox API smoke check across ladder variants**

Run:

```bash
python -c "from fastapi.testclient import TestClient; from app.main import app; client = TestClient(app); fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
for evaluator in ('material', 'pst', 'heuristic'):
    response = client.post('/api/whitebox/play', json={'fen': fen, 'engine': 'alphabeta', 'depth': 1, 'evaluator': evaluator});
    print(evaluator, response.status_code, response.json()['instrumentation']['evaluator_name'])"
```

Expected:
- PASS, three lines showing `material 200 material`, `pst 200 pst`, and `heuristic 200 heuristic`.

---

## Self-Review

### Spec coverage

- Add bounded handcrafted evaluator ladder: covered by Task 1.
- Thread evaluator variants through Alpha-Beta and API/schema: covered by Task 2.
- Make evaluator variants comparable in benchmark output: covered by Task 3.
- Re-verify backend behavior and benchmark/API smoke paths: covered by Task 4.

### Placeholder scan

- No `TODO`, `TBD`, `implement later`, or “similar to Task N” placeholders remain.
- Remaining `...` matches are either backend-local example path prose like `tests/...` or Python protocol/type ellipses inside valid code examples, not missing implementation steps.

### Type consistency

- Evaluator names are consistently `"material"`, `"pst"`, `"heuristic"` across evaluator module, schema, API, and benchmark/tests.
- `BoardEvaluator` remains the injection protocol used by `AlphaBetaEngine`.
- Benchmark rows continue to use existing additive instrumentation field names instead of inventing a second metrics schema.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-30-phase2-heuristic-evaluator-ladder.md`.

Standard execution options for this plan are:

1. Subagent-Driven (recommended)
2. Inline Execution

Because you already asked me not to stop for confirmations, the recommended next move is to proceed with **Subagent-Driven** execution in the backend worktree.
