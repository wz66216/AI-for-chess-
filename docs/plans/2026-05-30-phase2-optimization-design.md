# Phase 2 Optimization Design

## Goal
Stabilize the Phase 2 whitebox analysis experience so it is safer to run, more correct algorithmically, and easier to launch outside a hardcoded localhost-only environment.

## Scope
This iteration is intentionally bounded to high-value fixes that improve correctness and operability without attempting the larger Phase 1/Phase 2 deduplication refactor.

Included:
- Fix likely MCTS reward/backpropagation perspective bug.
- Add backend-side validation and limits for whitebox parameters.
- Remove hardcoded frontend API URLs by centralizing the API base URL.
- Run the Phase 2 app end-to-end and verify it in the browser with screenshots.

Excluded:
- Splitting the oversized `ChessGame.tsx` component.
- Refactoring the duplicated Phase 1 / Phase 2 architecture.
- Reworking Stockfish lifecycle management.

## Approach
Backend correctness comes first. The MCTS implementation currently treats rollout reward as white-centric and backpropagates it unchanged through alternating plies. The fix will make search statistics root-perspective aware so move selection remains valid for both white-to-move and black-to-move positions.

Operational safety comes next. The `/api/whitebox/play` endpoint will reject abusive or nonsensical parameter combinations through schema constraints and server-side guardrails. This protects the browser and FastAPI worker from oversized tree computations.

Frontend operability will be improved by replacing inline `http://localhost:8000/...` strings with a small API helper driven by `VITE_API_BASE_URL`, defaulting to the current local backend for development.

## Verification Strategy
- Frontend type-check/build must pass.
- Backend modules must import and targeted whitebox requests must return success.
- Browser verification must show the page loads and whitebox analysis renders without obvious runtime errors.
