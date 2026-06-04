# Analysis Diagnostics

The analysis page adds a lightweight diagnosis layer above the raw Stockfish
Multi-PV output. Its job is not to replace engine data, but to translate the
first engine line into a quick human-readable position status.

## Data Source

The diagnosis is computed in the frontend from:

- `analysis.engine_eval.lines[0].score`
- `analysis.engine_eval.lines[0].mate_score`
- `analysis.engine_eval.lines[0].pv`

The raw lines still remain visible below the diagnosis card.

## Score Semantics

All numeric scores are interpreted from White's perspective:

- positive score: White is better;
- negative score: Black is better;
- near zero: balanced.

This matches the project-wide scoring contract described in
`docs/scoring.md`. The UI must not flip the sign just because it is Black to
move.

Mate scores follow the same white-centric convention:

- positive mate score: White has a forced mate;
- negative mate score: Black has a forced mate.

## Buckets

The current frontend helper uses simple thresholds:

| White-centric score | Diagnosis |
| --- | --- |
| `abs(score) < 0.20` | balanced |
| `abs(score) >= 0.60` | small advantage |
| `abs(score) >= 1.50` | clear advantage |
| `abs(score) >= 3.00` | decisive advantage |

Values between `0.20` and `0.60` are described as slightly preferable but still
playable for both sides.

## Implementation

Frontend helper:

```text
phase2_research/frontend/src/components/Chessboard/positionDiagnosis.ts
```

Pure-function tests:

```text
phase2_research/frontend/src/components/Chessboard/positionDiagnosis.test.ts
```

The `ChessGame` component calls `diagnosePosition()` only when at least one
engine line is available. If there is no analysis result yet, the diagnosis card
is hidden.

