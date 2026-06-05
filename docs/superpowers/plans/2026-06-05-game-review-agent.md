# Game Review Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Inline execution in the main session. Do not dispatch subagents for this project thread.

**Goal:** Add an AI full-game review that summarizes PGN analysis results into key turning points, player issues, and training advice.

**Architecture:** Reuse the existing `/api/v1/analyze-game` Stockfish pass as the factual source, then add a separate `/api/v1/review-game` endpoint that sends a compact, grounded summary to DeepSeek. The frontend keeps single-move analysis and full-game review as separate actions.

**Tech Stack:** FastAPI, Pydantic, python-chess-derived game analysis output, DeepSeek/OpenAI-compatible chat completions, React/TypeScript.

---

### Task 1: Backend Review Schema And Service

**Files:**
- Modify: `phase2_research/backend/app/schemas/analysis.py`
- Create: `phase2_research/backend/app/services/game_review_agent.py`
- Test: `phase2_research/backend/tests/services/test_game_review_agent.py`

Steps:
- Add `GameReviewRequest`, `GameReviewMoment`, `GameReviewAnalysis`, and `GameReviewResponse`.
- Build a compact review payload from `analyze_full_game` output.
- Pick turning points from blunders, mistakes, inaccuracies, and largest win-percent swings.
- Ask the LLM for Chinese JSON, normalize common schema drift, and fall back to deterministic Stockfish facts.

### Task 2: Backend API

**Files:**
- Modify: `phase2_research/backend/app/api/analysis.py`
- Test: `phase2_research/backend/tests/api/test_game_review_api.py`

Steps:
- Add `POST /api/v1/review-game`.
- Reuse `analyze_full_game(request.pgn)` and pass its result into `GameReviewAgent`.
- Preserve existing `/analyze-game` behavior.

### Task 3: Frontend Integration

**Files:**
- Modify: `phase2_research/frontend/src/types/analysis.ts`
- Modify: `phase2_research/frontend/src/api/analysis.ts`
- Modify: `phase2_research/frontend/src/components/Chessboard/ChessGame.tsx`
- Test: `phase2_research/frontend/src/api/analysis.test.ts`
- Test: `phase2_research/frontend/src/components/Chessboard/ChessGame.agent.test.tsx`

Steps:
- Add `reviewGame(pgn)` API helper and response types.
- Add “AI 整盘复盘” button after PGN analysis finishes.
- Render review summary, white/black issues, turning points, critical move, and training plan in the coach panel.
- Keep “深度解析招法” for selected move only.

### Verification

- Run backend unit/API tests.
- Run frontend tests, type-check, lint, and build.
- Restart local backend and reload `http://127.0.0.1:5173/`.
