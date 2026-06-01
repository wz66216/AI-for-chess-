# Phase 2 PGN Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the PGN whole-game analysis UI into separate White/Black review lanes and make PGN import submission robust against textarea/state sync issues.

**Architecture:** Keep the backend response contract unchanged. Add a small frontend helper module for PGN review grouping and PGN text resolution, cover it with unit tests, then update `ChessGame.tsx` to consume those helpers for the new two-column presentation and resilient submit flow.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, Vitest

---

### Task 1: Add test harness and failing helper tests

**Files:**
- Modify: `phase2_research/frontend/package.json`
- Create: `phase2_research/frontend/src/components/Chessboard/gameAnalysisLayout.test.ts`

- [ ] **Step 1: Add a frontend test command and Vitest dev dependency**

Update `phase2_research/frontend/package.json` scripts/devDependencies to include:

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 2: Write the failing tests for move grouping, judgment rows, and PGN fallback**

Create `phase2_research/frontend/src/components/Chessboard/gameAnalysisLayout.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildJudgmentSummaryRows,
  getEffectivePgnText,
  groupMovesByTurn,
} from './gameAnalysisLayout';

describe('groupMovesByTurn', () => {
  it('groups white and black moves into the same turn row', () => {
    const rows = groupMovesByTurn([
      { move_number: 1, color: 'white', san: 'e4', judgment: 'Best' },
      { move_number: 1, color: 'black', san: 'e5', judgment: 'Good' },
      { move_number: 2, color: 'white', san: 'Nf3', judgment: 'Excellent' },
    ] as any);

    expect(rows).toEqual([
      {
        moveNumber: 1,
        white: { move_number: 1, color: 'white', san: 'e4', judgment: 'Best' },
        black: { move_number: 1, color: 'black', san: 'e5', judgment: 'Good' },
      },
      {
        moveNumber: 2,
        white: { move_number: 2, color: 'white', san: 'Nf3', judgment: 'Excellent' },
        black: undefined,
      },
    ]);
  });
});

describe('buildJudgmentSummaryRows', () => {
  it('returns judgment rows in fixed review order for white and black', () => {
    const rows = buildJudgmentSummaryRows({
      white: { Best: 3, Excellent: 2, Good: 1, Inaccuracy: 0, Mistake: 0, Blunder: 1 },
      black: { Best: 4, Excellent: 1, Good: 0, Inaccuracy: 2, Mistake: 1, Blunder: 0 },
    });

    expect(rows.map((row) => row.key)).toEqual([
      'Best',
      'Excellent',
      'Good',
      'Inaccuracy',
      'Mistake',
      'Blunder',
    ]);
    expect(rows[0].white).toBe(3);
    expect(rows[0].black).toBe(4);
    expect(rows[5].white).toBe(1);
    expect(rows[5].black).toBe(0);
  });
});

describe('getEffectivePgnText', () => {
  it('prefers the live textarea value when state is stale', () => {
    expect(getEffectivePgnText('', '1. e4 e5')).toBe('1. e4 e5');
  });

  it('falls back to the controlled state when no live value exists', () => {
    expect(getEffectivePgnText('1. d4 d5', '')).toBe('1. d4 d5');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test`

Expected: FAIL because `./gameAnalysisLayout` does not exist yet.

- [ ] **Step 4: Commit the red test scaffold**

```bash
git add phase2_research/frontend/package.json phase2_research/frontend/src/components/Chessboard/gameAnalysisLayout.test.ts
git commit -m "test: add pgn review helper specs"
```

### Task 2: Implement tested PGN review helpers

**Files:**
- Create: `phase2_research/frontend/src/components/Chessboard/gameAnalysisLayout.ts`
- Test: `phase2_research/frontend/src/components/Chessboard/gameAnalysisLayout.test.ts`

- [ ] **Step 1: Write the minimal helper implementation**

Create `phase2_research/frontend/src/components/Chessboard/gameAnalysisLayout.ts` with:

```ts
export interface ReviewMoveLike {
  move_number: number;
  color: string;
  san: string;
  judgment: string;
}

const JUDGMENT_ORDER = [
  'Best',
  'Excellent',
  'Good',
  'Inaccuracy',
  'Mistake',
  'Blunder',
] as const;

export function groupMovesByTurn(moves: ReviewMoveLike[]) {
  const rows = new Map<number, { moveNumber: number; white?: ReviewMoveLike; black?: ReviewMoveLike }>();

  for (const move of moves) {
    const row = rows.get(move.move_number) ?? { moveNumber: move.move_number };
    if (move.color === 'white') row.white = move;
    if (move.color === 'black') row.black = move;
    rows.set(move.move_number, row);
  }

  return Array.from(rows.values()).sort((a, b) => a.moveNumber - b.moveNumber);
}

export function buildJudgmentSummaryRows(judgments: {
  white: Record<string, number>;
  black: Record<string, number>;
}) {
  return JUDGMENT_ORDER.map((key) => ({
    key,
    white: judgments.white[key] ?? 0,
    black: judgments.black[key] ?? 0,
  }));
}

export function getEffectivePgnText(stateValue: string, liveValue?: string | null) {
  return (liveValue && liveValue.trim() ? liveValue : stateValue).trim();
}
```

- [ ] **Step 2: Run tests to verify helpers pass**

Run: `npm run test`

Expected: PASS for `gameAnalysisLayout.test.ts`

- [ ] **Step 3: Commit the helper implementation**

```bash
git add phase2_research/frontend/src/components/Chessboard/gameAnalysisLayout.ts phase2_research/frontend/src/components/Chessboard/gameAnalysisLayout.test.ts
git commit -m "feat: add pgn review layout helpers"
```

### Task 3: Rework ChessGame PGN review UI and submission flow

**Files:**
- Modify: `phase2_research/frontend/src/components/Chessboard/ChessGame.tsx`
- Create/Use: `phase2_research/frontend/src/components/Chessboard/gameAnalysisLayout.ts`

- [ ] **Step 1: Import the new helpers and add textarea ref**

Update the top of `ChessGame.tsx` to:

```ts
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildJudgmentSummaryRows,
  getEffectivePgnText,
  groupMovesByTurn,
} from './gameAnalysisLayout';
```

Add inside the component:

```ts
const pgnTextareaRef = useRef<HTMLTextAreaElement | null>(null);

const reviewRows = useMemo(() => groupMovesByTurn(gameAnalysis?.moves ?? []), [gameAnalysis]);
const judgmentRows = useMemo(
  () => (gameAnalysis ? buildJudgmentSummaryRows(gameAnalysis.judgments) : []),
  [gameAnalysis],
);
```

- [ ] **Step 2: Make submit use the effective textarea value and validate in handler**

Change `handleAnalyzeGame()` to:

```ts
async function handleAnalyzeGame() {
  const effectivePgn = getEffectivePgnText(pgnInput, pgnTextareaRef.current?.value);
  if (!effectivePgn) {
    alert('请先粘贴合法的 PGN 文本。');
    return;
  }

  setPgnInput(effectivePgn);
  setAnalyzingGame(true);

  try {
    const response = await axios.post<GameAnalysisResponse>(apiUrl('/api/v1/analyze-game'), {
      pgn: effectivePgn,
    });
    setGameAnalysis(response.data);
    setShowPgnModal(false);
    setCurrentMoveIndex(-1);
    setGame(new Chess());
    setAnalysis(null);
    setLastMoveInfo(null);
    setRedoStack([]);
  } catch (error) {
    console.error('Game analysis failed:', error);
    alert('解析 PGN 失败，请确保格式正确且包含合法的对局谱。');
  } finally {
    setAnalyzingGame(false);
  }
}
```

- [ ] **Step 3: Update the modal textarea/button wiring**

Update the modal textarea/button block to include:

```tsx
<textarea
  ref={pgnTextareaRef}
  value={pgnInput}
  onChange={(e) => setPgnInput(e.target.value)}
  onInput={(e) => setPgnInput((e.target as HTMLTextAreaElement).value)}
  ...
/>

<button
  onClick={handleAnalyzeGame}
  disabled={analyzingGame}
>
```

- [ ] **Step 4: Replace the mixed summary block with split white/black stat cards**

Render the judgment summary as two side-by-side cards using `judgmentRows`, for example:

```tsx
<div className="grid gap-3 lg:grid-cols-2">
  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
    <h4 className="text-sm font-semibold text-slate-900">白棋统计</h4>
    {judgmentRows.map((row) => (
      <div key={`white-${row.key}`} className="mt-2 flex justify-between text-sm">
        <span>{row.key}</span>
        <span>{row.white}</span>
      </div>
    ))}
  </div>
  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
    <h4 className="text-sm font-semibold text-slate-900">黑棋统计</h4>
    {judgmentRows.map((row) => (
      <div key={`black-${row.key}`} className="mt-2 flex justify-between text-sm">
        <span>{row.key}</span>
        <span>{row.black}</span>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 5: Replace the mixed move timeline with a two-column move review grid**

Render `reviewRows` as a three-column grid: move number, white move, black move. Each move cell must remain clickable and preserve the existing `goToMove()` behavior.

Use this structure:

```tsx
<div className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-3">
  <div className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
    <span>回合</span>
    <span>白棋</span>
    <span>黑棋</span>
  </div>
  <div onClick={() => goToMove(-1)} ...>初始局面</div>
  {reviewRows.map((row) => (
    <div key={row.moveNumber} className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)] gap-2">
      <div className="...">{row.moveNumber}</div>
      <button onClick={() => row.white && goToMove(gameAnalysis!.moves.indexOf(row.white as any))} ...>
        ...
      </button>
      <button onClick={() => row.black && goToMove(gameAnalysis!.moves.indexOf(row.black as any))} ...>
        ...
      </button>
    </div>
  ))}
</div>
```

Use the same judgment badge color mapping already present in the file.

- [ ] **Step 6: Run tests/build checks**

Run: `npm run test; if ($?) { npm run type-check }; if ($?) { npm run build }`

Expected:
- tests PASS
- type-check PASS
- build PASS

- [ ] **Step 7: Commit the UI change**

```bash
git add phase2_research/frontend/src/components/Chessboard/ChessGame.tsx phase2_research/frontend/src/components/Chessboard/gameAnalysisLayout.ts phase2_research/frontend/src/components/Chessboard/gameAnalysisLayout.test.ts phase2_research/frontend/package.json
git commit -m "feat: split pgn review by side"
```

### Task 4: Browser verification of the PGN workflow

**Files:**
- No code changes required

- [ ] **Step 1: Open the live Phase 2 frontend and import a PGN**

Use the browser workflow to:
- open the app
- open the PGN modal
- paste/fill a valid PGN
- confirm the action button is clickable without the previous stuck-disabled failure mode
- submit the analysis

- [ ] **Step 2: Verify the rendered report matches the new layout**

Confirm all of the following on the page:
- separate White and Black statistics cards
- move review rendered as white column + black column
- each side’s move cells remain individually clickable
- board navigation still responds correctly

- [ ] **Step 3: Record evidence and finish**

Capture the observed accuracy values and at least one row where white and black moves appear side-by-side.

## Self-Review

- Spec coverage: covers split stats, split move columns, and PGN modal bug fix without backend schema churn.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: helper types align with `AnalyzedMove` shape used by `ChessGame.tsx`; the implementation should import helpers rather than re-inventing names.

Plan complete and saved to `docs/superpowers/plans/2026-05-30-phase2-pgn-review.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
