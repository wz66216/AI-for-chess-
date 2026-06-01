# phase2_research/backend/app/engines/whitebox/

## Responsibility
Concrete whitebox search algorithms and shared tree model for explainable chess evaluation.

## Design
Contains two search strategies: Alpha-Beta pruning with simple material evaluation and heuristic move ordering, and MCTS with UCB1 selection, random rollouts, and backpropagation. `TreeNode` is the common serialization model for frontend visualization.

## Flow
Input board state enters `search()`. Alpha-Beta recursively evaluates child nodes and prunes branches; MCTS iterates select-expand-simulate-backpropagate cycles. Both return JSON-ready trees plus evaluation metadata.

## Integration
- Imported by `app.api.whitebox` and benchmark scripts
- `models.TreeNode` is consumed by both engines
- Output is designed for D3.js/ECharts-style tree visualization
