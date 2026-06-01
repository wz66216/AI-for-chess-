# phase2_research/backend/app/engines/

## Responsibility
Engine implementations for the explainable whitebox mode. Hosts search algorithms that produce both move recommendations and visualization-ready search trees.

## Design
Strategy-style algorithm boundary: Alpha-Beta and MCTS are separate implementations with a shared output contract. Both build `TreeNode` structures so the frontend can visualize search progression consistently.

## Flow
`benchmark_runner.py` and `/api/whitebox/play` instantiate an engine, call `search(board)`, and receive best move, evaluation, timing, NPS, and tree data. Whitebox engines recursively or iteratively expand chess states and serialize the explored tree.

## Integration
- Exposed via `app.engines.whitebox.__init__`
- Consumed by `app.api.whitebox` and benchmark scripts
- Depends on `python-chess` and `app.engines.whitebox.models`
