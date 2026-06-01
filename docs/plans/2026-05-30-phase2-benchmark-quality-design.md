## Phase 2 Benchmark Quality Design

### Goal

Upgrade the Phase 2 backend benchmark harness from performance-only measurement to quality-aware evaluation by comparing whitebox engine choices against a fixed Stockfish reference.

### Current State

- `phase2_research/backend/scripts/benchmark_runner.py` currently benchmarks Alpha-Beta and MCTS over a small fixed FEN suite.
- Current CSV output records speed/process metrics such as nodes, time, NPS, evaluator name, cutoffs, and depth histograms.
- The harness does **not** yet record whether a chosen move is good chess relative to a stronger oracle.
- A strong reference-engine seam already exists in `phase2_research/backend/app/services/engine_service.py`, which can return Stockfish best lines and evaluations.

### Problem Statement

The current benchmark can tell us which engine configuration searches faster or expands fewer nodes, but it cannot tell us whether:

- `material`, `pst`, or `heuristic` actually choose stronger moves,
- Alpha-Beta move ordering is improving quality or only speed,
- MCTS is weak because of rollout quality or just compute budget,
- future RL-guided evaluators improve chess quality under fixed budgets.

Without a quality target, the benchmark is useful for telemetry but weak for research.

### Research Purpose

The purpose of the next increment is:

> turn the benchmark harness into a small, reproducible oracle-comparison pipeline that measures not just how much search was performed, but how close each whitebox result is to a stronger Stockfish reference under fixed compute budgets.

This fits the project direction as a whitebox research lab: first establish trustworthy quality labels, then study trade-offs among speed, search shape, evaluator strength, and explainability.

### Alternatives Considered

#### 1. Add Stockfish-reference quality metrics first (**recommended**)

Add an offline reference-analysis step per benchmark position and extend CSV rows with quality columns such as reference move, move-match, and evaluation regret.

Why this is best now:

- highest research value per line of code,
- reuses existing `EngineService`,
- immediately tells us whether the evaluator ladder helps,
- creates a foundation for later MCTS and RL comparisons.

#### 2. Add richer MCTS telemetry first

This would improve observability, but not yet solve the central research problem: whether moves are good. It risks optimizing logging before we have an oracle target.

#### 3. Add learned-evaluator seams first

The evaluator seam already exists and is sufficient for now. Adding more abstraction before quality metrics would be premature and low-value.

### Recommended Direction

Do **Stockfish-reference benchmark quality metrics first**.

This means the next research slice should stay offline and bounded to the benchmark harness, not the runtime API.

### Architecture

#### A. Reference Oracle Layer (offline only)

Inside `benchmark_runner.py`, add a small helper that reuses `EngineService` to analyze each puzzle FEN once and produce a reference record containing:

- reference best move,
- reference evaluation,
- optional top-k reference moves later.

This reference layer should remain benchmark-only for now.

#### B. Quality Comparison Layer

For each whitebox result row, compare the chosen move against the Stockfish reference and compute a few stable quality metrics.

#### C. Existing Performance Layer (keep intact)

Do not remove the current search-process metrics. The new benchmark should support joint analysis of:

- quality,
- time,
- search effort,
- search shape.

### Minimal Quality Metrics

The first increment should add only a small set of high-value columns.

#### 1. `reference_best_move`

The Stockfish best move for the FEN under a fixed benchmark oracle budget.

#### 2. `top_move_match`

Boolean: whether the whitebox `best_move` matches the Stockfish top move.

This is simple and report-friendly, though it is intentionally strict.

#### 3. `reference_eval`

The Stockfish evaluation for the position from a fixed, documented POV.

#### 4. `eval_gap`

Difference between the benchmarked engine result and the reference evaluation, under a consistent side-to-move convention.

This is more informative than exact move match because multiple moves can be acceptable.

#### 5. Optional threshold bucket columns

If kept small, add one or two categorical helpers such as:

- `within_50cp`
- `within_100cp`

These are useful for later “acceptable move rate” or “blunder-like rate” summaries.

### Data-Flow Design

Recommended offline benchmark flow:

1. Load benchmark FENs from the current hardcoded suite.
2. For each puzzle FEN, compute a Stockfish reference once.
3. For each Alpha-Beta/MCTS configuration, run the whitebox engine as today.
4. Build the current result row.
5. Add reference-quality columns.
6. Write a single CSV containing both process metrics and quality metrics.

### Reuse Strategy

Prefer reusing `phase2_research/backend/app/services/engine_service.py` instead of duplicating direct Stockfish lifecycle logic in `benchmark_runner.py`.

Why:

- Stockfish path/time/depth already come from shared settings.
- The service already encapsulates engine startup and evaluation extraction.
- Reuse keeps benchmark semantics closer to the rest of the backend.

### Constraints and Pitfalls

#### POV consistency

`EngineService` currently computes scores using `score_obj.pov(board.turn)`. The benchmark must normalize `reference_eval` and `eval_gap` using the same side-to-move convention as the whitebox row it compares against.

#### Move normalization

Reference output and whitebox output may differ in SAN/UCI representation. The benchmark should normalize move strings before calculating `top_move_match`.

#### Engine startup cost

`EngineService` starts/quits Stockfish per call. Recomputing reference analysis for every row would be unnecessarily expensive. The benchmark should compute one reference per puzzle and reuse it across all rows.

#### Mate / terminal handling

Mate scores should not be treated as ordinary centipawn gaps. The first increment should either:

- preserve mate strings separately, or
- explicitly skip `eval_gap` when either side is a mate score.

#### Environment coupling

Reference results depend on configured Stockfish path/time/depth in `app/core/config.py`. The benchmark should document or record those settings so results remain interpretable.

### Smallest Useful Implementation Slice

Keep the next increment intentionally small:

1. Add a Stockfish reference helper in `benchmark_runner.py`.
2. Reuse `EngineService.analyze_position(fen)` for one reference call per puzzle.
3. Extend benchmark CSV with:
   - `reference_best_move`
   - `reference_eval`
   - `top_move_match`
   - `eval_gap`
4. Add focused tests in `tests/scripts/test_benchmark_runner.py` for those columns and normalization rules.

### Non-Goals for This Increment

- No runtime API changes.
- No larger benchmark dataset yet.
- No learned evaluator or RL changes yet.
- No full MCTS telemetry expansion yet.
- No attempt to make Alpha-Beta depth and MCTS iterations look like directly equivalent budgets.

### Success Criteria

This increment is successful if:

- benchmark CSV rows preserve existing process metrics,
- each benchmark row also includes stable Stockfish-reference quality fields,
- Alpha-Beta evaluator variants can now be compared on both speed and move quality,
- the harness stays offline, deterministic, and small enough to iterate quickly.

### Recommended Next Step

Turn this design into a bounded implementation plan focused only on:

- `phase2_research/backend/scripts/benchmark_runner.py`
- `phase2_research/backend/tests/scripts/test_benchmark_runner.py`

with optional reuse of `phase2_research/backend/app/services/engine_service.py` but no broader backend refactor.
