# phase2_research/

## Responsibility
Phase 2 research workspace for the whitebox engine lab. This subtree packages a teaching-oriented chess platform that visualizes search trees, compares Alpha-Beta and MCTS behavior, and generates offline benchmark artifacts for coursework/reporting.

## Design
Structured as a second full-stack app. The backend preserves the same FastAPI/service layering as Phase 1 but adds `app/engines/whitebox/` for pure-Python search algorithms and `scripts/` for experiment automation. The frontend reuses the board-analysis interaction model and augments it with a dedicated Whitebox UI module for parameter control and tree rendering.

## Flow
Users manipulate a board position in the Phase 2 frontend, then either run standard analysis routes or submit the current FEN plus engine parameters to `/api/whitebox/play`. The backend executes Alpha-Beta or MCTS, serializes the explored tree, and returns both metrics and visualization data. Offline scripts run batched benchmarks and emit CSV/PNG outputs for reports.

## Integration
- Contains its own backend and frontend applications: [backend/codemap.md](backend/codemap.md), [frontend/codemap.md](frontend/codemap.md).
- Reuses the same external chess/LLM ecosystem as Phase 1, plus ECharts-based tree visualization.
- Conceptually extends Phase 1, but currently duplicates large portions of the stack rather than sharing modules.
