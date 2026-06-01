# Phase 2 Backend Search Research Design

## Goal

Evolve the Phase 2 backend from a demo-oriented whitebox engine lab into a research-friendly search platform that can rigorously compare Alpha-Beta variants today and accept RL-based evaluators later without forcing a large architectural rewrite.

## Current State

- `phase2_research/backend/app/engines/whitebox/minimax.py` implements a self-contained `AlphaBetaEngine` with:
  - fixed material-only evaluation
  - optional move ordering
  - node counting
  - tree serialization for frontend visualization
- `phase2_research/backend/app/engines/whitebox/mcts.py` implements a self-contained `MCTSEngine` with:
  - random rollout policy
  - UCB1 selection
  - visit/win statistics
  - tree serialization for frontend visualization
- `phase2_research/backend/app/api/whitebox.py` exposes `/api/whitebox/play` as a simple engine selector for `alphabeta` and `mcts`.
- `phase2_research/backend/scripts/benchmark_runner.py` already provides an offline experiment harness, but it is currently focused on broad sweeps rather than deeper research metrics.
- `phase2_research/backend/app/schemas/whitebox.py` defines a narrow request/response contract centered on engine hyperparameters and visualization payloads.

## Problem Statement

The current Phase 2 backend is good for teaching search basics, but it is not yet shaped like a durable research platform.

### 1. Search and evaluation are tightly coupled

`AlphaBetaEngine` currently owns both the search procedure and the evaluation logic. This makes it hard to compare different evaluators fairly and prevents a clean path toward learned value estimation.

### 2. Benchmarking is too shallow for research use

The current benchmark runner records move, time, nodes, and evaluation, but does not yet expose the richer search-process metrics needed to answer research questions about pruning efficiency, evaluator quality, or search stability.

### 3. RL has no architectural landing zone yet

There is no explicit abstraction for a learned evaluator, no model-loading seam, and no agreement on whether future RL should enter the system as:

- a standalone engine
- a value/evaluation component inside Alpha-Beta
- a policy/value guide for search

## Research Purpose

The purpose of this research program is **not** to rush toward a full RL chess engine. The better purpose for this codebase is:

> Study how transparent classical chess search can be improved by progressively adding stronger evaluation and learned guidance, while preserving enough structure to explain why a move was chosen.

For this repository, the key tension is not “search versus learning” in the abstract. It is the practical trade-off between:

- **classical adversarial search** that is deterministic, inspectable, and easy to visualize
- **learned guidance** that may improve move quality or search efficiency, but can reduce interpretability and add experimental confounds

This makes Phase 2 a good whitebox research lab for questions like:

- when does Alpha-Beta benefit more from better evaluation than from deeper search?
- when does MCTS benefit more from guided rollouts or priors than from more simulations?
- can a learned evaluator improve decision quality under fixed compute budgets without turning the system into a black box?

## Meaningful Research Value

This work becomes research rather than mere engineering when it produces:

1. **Reproducible comparisons**
   - same position sets
   - same compute budgets
   - same measurement pipeline

2. **Falsifiable hypotheses**
   - for example: improved move ordering reduces nodes without hurting top-move agreement
   - or: a richer evaluator improves shallow Alpha-Beta more than increasing depth does

3. **Search-process insight**
   - not only what move was chosen
   - but how pruning, rollout quality, or evaluator strength changed the search behavior

4. **Explainability-aware findings**
   - because this backend is also a teaching/visualization system, not just a strength-maximization engine

## Early Hypotheses Worth Testing

### H1. Better move ordering can deliver a policy-prior-like gain before any RL exists

The current `AlphaBetaEngine` ordering in `phase2_research/backend/app/engines/whitebox/minimax.py` is intentionally simple. A first strong hypothesis is that move ordering quality may matter more than raw depth growth for practical efficiency.

### H2. Evaluator quality may dominate extra depth at shallow search budgets

The current Alpha-Beta evaluation is material-only. Before introducing learned value models, the project should establish whether richer handcrafted evaluation already changes move quality enough to justify evaluator abstraction.

### H3. Random-rollout MCTS is a natural bridge to learned guidance

The current `MCTSEngine` in `phase2_research/backend/app/engines/whitebox/mcts.py` uses random rollouts. This makes it a clean place to test whether heuristic or learned rollout/value guidance improves stability and move quality under fixed iteration budgets.

### H4. Learned value is more useful first as a search plug-in than as a standalone engine

For this codebase, the first RL-adjacent step should be a `LearnedEvaluator`, not a full self-play training stack. That produces cleaner comparisons and lower implementation risk.

## Literature-Aligned Direction

Quick external calibration supports the staged approach rather than a jump to full RL:

- work on policy/value-guided MCTS and AlphaZero-like systems reinforces that learned guidance is most useful when paired with search, not treated as a separate magic replacement
- research on regularized or guided MCTS suggests that search-quality improvements often come from better search biasing under fixed budgets, which matches this backend's strengths
- minimax/RL literature outside games often focuses on robust or adversarial learning theory, but that is not the immediate best fit for this repository

So the strongest near-term research identity for ChessExplain Phase 2 is:

> a platform for measuring how search quality, search efficiency, and interpretability change as the system moves from classical search to evaluator-guided search and only later toward learned guidance

## Why Full RL Is Premature Right Now

Jumping directly into full RL would be high-risk because the current backend still lacks:

- a stable evaluator abstraction
- strong benchmark labels beyond speed and node counts
- repeated-trial variance handling for stochastic search
- a clear way to compare learned and non-learned approaches under equal budgets

Without those foundations, a full RL effort would create too many moving parts at once and make the resulting conclusions less trustworthy.

## Recommended Research Direction

Follow a staged path:

1. **Alpha-Beta baseline research first**
2. **Evaluator abstraction second**
3. **RL seam third**

This keeps the near-term work grounded in the existing codebase while still steering toward a more modern search-plus-learning architecture.

## Recommended Architecture

### A. Search Engine Layer

Keep explicit engine classes as the top-level search orchestrators.

Expected roles:

- `AlphaBetaEngine`
- `MCTSEngine`
- future `RLGuidedEngine` or `PolicyValueMCTS` only if the project later grows into hybrid search

Responsibilities:

- own control flow of search
- own traversal strategy
- collect search metrics
- return tree/summary outputs for UI and benchmarking

Non-responsibilities:

- long-term model training
- hardcoded evaluator assumptions where avoidable

### B. Evaluator Layer

Introduce an explicit evaluator abstraction for position scoring.

Planned evaluator families:

- `MaterialEvaluator` — current baseline behavior extracted from `minimax.py`
- `HeuristicEvaluator` — richer handcrafted positional features
- `LearnedEvaluator` — future RL/value-model inference adapter

Responsibilities:

- accept board state or extracted features
- return a scalar score or value estimate in a consistent convention
- remain usable by both search code and benchmarks

This is the preferred first landing zone for RL, because it allows the system to compare learned and non-learned evaluation under the same Alpha-Beta search loop.

### C. Experiment Harness Layer

Upgrade `phase2_research/backend/scripts/benchmark_runner.py` from a simple sweep script into a structured experiment harness.

Responsibilities:

- define benchmark suites by position set
- run engine/evaluator combinations
- record search-process and outcome metrics
- emit CSVs suitable for plotting and later report writing

This layer should become the main place where research hypotheses are tested.

## Why This Direction Is Recommended

### Why not start with a full RL engine?

That would require solving training loops, model persistence, inference runtime, evaluation protocols, and likely a much wider API redesign before the project has even stabilized its search metrics.

### Why start with Alpha-Beta?

Because the repo already has a working Alpha-Beta implementation, and Alpha-Beta is the cleanest place to separate:

- search procedure
- move ordering
- evaluator quality
- instrumentation

That separation creates immediate research value even before any RL work begins.

### Why make RL enter through evaluation first?

Because a learned evaluator is a much narrower and more testable integration point than a full self-play training system or an AlphaZero-style hybrid engine.

## Phase Plan

## Phase A: Alpha-Beta Baseline Research

### Objective

Turn the current Alpha-Beta implementation into a measurable baseline that can answer search-specific questions.

### Scope

- keep the current engine concept intact
- improve instrumentation rather than changing everything at once
- compare existing move ordering choices and depth settings

### Suggested metrics

- visited nodes
- evaluated leaf nodes
- pruned branches
- pruning ratio
- effective branching factor
- search time
- nodes per second
- depth reached
- principal variation or best-move stability across settings

### Research questions

- How much does move ordering improve pruning in this implementation?
- At what depth does the current material evaluator become the limiting factor?
- Are time and node growth curves consistent with the intended Alpha-Beta behavior?

## Phase B: Evaluator Abstraction

### Objective

Decouple scoring logic from search control so Alpha-Beta can be paired with multiple evaluators.

### Direction

Refactor the current material scoring code out of `AlphaBetaEngine.evaluate_board()` into a dedicated evaluator object or interface.

Target conceptually:

- `engine.search(board, evaluator=...)`

or engine construction with an evaluator dependency.

### Expected benefits

- fair evaluator-vs-evaluator comparisons
- easier unit testing of scoring logic
- clear insertion point for learned value estimation

### Research questions

- Does a richer handcrafted evaluator improve quality enough to justify added cost?
- How sensitive is Alpha-Beta to evaluator quality compared with depth?

## Phase C: RL Seam

### Objective

Prepare the backend to accept a learned evaluator without committing yet to a full training platform.

### Intended scope

- define the inference contract for `LearnedEvaluator`
- decide model-loading boundaries
- decide score convention and calibration expectations
- extend benchmark harness to compare learned vs non-learned evaluators

### Explicitly deferred for now

- self-play training loop
- replay buffer infrastructure
- optimizer/training orchestration
- distributed training or GPU-serving concerns
- AlphaZero-style policy/value search integration

This keeps the project in a research-design state rather than overcommitting to a large ML systems build.

## API and Integration Implications

### `app/api/whitebox.py`

This should remain the strategy-selection boundary, but over time it should grow from a simple engine switch into a clearer engine-plus-evaluator request path.

Near-term:

- still route to `alphabeta` and `mcts`
- optionally expose more benchmark-friendly metadata later

Mid-term:

- accept evaluator selection for Alpha-Beta requests
- keep response shape compatible with both visualization and benchmarking

### `app/schemas/whitebox.py`

This is the right place to define future evaluator-related request fields, such as:

- evaluator type
- evaluator config name
- model identifier/path
- search instrumentation flags

These should be added only once the evaluator abstraction exists, not before.

### `scripts/benchmark_runner.py`

This should become the canonical experiment entry point for comparing:

- Alpha-Beta depth/order settings
- Alpha-Beta + evaluator combinations
- MCTS baselines
- later RL-informed evaluation strategies

## Success Criteria

This research direction is successful if the backend reaches the point where:

- Alpha-Beta experiments produce richer search metrics, not just move/time output
- evaluator logic is separable from search logic
- benchmarks can compare multiple evaluator strategies fairly
- the codebase has a clear, low-risk seam for a future learned evaluator
- RL can be introduced incrementally without rewriting the whitebox API from scratch

## Explicit Non-Goals for the Next Iteration

- Do not build full RL training infrastructure yet.
- Do not merge Phase 1 and Phase 2 architecture yet.
- Do not introduce a large model-serving subsystem yet.
- Do not attempt AlphaZero-style hybrid search as the first step.

## Suggested Next Step

The best immediate follow-up is to convert this design into an implementation plan for **Phase A + the first part of Phase B**:

1. instrument Alpha-Beta more deeply
2. strengthen benchmark outputs
3. extract a baseline `MaterialEvaluator`

That sequence preserves momentum while keeping the work bounded and research-relevant.
