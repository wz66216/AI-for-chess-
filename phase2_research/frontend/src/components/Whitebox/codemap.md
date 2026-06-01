# phase2_research/frontend/src/components/Whitebox/

## Responsibility

Whitebox engine exploration UI. This folder exposes the parameter panel for selecting Alpha-Beta or MCTS, and the result panel that summarizes search metrics and visualizes the search tree.

## Design

Separated control/result views with a shared DTO boundary. The control panel is a parameter form; the result panel is a metrics dashboard plus tree visualization. `TreeVisualizer` adapts backend tree JSON into ECharts tree-series format.

## Flow

User selects engine settings in `WhiteboxControlPanel` → parent `ChessGame` sends the current FEN and params to `/api/whitebox/play` → backend returns best move, metrics, and tree data → `WhiteboxResultPanel` renders summary cards and passes tree data to `TreeVisualizer` for hierarchical display.

## Integration

- Consumed by `ChessGame.tsx`.
- Depends on `echarts-for-react` for tree rendering.
- Integrates with backend whitebox analysis API response shape (`best_move`, `evaluation`, `nodes_evaluated`, `nps`, `time_ms`, `tree`).
