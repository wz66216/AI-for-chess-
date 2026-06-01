# phase2_research/frontend/src/

## Responsibility

Application source root for the React client. It contains the bootstrap entrypoint, top-level layout, styling import, and feature components used by the chess analysis experience.

## Design

Minimal bootstrap layer plus a stateful feature module. `main.tsx` is purely procedural startup; `App.tsx` is a thin composition wrapper; `components/` holds the interactive domain UI.

## Flow

Browser loads `main.tsx` → imports global CSS → renders `App` → app delegates to feature components. State and control flow are concentrated below the app shell, especially inside `ChessGame`, which owns game position, analysis state, and whitebox results.

## Integration

- `main.tsx` links the bundle to the DOM root.
- `App.tsx` composes the feature surface.
- `components/` connects UI widgets to backend services and third-party chess/markdown libraries.
