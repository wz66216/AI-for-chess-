# Phase 2 Stability Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Phase 2 whitebox app safer, more correct, and easier to run by fixing MCTS perspective handling, constraining whitebox request parameters, and centralizing the frontend API base URL.

**Architecture:** Keep the current repo structure and apply a minimal-change stabilization pass inside `phase2_research/`. Backend changes stay inside the whitebox schema/API/engine layer; frontend changes add a tiny shared API config helper and replace direct `axios` URL literals.

**Tech Stack:** FastAPI, Pydantic, python-chess, React 18, TypeScript, Vite, axios.

---

### Task 1: Backend whitebox safety and correctness

**Files:**
- Modify: `phase2_research/backend/app/schemas/whitebox.py`
- Modify: `phase2_research/backend/app/api/whitebox.py`
- Modify: `phase2_research/backend/app/engines/whitebox/mcts.py`

- [ ] Add bounded schema fields for Alpha-Beta depth and MCTS parameters.
- [ ] Add API-side validation for invalid FEN and defensive engine selection behavior.
- [ ] Make MCTS scoring root-perspective aware and ensure evaluation output matches the same perspective.
- [ ] Run a focused backend smoke test for `/api/whitebox/play` behavior.

### Task 2: Frontend API configuration cleanup

**Files:**
- Create: `phase2_research/frontend/src/lib/api.ts`
- Modify: `phase2_research/frontend/src/components/Chessboard/ChessGame.tsx`

- [ ] Create a shared helper exposing the API base URL and URL join utility.
- [ ] Replace hardcoded `http://localhost:8000` calls with the helper.
- [ ] Preserve current local-dev behavior by default.
- [ ] Run frontend type-check/build verification.

### Task 3: End-to-end runtime verification

**Files:**
- No source changes required unless verification exposes defects.

- [ ] Launch Phase 2 backend.
- [ ] Launch Phase 2 frontend.
- [ ] Open the app in a browser, exercise whitebox analysis, and capture screenshots.
- [ ] If verification exposes runtime issues, fix them and rerun the same checks.
