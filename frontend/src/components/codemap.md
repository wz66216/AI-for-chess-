# frontend/src/components/

## Responsibility
Houses reusable UI feature modules. In this app, it currently contains the chessboard experience and any future presentation components that hang off the main page.

## Design
Feature-folder organization. Each component directory encapsulates its own state, UI, and backend interaction rather than sharing a centralized store.

## Flow
The top-level app imports feature components from here. Component-local state tracks board position, analysis state, and modal visibility, then drives rendering and API requests.

## Integration
Consumed by `src/App.tsx`. The chessboard feature depends on backend analysis endpoints and third-party chess/markdown libraries.
