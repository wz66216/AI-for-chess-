# frontend/src/

## Responsibility
Contains the React application entry layer, global styling, and the top-level composition of the ChessExplain UI.

## Design
Single-page app structure with a root component and a feature-oriented child tree. `main.tsx` is the bootstrap boundary; `App.tsx` provides the page frame; feature logic is isolated in `components/`.

## Flow
`main.tsx` mounts `App` into `#root` and imports `index.css`. `App` renders a fixed layout and delegates all chess interaction to `ChessGame`, so state and network effects do not leak into the bootstrap layer.

## Integration
Used by the Vite build entrypoint. Imports `src/index.css` for global styles and `src/components/Chessboard/ChessGame.tsx` for all feature behavior.
