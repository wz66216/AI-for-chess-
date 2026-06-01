# phase2_research/frontend/src/components/Chessboard/

## Responsibility

Primary chess game orchestration layer. `ChessGame.tsx` manages board state, move history navigation, opening-book suggestions, move evaluation, PGN review, and coordination with the whitebox analysis panel.

## Design

Stateful controller component with local React state and event handlers. It combines imperative chess engine state (`chess.js`) with declarative rendering, and uses keyboard shortcuts plus inline controls as alternate command paths.

## Flow

Board drops create a cloned `Chess` instance, validate/apply the move, then update UI state and optionally call analysis APIs. Opening-book requests run on each position change. PGN analysis replaces live game state with a review timeline, while move navigation rehydrates board positions from stored FENs. Whitebox analysis posts the current FEN plus selected engine parameters and renders the returned tree/result panels.

## Integration

- Consumed by `App.tsx`.
- Uses backend endpoints for book lookup, move analysis, game analysis, and whitebox play.
- Composes `WhiteboxControlPanel` and `WhiteboxResultPanel`.
- Relies on `react-chessboard`, `chess.js`, `axios`, and markdown rendering for explanations.
