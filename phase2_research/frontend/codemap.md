# phase2_research/frontend/

## Responsibility

Frontend application layer for the chess analysis UI. It packages the React shell, board interaction, engine-analysis controls, PGN review workflow, and whitebox inspection panels into a single browser client.

## Design

Single-page React app with a container/component split. `App.tsx` provides the page chrome, while `ChessGame` owns nearly all domain state and orchestrates child panels. Presentation uses Tailwind utility classes; runtime integration is via HTTP calls to the backend API.

## Flow

`main.tsx` mounts `App` into `#root` → `App` renders `ChessGame` → `ChessGame` synchronizes board state, opening-book lookup, move analysis, PGN game analysis, and whitebox engine queries. User input on the chessboard or control panels triggers axios requests to backend endpoints and updates local React state for the board, move list, explanations, and tree views.

## Integration

- Consumed by the browser entrypoint (`main.tsx`).
- Depends on backend HTTP APIs: `/api/v1/opening-book`, `/api/v1/analyze-move`, `/api/v1/analyze-game`, `/api/whitebox/play`.
- Embeds `Chessboard`, `WhiteboxControlPanel`, `WhiteboxResultPanel`, `TreeVisualizer`, and markdown rendering for AI explanations.
