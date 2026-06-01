# Phase 2 Search Lab Design

## Goal

Create a dedicated Phase 2 subpage for visualizing the whitebox chess-search process. The page should let users run Alpha-Beta or MCTS searches, choose evaluators such as `material`, `pst`, and `heuristic`, adjust search depth and engine hyperparameters, inspect the resulting search tree, and preview evaluated board positions.

The page is not a replacement for the existing chess-analysis page. It is a research and teaching workbench focused on how search works.

## Current State

- `phase2_research/frontend/src/App.tsx` currently mounts a single-page app with `ChessGame`; there is no dedicated route for search experimentation.
- `phase2_research/frontend/src/components/Chessboard/ChessGame.tsx` is monolithic and currently embeds the whitebox search controls inside the main chess-analysis experience.
- Existing whitebox frontend components already cover part of the needed UI:
  - `WhiteboxControlPanel.tsx` exposes engine, Alpha-Beta depth, move ordering, MCTS iterations, and MCTS exploration constant controls.
  - `WhiteboxResultPanel.tsx` shows search result summary and a tree visualization.
  - `TreeVisualizer.tsx` renders backend search trees using ECharts.
- The Phase 2 backend already exposes `POST /api/whitebox/play`.
- `phase2_research/backend/app/schemas/whitebox.py` already supports request fields for:
  - `fen`
  - `engine`
  - `depth`
  - `use_move_ordering`
  - `evaluator`
  - `mcts_iterations`
  - `mcts_exploration_constant`
- The backend response already includes the search result, tree, and instrumentation.

## Problem Statement

The project now has strong backend research primitives, but the current UI does not make the search process easy to study. A user can run whitebox search, but cannot yet comfortably answer questions such as:

- How did Alpha-Beta expand the tree?
- Which branches were pruned?
- How does `material` differ from `pst` or `heuristic` on the same position?
- What changes when depth increases from 2 to 4?
- What does MCTS do differently from Alpha-Beta?
- Which exact board position does a selected tree node represent?
- Which hyperparameters produced this run?

The existing analysis page is optimized for move/game analysis. The search-process visualization needs its own page, visual hierarchy, and interaction model.

## Design Purpose

The Search Lab should make the backend whitebox engines demonstrable and teachable.

Primary success criteria:

- Users can run Alpha-Beta and MCTS from a dedicated subpage.
- Users can choose and understand `material`, `pst`, and `heuristic` evaluators.
- Users can modify Alpha-Beta depth and move ordering.
- Users can modify MCTS iterations and exploration constant.
- Users can see the resulting tree, summary metrics, and instrumentation.
- Users can click a tree node and inspect the corresponding evaluated position.
- Users can keep a local run history for comparing recent experiments.

## Alternatives Considered

### 1. Dedicated Search Lab page (**recommended**)

Add a new Phase 2 page such as `/search-lab` with a search-workbench layout. Reuse the existing whitebox API and tree visualization, but move the interaction model into purpose-built Search Lab components.

Why this is best now:

- matches the requirement to avoid crowding the existing analysis page,
- keeps backend changes small,
- gives the feature a clear research/teaching identity,
- allows future compare and benchmark views without further bloating `ChessGame`.

Trade-off:

- requires a small navigation/routing shell and some frontend state extraction.

### 2. Add a mode toggle inside the existing `ChessGame`

This would add a “normal analysis / search visualization” switch inside the existing page.

Why this is weaker:

- it conflicts with the desired dedicated subpage,
- it increases `ChessGame` complexity,
- it makes the search-lab mental model less clear.

This option is only attractive if speed matters more than maintainability.

### 3. Build a full experiment dashboard immediately

This would include side-by-side Alpha-Beta/MCTS comparison, persisted experiment history, benchmark CSV visualization, and Stockfish reference overlays from the first iteration.

Why this is too much now:

- it adds storage and broader state-management questions,
- it risks delaying the core tree/position interaction,
- it may overbuild before the UX is validated.

This should be a later phase after the Search Lab MVP is usable.

## Recommended Direction

Build a dedicated **Search Lab / 搜索实验室** page as the first implementation slice.

The first version should focus on single-run exploration:

1. choose a position,
2. configure one search engine,
3. run the search,
4. inspect result metrics,
5. inspect the search tree,
6. click nodes to preview evaluated positions,
7. save recent runs locally in page state.

Comparison mode, benchmark CSV visualization, and persistent experiment storage should remain later phases.

## Page Structure

The recommended layout is a three-zone workbench.

```text
┌──────────────────────────────────────────────────────────┐
│ Top navigation: Analysis | Search Lab                    │
├──────────────────┬────────────────────┬─────────────────┤
│ Left             │ Center             │ Right           │
│ Board/Position   │ Search Config      │ Tree/Inspector  │
├──────────────────┴────────────────────┴─────────────────┤
│ Bottom or side drawer: Run History                       │
└──────────────────────────────────────────────────────────┘
```

### Left: Board and position controls

Responsibilities:

- show the root position,
- allow FEN input or reuse current board position,
- show the selected tree-node position when a node is clicked,
- clearly distinguish root position from inspected node position.

Important UX rule:

> The user must never be confused about whether they are looking at the input position or a node inside the search tree.

### Center: Search configuration

Responsibilities:

- choose engine mode: `Alpha-Beta` or `MCTS`,
- expose evaluator choice for Alpha-Beta,
- expose Alpha-Beta depth and move ordering,
- expose MCTS iterations and exploration constant,
- provide a primary “Run Search” action,
- warn when settings are likely to produce a very large tree.

Evaluator choices:

- `Material`: counts piece values only.
- `PST`: material plus piece-square-table positional bonuses.
- `Heuristic`: material plus positional/mobility/pawn/king-safety heuristics.

### Right: Tree and node inspector

Responsibilities:

- render the search tree,
- show result summary cards,
- show instrumentation metrics,
- let the user select a node,
- show selected-node metadata.

Useful visual distinctions:

- root node,
- max node,
- min node,
- pruned node,
- MCTS rollout/statistical node.

### Bottom or side drawer: Run history

Each run card should record:

- engine,
- evaluator,
- depth or MCTS parameters,
- best move,
- evaluation,
- nodes evaluated,
- time,
- NPS,
- timestamp.

Clicking a run should restore:

- config,
- result summary,
- tree,
- selected root position.

## Component Design

### `SearchLabPage.tsx`

Dedicated route/page shell.

Responsibilities:

- page layout,
- page title and navigation context,
- mounting the workbench.

### `SearchWorkbench.tsx`

Main Search Lab orchestrator.

Responsibilities:

- root FEN state,
- current config state,
- request lifecycle,
- current result state,
- selected tree-node state,
- local run-history state.

### `EvaluatorSelector.tsx`

Small focused component for `material`, `pst`, and `heuristic`.

Responsibilities:

- display evaluator options as tabs/chips,
- show short explanatory text,
- emit selected evaluator.

### `SearchHyperparamsPanel.tsx`

Focused hyperparameter control panel.

Responsibilities:

- Alpha-Beta depth,
- Alpha-Beta move ordering,
- MCTS iterations,
- MCTS exploration constant,
- validation and warnings for expensive settings.

### `SearchTreeExplorer.tsx`

Wrapper around the existing `TreeVisualizer`.

Responsibilities:

- render the tree,
- support selected-node callbacks,
- provide filters such as show/hide pruned nodes,
- set sensible default expansion depth.

### `PositionInspector.tsx`

Shows the evaluated board position for the selected tree node.

Responsibilities:

- board preview,
- FEN,
- move path from root,
- node type,
- evaluation,
- Alpha-Beta metadata such as alpha/beta/depth if available,
- MCTS metadata such as visits/wins/UCB if available.

### `SearchRunHistory.tsx`

Local run history component.

Responsibilities:

- list recent runs,
- restore prior run,
- expose a future entry point for compare mode.

## Backend/API Design

### MVP backend approach

Do not add a new endpoint for the first slice.

Use the existing endpoint:

```text
POST /api/whitebox/play
```

The request already has the core fields needed by Search Lab:

```json
{
  "fen": "...",
  "engine": "alphabeta",
  "depth": 3,
  "use_move_ordering": true,
  "evaluator": "heuristic",
  "mcts_iterations": 100,
  "mcts_exploration_constant": 1.414
}
```

### Possible small backend extension

To support node-position inspection, the frontend needs enough data to reconstruct or display the board at each tree node.

If the current tree payload does not include enough state, add optional metadata fields to tree nodes:

```json
{
  "fen": "...",
  "move_path": ["e2e4", "e7e5"],
  "metadata": {
    "evaluation": 0.25,
    "alpha": -1.2,
    "beta": 0.4,
    "visits": 42,
    "wins": 18,
    "ucb": 1.31
  }
}
```

This should be optional and backward-compatible.

## Data Flow

```text
User chooses FEN/config
        ↓
SearchWorkbench builds WhiteboxRequest
        ↓
POST /api/whitebox/play
        ↓
Backend runs Alpha-Beta or MCTS
        ↓
Backend returns best move, eval, tree, instrumentation
        ↓
Search Lab renders summary, tree, metrics, node inspector
        ↓
Run is added to local history
```

## MVP Scope

The first implementation should include:

- dedicated Search Lab page,
- top-level navigation between current analysis page and Search Lab,
- FEN input or current-position input,
- Alpha-Beta / MCTS engine selection,
- Alpha-Beta evaluator selector,
- depth and move-ordering controls,
- MCTS iterations and exploration constant controls,
- Run Search button,
- result summary,
- instrumentation cards,
- tree visualization,
- selected-node details,
- local run history.

## Deferred Scope

Do not include these in the first slice unless explicitly requested:

- persistent saved experiments,
- backend database storage,
- benchmark CSV visualization,
- Stockfish-reference overlays,
- side-by-side compare mode,
- animated replay of search expansion,
- collaborative sharing/export.

## Performance Guardrails

- Cap default Alpha-Beta depth to a safe value.
- Warn before high-depth runs.
- Collapse tree by default.
- Consider hiding pruned nodes by default only if the tree becomes unreadable.
- Keep MCTS tree depth display bounded.
- Do not persist huge trees in local storage.

## Risks

### Monolithic `ChessGame`

`ChessGame.tsx` already contains a lot of state and UI. The Search Lab should avoid deep refactors in the first slice. Extract only the reusable pieces needed to mount a separate page.

### Tree-node board reconstruction

If tree nodes do not carry FEN or move-path information, the frontend cannot reliably display evaluated node positions. This may require a small backend tree metadata extension.

### Dense UI complexity

Search trees, metrics, boards, and controls can overwhelm users. The UI should use progressive disclosure: summary first, details on click.

### Runtime cost

Deep searches and large MCTS runs can create heavy trees. The UI should guide users toward safe defaults.

## Testing Strategy

### Frontend

- Component tests for evaluator selector and hyperparameter controls.
- Request-building tests verifying selected evaluator/depth/MCTS parameters are sent correctly.
- Interaction tests for run history restore.
- Interaction tests for selecting a tree node and updating `PositionInspector`.

### Backend

- If tree metadata is extended, add tests that Alpha-Beta tree nodes include enough position metadata for inspection.
- Preserve existing `/api/whitebox/play` compatibility tests.
- Add evaluator-specific API tests only if frontend integration reveals gaps.

### Manual verification

- Run Search Lab with Alpha-Beta + `material` depth 2.
- Run Search Lab with Alpha-Beta + `heuristic` depth 3.
- Toggle move ordering and verify instrumentation changes.
- Run MCTS with low iterations and verify tree/metadata renders.
- Click several tree nodes and verify the inspected position changes.

## Recommended Implementation Phases

### Phase 1: Page shell and single-run Search Lab

- Add navigation/subpage shell.
- Add `SearchLabPage` and `SearchWorkbench`.
- Reuse the existing whitebox endpoint.
- Add evaluator selection and hyperparameter controls.
- Render result summary and tree.

### Phase 2: Node position inspection

- Add `PositionInspector`.
- Add selected-node interactions.
- Extend backend tree metadata only if required.

### Phase 3: Run history and teaching polish

- Add local run history.
- Add metric explanations.
- Add progressive disclosure for advanced metrics.

### Phase 4: Compare mode later

- Side-by-side engine/evaluator comparison.
- Optional benchmark CSV integration.
- Optional Stockfish-reference overlay.

## Recommendation

Proceed with Phase 1 as the first implementation slice:

> Build a dedicated Search Lab page that reuses `/api/whitebox/play`, adds evaluator and hyperparameter controls, renders tree/instrumentation output, and lays the foundation for node-position inspection.

This gives a strong visual demo quickly while keeping the first implementation bounded and maintainable.
