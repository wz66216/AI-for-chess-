# frontend/

## Responsibility
A Vite/React frontend for the ChessExplain chess analysis app. It renders the shell, routes no pages, and hosts the interactive chess review workspace.

## Design
Thin composition layer over `src/`: app bootstrap, global styles, and a single feature component tree. UI is stateful and client-driven; backend calls are performed directly from components.

## Flow
`index.html` mounts `src/main.tsx` → `App` → `ChessGame`. The UI state lives in React hooks inside `ChessGame`; user actions update local chess state, then trigger API calls for opening-book lookup, move analysis, or PGN game analysis.

## Integration
Depends on `src/main.tsx`, `src/App.tsx`, `src/index.css`, and `src/components/Chessboard/ChessGame.tsx`. Integrates with the backend at `http://localhost:8000/api/v1/*` and third-party libraries (`react-chessboard`, `chess.js`, `axios`, `react-markdown`).
