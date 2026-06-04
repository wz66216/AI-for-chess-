# phase2_research/frontend/

## Responsibility

Frontend application layer for the chess analysis UI. It packages the React
shell, board interaction, engine-analysis controls, Search Lab, deployment
health checks, PGN review workflow, and whitebox inspection panels into a
single browser client.

## Design

Single-page React app with route-level code splitting. `App.tsx` provides the
page chrome and routes:

- `/` and `/analyze`: `ChessGame`
- `/search-lab`: lazy-loaded `SearchLabPage`
- `/health`: lazy-loaded `HealthPage`

Presentation uses Tailwind utility classes. Runtime integration is via HTTP
calls to the backend API.

## Flow

`main.tsx` mounts `App` into `#root`. `App` renders route content:

- `ChessGame` synchronizes board state, opening-book lookup, move analysis,
  PGN game analysis, and whitebox engine queries.
- `SearchLabPage` renders `SearchWorkbench`, which controls position editing,
  search parameters, candidate summaries, tree visualization, node inspection,
  and run history.
- `HealthPage` calls `/health` through the configured `VITE_API_BASE` and shows
  deployment status.

## Integration

- Consumed by the browser entrypoint (`main.tsx`).
- Depends on backend HTTP APIs: `/health`, `/api/v1/opening-book`,
  `/api/v1/analyze-move`, `/api/v1/analyze-game`, `/api/whitebox/play`.
- Embeds `Chessboard`, `WhiteboxControlPanel`, `WhiteboxResultPanel`,
  `TreeVisualizer`, and markdown rendering for AI explanations.
