# Phase 2 PGN Review Layout Design

## Goal

Improve the PGN whole-game analysis view so it reads like a white-vs-black review board instead of a mixed timeline, while also making PGN import submission robust when the textarea value and React state momentarily diverge.

## Current State

- Backend already returns all data needed for a split presentation:
  - `global_accuracy.white` / `global_accuracy.black`
  - `judgments.white` / `judgments.black`
  - `moves[]` with `move_number`, `color`, `san`, `judgment`, `accuracy`, and navigation FEN/uci data
- Frontend currently renders the review as:
  - a shared white/black accuracy summary
  - a single mixed judgment list using `whiteCount / blackCount`
  - a single chronological move list
- PGN import modal currently disables the submit button with `!pgnInput.trim() || analyzingGame`, which depends entirely on React state.

## Problems

### 1. Review information is visually mixed

The user cannot quickly compare white and black decisions side-by-side. White and black move quality are conceptually separate lanes, but the current UI compresses them into shared rows.

### 2. Judgment counts are not separated enough

Showing `white / black` in one row is compact but not scan-friendly. The request is to present statistics per side.

### 3. PGN modal submission is too tightly coupled to controlled-state sync

When the textarea DOM value exists but React state has not updated yet, the submit button remains disabled. The backend path is healthy; the weak point is the frontend modal interaction model.

## Recommended Approach

### A. Keep backend schema unchanged

Do not change `analyze_full_game()` or `/api/v1/analyze-game`. The backend already returns enough structure for the requested layout. This avoids unnecessary API churn and preserves the existing analysis pipeline.

### B. Add frontend-only grouping helpers

Introduce a small helper module for PGN-review presentation logic:

- group `moves[]` into round rows: `{ moveNumber, white?, black? }`
- normalize judgment display rows in a fixed order
- provide a small helper that resolves the effective PGN text from React state plus the live textarea value

This keeps layout logic out of the already-large `ChessGame.tsx` and makes it testable.

### C. Redesign the report block into three sections

1. **Accuracy header** — keep white/black accuracy summary
2. **Split judgment stats** — two cards/columns, one for White and one for Black
3. **Split move review** — a two-column table/grid per move number:
   - left lane: White move card
   - right lane: Black move card
   - each cell remains clickable for navigation

### D. Make PGN submission robust to transient state mismatch

Use a textarea ref and treat the live textarea value as the final source of truth when submitting. Also remove the empty-input disable gate from the submit button so a stale state snapshot cannot block submission. Validation still happens in the submit handler.

## Why This Approach

- Minimal risk: no backend contract changes
- Better readability: matches the user’s white-vs-black mental model
- Testable: move grouping and PGN value resolution can be covered by small unit tests
- Robust: fixes the observed modal issue without needing browser-specific hacks

## Files in Scope

- Modify: `phase2_research/frontend/src/components/Chessboard/ChessGame.tsx`
- Create: `phase2_research/frontend/src/components/Chessboard/gameAnalysisLayout.ts`
- Create: `phase2_research/frontend/src/components/Chessboard/gameAnalysisLayout.test.ts`
- Modify: `phase2_research/frontend/package.json`

## Success Criteria

- PGN report shows White and Black move review in separate columns
- Best/Excellent/Good/Inaccuracy/Mistake/Blunder counts are shown separately for White and Black
- Clicking a white or black move still jumps the board to the correct position
- PGN modal submission works even if the textarea DOM value exists before React state fully syncs
- `npm run test`, `npm run type-check`, and `npm run build` pass
