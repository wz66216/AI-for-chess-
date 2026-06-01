# phase2_research/frontend/src/components/

## Responsibility

Feature component layer for the chess product. It groups chessboard interaction, opening-book and analysis displays, and the whitebox inspection UI into cohesive submodules.

## Design

Domain-oriented folder split by capability. `Chessboard/` owns game and analysis orchestration; `Whitebox/` exposes engine configuration, result summarization, and search-tree visualization. Components are mostly controlled by props/state lifted to `ChessGame`.

## Flow

User moves, PGN imports, and analysis requests originate here and are propagated upward to backend APIs. Results flow back into React state, then down into presentational panels and the board display.

## Integration

- Depends on `react-chessboard`, `chess.js`, `axios`, `react-markdown`, `remark-gfm`, and ECharts.
- Consumed by `src/App.tsx`.
- Bridges frontend interaction with backend chess-analysis services.
