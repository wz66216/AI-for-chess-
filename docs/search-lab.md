# Search Lab

Search Lab is the teaching-oriented whitebox area of ChessExplain. It lets a
user build or import a FEN, run a search engine, inspect candidate moves, and
click into the generated tree.

## Score Display

All scores shown in Search Lab follow the shared white-centric contract:

```text
positive = White is better
negative = Black is better
```

Candidate rows are ordered by the side-to-move preference. That means Black may
choose the smallest white-centric score, while the displayed score still remains
white-centric.

## Alpha-Beta Explanation

Alpha-Beta tree nodes expose:

- `value`: white-centric score at that node.
- `metadata.alpha`: current alpha lower bound.
- `metadata.beta`: current beta upper bound.
- `metadata.depth_remaining`: remaining search depth.
- `metadata.reason`: pruning reason for pruned nodes, such as
  `beta <= alpha`.
- `metadata.fen`: board position after the node's move.
- `metadata.move_path`: SAN path from the root to the selected node.

The frontend hides pruned nodes by default to keep the tree readable. The
checkbox in Search Lab can show them again when teaching pruning behavior.

## MCTS Explanation

MCTS tree nodes expose:

- `metadata.visits`: number of times the node was visited.
- `metadata.wins`: accumulated white-side reward.
- `metadata.white_win_rate`: white win rate in the node.
- `metadata.ucb`: UCB value used during selection.

The Position Inspector converts `white_win_rate` to a percentage and keeps the
node score as a white-centric score.

At rollout depth cutoffs, MCTS now converts the shared heuristic evaluator into
a white-centric reward instead of treating every non-terminal cutoff as a draw.
This keeps shallow MCTS results from collapsing to `0.00` in ordinary positions.

## Frontend Panels

- `SearchResultSummary`: best move, white-centric score, candidate rows, and
  performance counters.
- `SearchTreeExplorer`: tree visualization plus pruning toggle and legend.
- `PositionInspector`: selected node FEN, move path, Alpha-Beta details, MCTS
  details, and pruning explanation.
- `SearchRunHistory`: restores prior runs and their corresponding position,
  config, and result.

## Regression Coverage

Relevant tests:

- `SearchResultSummary.test.tsx`
- `SearchTreeExplorer.test.tsx`
- `PositionInspector.test.tsx`
- `SearchWorkbench.test.tsx`
- backend whitebox tests under `phase2_research/backend/tests/engines/whitebox/`
