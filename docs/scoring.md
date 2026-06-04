# Scoring Contract

ChessExplain uses one score coordinate system across Stockfish-facing analysis,
whitebox engines, API responses, and frontend display:

```text
positive score = White is better
negative score = Black is better
zero           = equal or drawish
```

This is intentionally independent from the side to move. A black-to-move
position still returns a positive number when White is better, and a negative
number when Black is better.

## Whitebox Engines

Alpha-Beta and MCTS choose moves for the side to move, but their public
evaluations stay white-centric:

- White to move selects the candidate with the largest white-centric score.
- Black to move selects the candidate with the smallest white-centric score.
- Candidate lists are ordered from best move for the side to move, not from
  largest raw score in every position.

MCTS stores rollout reward in a single coordinate system:

```text
1.0 = White win
0.5 = draw or rollout depth limit
0.0 = Black win
```

Selection converts that white win rate into the parent side's preference when
computing UCB. Backpropagation must not flip the reward on alternating plies.

## Terminal Scores

The whitebox evaluators use large centipawn-like values for terminal states:

```text
99999  = White has checkmated Black
-99999 = Black has checkmated White
0      = draw, stalemate, or insufficient material
```

## API Fields

`/api/whitebox/play` currently exposes:

- `evaluation`: white-centric score for the selected line.
- `candidates[].evaluation`: white-centric score for that candidate.
- `candidates`: ordered by the side-to-move preference.

The field name remains `evaluation` for backward compatibility. New code should
treat it as `white_score` semantically even when the JSON field name is not
renamed.
