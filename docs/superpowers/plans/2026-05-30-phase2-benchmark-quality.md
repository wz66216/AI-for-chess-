# Phase 2 Benchmark Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stockfish-reference quality metrics to the offline whitebox benchmark so Alpha-Beta evaluator variants can be compared on move quality as well as search cost.

**Architecture:** Keep the change offline and bounded to the benchmark harness. Reuse the existing `EngineService` as the Stockfish oracle, normalize reference moves to UCI inside `benchmark_runner.py`, cache one reference analysis per puzzle plus one chosen-move evaluation per unique `(fen, move)` pair, and extend the CSV with a small set of stable quality columns.

**Tech Stack:** Python 3.11+, python-chess, FastAPI backend modules, `EngineService`, pytest, CSV benchmark scripts.

---

## Execution Context

All commands below assume the working directory is:

```bash
phase2_research/backend
```

That means test commands use backend-local paths like `tests/...`, and script commands use backend-local paths like `scripts/...`.

## File Structure / Responsibility Map

- **Modify:** `phase2_research/backend/scripts/benchmark_runner.py`
  - Add Stockfish-reference helper logic, move normalization, reference/move-eval caches, new CSV quality fields, and benchmark-row enrichment.
- **Modify:** `phase2_research/backend/tests/scripts/test_benchmark_runner.py`
  - Add failing tests for SAN/UCI normalization, reference-field enrichment, eval-gap semantics, threshold buckets, and stable CSV fieldnames.

No runtime API files should change in this increment.

## Scope Guardrails

- Reuse `app.services.engine_service.EngineService` instead of duplicating direct Stockfish setup logic.
- Keep the change **offline-only** in `benchmark_runner.py`; do not add new FastAPI routes.
- Do not expand the puzzle dataset yet.
- Do not change Alpha-Beta or MCTS engine internals in this slice.
- If `eval_gap` would require mixing incompatible score conventions, normalize everything to the **original side-to-move POV** before storing the number.

### Task 1: Add failing benchmark-quality tests

**Files:**
- Modify: `phase2_research/backend/tests/scripts/test_benchmark_runner.py`
- Test: `phase2_research/backend/tests/scripts/test_benchmark_runner.py`

- [ ] **Step 1: Write the failing tests for move normalization and quality columns**

Add these tests to `phase2_research/backend/tests/scripts/test_benchmark_runner.py`:

```python
import chess

from scripts.benchmark_runner import (
    CSV_FIELDNAMES,
    normalize_move_to_uci,
    make_result_row,
)


def test_normalize_move_to_uci_accepts_existing_uci_move():
    board = chess.Board()
    assert normalize_move_to_uci(board, "e2e4") == "e2e4"


def test_normalize_move_to_uci_converts_san_to_uci():
    board = chess.Board()
    assert normalize_move_to_uci(board, "e4") == "e2e4"


def test_make_result_row_includes_reference_quality_columns():
    row = make_result_row(
        puzzle_id="puzzle_1",
        engine="alphabeta",
        param_1_name="depth",
        param_1_val=3,
        param_2_name="use_ordering",
        param_2_val=True,
        result={
            "best_move": "e2e4",
            "nodes_evaluated": 20,
            "time_ms": 10,
            "nps": 2000,
            "evaluation": 0.40,
            "instrumentation": {
                "cutoffs": 2,
                "nodes_visited": 21,
                "leaf_evaluations": 20,
                "generated_children": 20,
                "remaining_depth_counts": {3: 1, 2: 20},
                "children_by_remaining_depth": {3: 20},
            },
        },
        evaluator_name="heuristic",
        reference_best_move="e2e4",
        reference_eval=0.55,
        top_move_match=True,
        eval_gap=0.15,
        within_50cp=True,
        within_100cp=True,
    )

    assert row["reference_best_move"] == "e2e4"
    assert row["reference_eval"] == 0.55
    assert row["top_move_match"] is True
    assert row["eval_gap"] == 0.15
    assert row["within_50cp"] is True
    assert row["within_100cp"] is True


def test_make_result_row_keeps_eval_gap_none_when_reference_is_mate():
    row = make_result_row(
        puzzle_id="mate_case",
        engine="alphabeta",
        param_1_name="depth",
        param_1_val=2,
        param_2_name="use_ordering",
        param_2_val=False,
        result={
            "best_move": "g7g8q",
            "nodes_evaluated": 3,
            "time_ms": 1,
            "nps": 3000,
            "evaluation": 99999.0,
        },
        evaluator_name="material",
        reference_best_move="g7g8q",
        reference_eval=None,
        top_move_match=True,
        eval_gap=None,
        within_50cp=None,
        within_100cp=None,
    )

    assert row["eval_gap"] is None
    assert row["within_50cp"] is None
    assert row["within_100cp"] is None


def test_csv_fieldnames_include_reference_quality_columns():
    assert "reference_best_move" in CSV_FIELDNAMES
    assert "reference_eval" in CSV_FIELDNAMES
    assert "top_move_match" in CSV_FIELDNAMES
    assert "eval_gap" in CSV_FIELDNAMES
    assert "within_50cp" in CSV_FIELDNAMES
    assert "within_100cp" in CSV_FIELDNAMES
```

- [ ] **Step 2: Run the test file and verify it fails for the expected missing helpers/fields**

Run:

```bash
python -m pytest tests/scripts/test_benchmark_runner.py -v
```

Expected: FAIL because `normalize_move_to_uci` and the new `make_result_row(...)` keyword arguments / CSV fields do not exist yet.

- [ ] **Step 3: Commit the red test state only if your workflow requires it; otherwise continue directly**

```bash
git add phase2_research/backend/tests/scripts/test_benchmark_runner.py
git commit -m "test: add benchmark quality metric coverage"
```

### Task 2: Implement Stockfish-reference helpers and CSV enrichment

**Files:**
- Modify: `phase2_research/backend/scripts/benchmark_runner.py`
- Test: `phase2_research/backend/tests/scripts/test_benchmark_runner.py`

- [ ] **Step 1: Add imports and extend CSV fieldnames**

Update the top of `phase2_research/backend/scripts/benchmark_runner.py` so it includes `EngineService` and the new quality columns:

```python
import sys
import os
import csv
import time
import chess
import urllib.request
import json
from pathlib import Path
from typing import Any, Dict, Optional

sys.path.append(str(Path(__file__).parent.parent))

from app.engines.whitebox import AlphaBetaEngine, MCTSEngine
from app.engines.whitebox.evaluators import build_evaluator
from app.services.engine_service import EngineService


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
    "reference_best_move",
    "reference_eval",
    "top_move_match",
    "eval_gap",
    "within_50cp",
    "within_100cp",
]
```

- [ ] **Step 2: Add normalization and Stockfish reference helpers**

Add these helpers to `phase2_research/backend/scripts/benchmark_runner.py`:

```python
def normalize_move_to_uci(board: chess.Board, move_text: Optional[str]) -> Optional[str]:
    if not move_text:
        return None

    try:
        return chess.Move.from_uci(move_text).uci()
    except ValueError:
        pass

    try:
        return board.parse_san(move_text).uci()
    except ValueError:
        return None


def get_reference_summary(engine_service: EngineService, fen: str) -> Dict[str, Any]:
    analysis = engine_service._analyze_sync(fen)
    if not analysis.lines:
        return {
            "reference_best_move": None,
            "reference_eval": None,
        }

    best_line = analysis.lines[0]
    board = chess.Board(fen)
    return {
        "reference_best_move": normalize_move_to_uci(board, best_line.best_move),
        "reference_eval": None if best_line.is_mate else best_line.score,
    }


def get_move_quality_summary(
    engine_service: EngineService,
    fen: str,
    chosen_move_uci: Optional[str],
    reference_eval: Optional[float],
) -> Dict[str, Any]:
    if not chosen_move_uci or reference_eval is None:
        return {
            "eval_gap": None,
            "within_50cp": None,
            "within_100cp": None,
        }

    chosen_analysis = engine_service._analyze_sync(fen, chosen_move_uci)
    if not chosen_analysis.lines:
        return {
            "eval_gap": None,
            "within_50cp": None,
            "within_100cp": None,
        }

    chosen_line = chosen_analysis.lines[0]
    if chosen_line.is_mate:
        return {
            "eval_gap": None,
            "within_50cp": None,
            "within_100cp": None,
        }

    chosen_eval_from_original_pov = -chosen_line.score
    eval_gap = reference_eval - chosen_eval_from_original_pov
    abs_gap = abs(eval_gap)

    return {
        "eval_gap": eval_gap,
        "within_50cp": abs_gap <= 0.5,
        "within_100cp": abs_gap <= 1.0,
    }
```

- [ ] **Step 3: Extend `make_result_row(...)` to store quality columns**

Replace the current `make_result_row(...)` with this version:

```python
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
    reference_best_move: Optional[str] = None,
    reference_eval: Optional[float] = None,
    top_move_match: Optional[bool] = None,
    eval_gap: Optional[float] = None,
    within_50cp: Optional[bool] = None,
    within_100cp: Optional[bool] = None,
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
        "reference_best_move": reference_best_move,
        "reference_eval": reference_eval,
        "top_move_match": top_move_match,
        "eval_gap": eval_gap,
        "within_50cp": within_50cp,
        "within_100cp": within_100cp,
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
```

- [ ] **Step 4: Add cached reference analysis to `run_benchmark()`**

Replace the current `run_benchmark()` implementation with this version:

```python
def run_benchmark():
    puzzles = fetch_puzzles(10)
    results = []
    engine_service = EngineService()

    reference_cache: Dict[str, Dict[str, Any]] = {}
    move_quality_cache: Dict[tuple[str, str], Dict[str, Any]] = {}

    for puzzle in puzzles:
        reference_cache[puzzle["fen"]] = get_reference_summary(engine_service, puzzle["fen"])

    print("Running Alpha-Beta Benchmark...")
    for puzzle in puzzles:
        board = chess.Board(puzzle["fen"])
        reference = reference_cache[puzzle["fen"]]
        for evaluator_name in ALPHABETA_EVALUATORS:
            for depth in [2, 3, 4]:
                for use_ordering in [True, False]:
                    engine = AlphaBetaEngine(
                        depth=depth,
                        use_move_ordering=use_ordering,
                        evaluator=build_evaluator(evaluator_name),
                    )
                    res = engine.search(board.copy())

                    chosen_move = normalize_move_to_uci(board, res.get("best_move"))
                    move_quality = {"eval_gap": None, "within_50cp": None, "within_100cp": None}
                    if chosen_move:
                        cache_key = (puzzle["fen"], chosen_move)
                        if cache_key not in move_quality_cache:
                            move_quality_cache[cache_key] = get_move_quality_summary(
                                engine_service,
                                puzzle["fen"],
                                chosen_move,
                                reference["reference_eval"],
                            )
                        move_quality = move_quality_cache[cache_key]

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
                            reference_best_move=reference["reference_best_move"],
                            reference_eval=reference["reference_eval"],
                            top_move_match=(chosen_move == reference["reference_best_move"]),
                            eval_gap=move_quality["eval_gap"],
                            within_50cp=move_quality["within_50cp"],
                            within_100cp=move_quality["within_100cp"],
                        )
                    )

    print("Running MCTS Benchmark...")
    for puzzle in puzzles:
        board = chess.Board(puzzle["fen"])
        reference = reference_cache[puzzle["fen"]]
        for iterations in [50, 100, 200]:
            for c_val in [0.5, 1.414, 2.0]:
                engine = MCTSEngine(iterations=iterations, exploration_constant=c_val)
                res = engine.search(board.copy())

                chosen_move = normalize_move_to_uci(board, res.get("best_move"))
                move_quality = {"eval_gap": None, "within_50cp": None, "within_100cp": None}
                if chosen_move:
                    cache_key = (puzzle["fen"], chosen_move)
                    if cache_key not in move_quality_cache:
                        move_quality_cache[cache_key] = get_move_quality_summary(
                            engine_service,
                            puzzle["fen"],
                            chosen_move,
                            reference["reference_eval"],
                        )
                    move_quality = move_quality_cache[cache_key]

                results.append(
                    make_result_row(
                        puzzle_id=puzzle["id"],
                        engine="mcts",
                        param_1_name="iterations",
                        param_1_val=iterations,
                        param_2_name="c_val",
                        param_2_val=c_val,
                        result=res,
                        reference_best_move=reference["reference_best_move"],
                        reference_eval=reference["reference_eval"],
                        top_move_match=(chosen_move == reference["reference_best_move"]),
                        eval_gap=move_quality["eval_gap"],
                        within_50cp=move_quality["within_50cp"],
                        within_100cp=move_quality["within_100cp"],
                    )
                )

    os.makedirs("results", exist_ok=True)
    filename = f"results/benchmark_{int(time.time())}.csv"
    with open(filename, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)

    print(f"Benchmark completed. Data saved to {filename}")
```

- [ ] **Step 5: Run the focused benchmark test file and verify it passes**

Run:

```bash
python -m pytest tests/scripts/test_benchmark_runner.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit the benchmark quality slice**

```bash
git add phase2_research/backend/scripts/benchmark_runner.py phase2_research/backend/tests/scripts/test_benchmark_runner.py
git commit -m "feat: add benchmark quality metrics"
```

### Task 3: Run full backend verification for benchmark quality

**Files:**
- Modify: `phase2_research/backend/scripts/benchmark_runner.py` (only if fixes are needed)
- Test: `phase2_research/backend/tests/scripts/test_benchmark_runner.py`

- [ ] **Step 1: Run the backend test suite**

Run:

```bash
python -m pytest tests -v
```

Expected: PASS with the existing known `StarletteDeprecationWarning` only.

- [ ] **Step 2: Run a compile sanity check**

Run:

```bash
python -m compileall app scripts
```

Expected: PASS.

- [ ] **Step 3: Run the benchmark harness end-to-end**

Run:

```bash
python scripts/benchmark_runner.py
```

Expected: PASS and print a new CSV path under `results/benchmark_<timestamp>.csv`.

- [ ] **Step 4: Smoke-check the generated CSV for quality columns**

Run:

```bash
python -c "from pathlib import Path; import csv; latest=max(Path('results').glob('benchmark_*.csv'), key=lambda p: p.stat().st_mtime); row=next(csv.DictReader(latest.open())); print(latest.name); print(row['reference_best_move'], row['reference_eval'], row['top_move_match'], row['eval_gap'])"
```

Expected: first line is a benchmark CSV filename; second line prints non-empty values for at least `reference_best_move` and `top_move_match`. `eval_gap` may be empty only on mate/terminal rows.

- [ ] **Step 5: Commit the verified result**

```bash
git add phase2_research/backend/scripts/benchmark_runner.py phase2_research/backend/tests/scripts/test_benchmark_runner.py
git commit -m "test: verify benchmark quality metrics"
```

## Self-Review

### 1. Spec coverage

This plan covers the benchmark-quality design requirements:
- Reuse `EngineService` as Stockfish oracle
- Keep scope bounded to `benchmark_runner.py` and `test_benchmark_runner.py`
- Add `reference_best_move`, `reference_eval`, `top_move_match`, `eval_gap`
- Add optional threshold buckets `within_50cp`, `within_100cp`
- Preserve existing performance/search-process columns
- Keep the change offline-only with no FastAPI/API refactor

No design requirement from `docs/plans/2026-05-30-phase2-benchmark-quality-design.md` is left without a task.

### 2. Placeholder scan

No `TODO`, `TBD`, `implement later`, `fill in details`, or “similar to Task N” placeholders remain.

### 3. Type consistency

The same field names are used consistently across tasks:
- `reference_best_move`
- `reference_eval`
- `top_move_match`
- `eval_gap`
- `within_50cp`
- `within_100cp`

Move normalization is consistently represented as UCI via `normalize_move_to_uci(...)`, and `EngineService` reuse is consistently implemented through `_analyze_sync(...)` inside the offline benchmark harness.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-30-phase2-benchmark-quality.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
