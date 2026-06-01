# frontend/src/components/Chessboard/

## Responsibility
Implements the full chess review workspace: board interaction, move navigation, opening-book suggestions, move-by-move engine analysis, and PGN import/review.

## Design
Stateful React feature component built around `chess.js` as the source of truth for legal move generation and FEN/PGN transitions. Uses a controller-style event model: board drops, keyboard shortcuts, and control buttons all dispatch into the same move/state handlers.

## Flow
1. `Chessboard` renders from `game.fen()` and calls `onDrop` on moves.
2. Local handlers clone/load the game, apply legal moves, and update history/redo state.
3. `useEffect` fetches opening-book moves whenever the FEN changes.
4. Optional analysis calls POST to `/api/v1/analyze-move` or `/api/v1/analyze-game`.
5. Responses populate the engine panel, markdown coach explanation, and PGN review sidebar.

## Integration
Depends on `react-chessboard`, `chess.js`, `axios`, `react-markdown`, and `remark-gfm`. Integrates with backend endpoints `GET /api/v1/opening-book`, `POST /api/v1/analyze-move`, and `POST /api/v1/analyze-game` on `localhost:8000`.
