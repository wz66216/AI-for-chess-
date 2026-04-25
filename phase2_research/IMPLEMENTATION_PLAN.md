# Phase 2 Implementation Plan: White-Box Chess Engine Benchmark & Treeviz

## Architecture Overview
- **Backend**: Pure Python white-box chess engines (Alpha-Beta & MCTS) built on top of `python-chess`. Designed specifically for state-extraction and explainability rather than raw performance.
- **Frontend**: React/TypeScript UI extending the current chessboard, adding a hyperparameter control panel and a real-time D3.js/ECharts Treeviz panel.
- **Benchmark**: Offline Python scripts to run ablation studies over Lichess puzzle datasets, generating quantitative metrics and charts for the final academic report.

---

## Step 1: Backend Core (White-box Engines)
**Goal:** Implement the base algorithms with full tree-state serialization.

- [ ] **1.1 Setup Engine Environment**
  - Create `phase2_research/backend/app/engines/whitebox/` directory.
  - Install dependencies: `python-chess`.
- [ ] **1.2 Alpha-Beta Engine Implementation**
  - Implement basic Minimax with Alpha-Beta pruning.
  - Add configurable hyperparameters: `depth`, `use_move_ordering` (MVV-LVA), `use_quiescence_search`.
  - **Instrumentation**: Inject logging to capture node visits, evaluation scores, and prune events (cutoffs). Serialize this DAG/Tree to a structured JSON format.
- [ ] **1.3 MCTS Engine Implementation**
  - Implement standard Monte Carlo Tree Search (Selection, Expansion, Simulation, Backpropagation).
  - Add configurable hyperparameters: `num_simulations`, `exploration_constant` (c), `rollout_policy` (random vs greedy).
  - **Instrumentation**: Capture visit counts ($N$), win scores ($W$), UCB values, and tree structure to JSON.
- [ ] **1.4 API Endpoints**
  - Create `/api/whitebox/play` endpoint: Accepts FEN, Engine Type (AB/MCTS), and Hyperparameters. Returns best move, calculation time, NPS, and the JSON tree structure.

## Step 2: Frontend Visualization & Control
**Goal:** Expose the engine internals visually to the user.

- [ ] **2.1 Control Panel UI**
  - Add a settings sidebar to `ChessGame.tsx`.
  - Toggle between "Alpha-Beta" and "MCTS".
  - Sliders for hyperparameters (Depth 1-5, MCTS iterations 100-5000, Exploration $c$ 0.1-2.0, toggles for QS/Move Ordering).
- [ ] **2.2 Treeviz Component**
  - Integrate a visualization library (e.g., ECharts tree graph or D3.js).
  - Create a collapsible side/bottom panel: `SearchTreeVisualizer.tsx`.
  - Render the JSON response from the backend:
    - **Alpha-Beta**: Show pruned branches (greyed out/red), min/max nodes, and final PV path.
    - **MCTS**: Show node size based on visit count ($N$), and heat map colors for win rate ($W/N$).

## Step 3: Quantitative Benchmark (Offline Scripts)
**Goal:** Automate experiments for the 5000-word final report.

- [ ] **3.1 Dataset Preparation**
  - Script to fetch/load 100 tactical puzzles and 100 positional/endgame puzzles from Lichess FEN databases.
- [ ] **3.2 Automated Test Runner**
  - Write `benchmark_runner.py`.
  - Loop over the dataset running permutations of hyperparameters.
  - Record metrics: FEN, Engine, Hyperparams, Best Move Found (Y/N), Time Taken (ms), Nodes Evaluated, NPS, Pruning Ratio.
  - Output results to CSV.
- [ ] **3.3 Visualization & Chart Generation**
  - Write `generate_plots.py` using `matplotlib`/`seaborn`.
  - Generate required academic charts:
    - *NPS vs. Depth (Exponential explosion demonstration)*.
    - *Effect of Move Ordering on Pruning Ratio*.
    - *MCTS Accuracy vs. Iteration count*.
    - *Alpha-Beta vs MCTS win rate on Tactical vs Positional puzzles*.