# Search Lab Position Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Search Lab workbench where users set up a position visually, confirm it to start search, and optionally auto-refresh analysis after further board moves.

**Architecture:** Keep `SearchWorkbench` as the stateful container, add a focused position-editor layer above the existing Search Lab analysis area, and introduce a small editor-state utility so arbitrary board setups do not depend on `chess.js` legality until confirm time. Reuse `react-chessboard`, existing Search Lab result components, and the current `/api/whitebox/play` request flow without backend changes.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, chess.js, react-chessboard, echarts-for-react, Tailwind CSS.

---

## File Structure

**Design doc:** `C:\Users\15096\Desktop\ChessExplain\docs\plans\2026-05-31-search-lab-position-editor-design.md`

**Create:**
- `phase2_research/frontend/src/components/SearchLab/positionEditorState.ts` — editor-state model, FEN conversion, side-to-move/castling helpers, tray placement helpers
- `phase2_research/frontend/src/components/SearchLab/positionEditorState.test.ts` — unit tests for conversion and editing helpers
- `phase2_research/frontend/src/components/SearchLab/EditableChessboard.tsx` — main board UI using `react-chessboard`
- `phase2_research/frontend/src/components/SearchLab/PieceTray.tsx` — white/black spare pieces with selected-state UI
- `phase2_research/frontend/src/components/SearchLab/PositionSetupControls.tsx` — side-to-move, castling, quick actions
- `phase2_research/frontend/src/components/SearchLab/FenAdvancedPanel.tsx` — FEN textarea + apply/copy actions
- `phase2_research/frontend/src/components/SearchLab/CommitAnalysisBar.tsx` — confirm button, auto-update toggle, dirty-state banner
- `phase2_research/frontend/src/components/SearchLab/PositionEditorPanel.tsx` — top-half workbench compositor
- `phase2_research/frontend/src/components/SearchLab/PositionEditorPanel.test.tsx` — integration test for tray + setup panel callbacks

**Modify:**
- `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx` — switch from raw `fen` editing to `editingPosition`/`committedPosition` flow
- `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.test.tsx` — confirm/new flow, auto-update, stale-result banner
- `phase2_research/frontend/src/components/SearchLab/PositionInspector.tsx` — support confirmed-position default + selected tree node context message
- `phase2_research/frontend/src/components/SearchLab/PositionInspector.test.tsx` — new default-inspector behavior
- `phase2_research/frontend/src/components/SearchLab/SearchTreeExplorer.tsx` — denser tree controls replaced with readable defaults + scrollable container
- `phase2_research/frontend/src/components/SearchLab/SearchTreeExplorer.test.tsx` — updated prune default / helper text assertions
- `phase2_research/frontend/src/components/Whitebox/TreeVisualizer.tsx` — spacing, initial depth, container sizing for less dense trees
- `phase2_research/frontend/src/pages/SearchLabPage.tsx` — keep thin wrapper but format cleanly if touched
- `phase2_research/frontend/src/pages/SearchLabPage.test.tsx` — assert top-half editor entry renders

**Leave untouched:**
- `phase2_research/backend/**`
- `phase2_research/frontend/src/api/whitebox.ts`
- `phase2_research/frontend/src/types/whitebox.ts`
- search default algorithm semantics and request payload shape
- `phase2_research/backend/results/` (never stage, never depend on it)

## Implementation Notes Before Tasks

- Reuse the analysis-page board colors from `ChessGame.tsx`: dark `#779556`, light `#ebecd0`.
- Do not add a new chessboard dependency; use `react-chessboard` already in `package.json`.
- Treat history restore/persistent memory as non-blocking. Keep current lightweight run list only if it remains cheap during integration; do not let it block the main editor workflow.
- Because the editor allows arbitrary placements, keep editor state independent from `chess.js` until confirm/apply-FEN time.

---

### Task 1: Build the position-editor state model

**Files:**
- Create: `phase2_research/frontend/src/components/SearchLab/positionEditorState.ts`
- Test: `phase2_research/frontend/src/components/SearchLab/positionEditorState.test.ts`

- [ ] **Step 1: Write the failing state-model tests**

```ts
import { describe, expect, it } from "vitest";

import {
  DEFAULT_EDITOR_FEN,
  applyPiecePlacement,
  createEditorStateFromFen,
  createStartingEditorState,
  editorStateToFen,
  removePieceAtSquare,
  toggleCastlingRight,
} from "./positionEditorState";

describe("positionEditorState", () => {
  it("creates the standard starting state and exports the starting fen", () => {
    const state = createStartingEditorState();
    expect(editorStateToFen(state)).toBe(DEFAULT_EDITOR_FEN);
  });

  it("places and removes pieces without mutating the original state", () => {
    const empty = createEditorStateFromFen("8/8/8/8/8/8/8/8 w - - 0 1");
    const placed = applyPiecePlacement(empty, "wQ", "d4");
    const removed = removePieceAtSquare(placed, "d4");

    expect(editorStateToFen(placed)).toBe("8/8/8/8/3Q4/8/8/8 w - - 0 1");
    expect(editorStateToFen(removed)).toBe("8/8/8/8/8/8/8/8 w - - 0 1");
    expect(editorStateToFen(empty)).toBe("8/8/8/8/8/8/8/8 w - - 0 1");
  });

  it("updates castling rights and side to move in the exported fen", () => {
    const next = toggleCastlingRight(createStartingEditorState(), "whiteShort");
    expect(editorStateToFen({ ...next, sideToMove: "b" })).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b Qkq - 0 1",
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- positionEditorState.test.ts`

Expected: FAIL with module-not-found / exported-member errors for `positionEditorState`.

- [ ] **Step 3: Write the minimal editor-state utility**

```ts
export type TrayPiece =
  | "wK"
  | "wQ"
  | "wR"
  | "wB"
  | "wN"
  | "wP"
  | "bK"
  | "bQ"
  | "bR"
  | "bB"
  | "bN"
  | "bP";

export type CastlingKey =
  | "whiteShort"
  | "whiteLong"
  | "blackShort"
  | "blackLong";

export type EditorState = {
  pieces: Record<string, TrayPiece>;
  sideToMove: "w" | "b";
  castlingRights: Record<CastlingKey, boolean>;
};

export const DEFAULT_EDITOR_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function createStartingEditorState(): EditorState {
  return createEditorStateFromFen(DEFAULT_EDITOR_FEN);
}

export function applyPiecePlacement(
  state: EditorState,
  piece: TrayPiece,
  square: string,
): EditorState {
  return { ...state, pieces: { ...state.pieces, [square]: piece } };
}
```

Implementation requirements for the same file:
- Parse board rows from FEN into `pieces`
- Serialize `pieces + sideToMove + castlingRights` back to FEN with `-` when no castling is enabled
- Export `removePieceAtSquare`, `toggleCastlingRight`, `setSideToMove`, `clearBoardState`
- Keep helpers pure; no React code in this file

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `npm test -- positionEditorState.test.ts`

Expected: PASS with 3 tests passing.

- [ ] **Step 5: Commit only if explicitly authorized by the user**

```bash
git add phase2_research/frontend/src/components/SearchLab/positionEditorState.ts phase2_research/frontend/src/components/SearchLab/positionEditorState.test.ts
git commit -m "feat: add search lab position editor state"
```

If the user has not explicitly authorized commits, stop after verification and do not stage anything.

---

### Task 2: Build the top-half position editor UI

**Files:**
- Create: `phase2_research/frontend/src/components/SearchLab/EditableChessboard.tsx`
- Create: `phase2_research/frontend/src/components/SearchLab/PieceTray.tsx`
- Create: `phase2_research/frontend/src/components/SearchLab/PositionSetupControls.tsx`
- Create: `phase2_research/frontend/src/components/SearchLab/FenAdvancedPanel.tsx`
- Create: `phase2_research/frontend/src/components/SearchLab/CommitAnalysisBar.tsx`
- Create: `phase2_research/frontend/src/components/SearchLab/PositionEditorPanel.tsx`
- Test: `phase2_research/frontend/src/components/SearchLab/PositionEditorPanel.test.tsx`

- [ ] **Step 1: Write the failing editor-panel test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-chessboard", () => ({
  Chessboard: ({ onSquareClick }: { onSquareClick?: (sq: string) => void }) => (
    <button onClick={() => onSquareClick?.("d4")}>mock-board-square-d4</button>
  ),
}));

import PositionEditorPanel from "./PositionEditorPanel";
import { createStartingEditorState } from "./positionEditorState";

describe("PositionEditorPanel", () => {
  it("lets the user pick a tray piece, place it, toggle controls, and confirm", () => {
    const onEditorChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <PositionEditorPanel
        editorState={createStartingEditorState()}
        boardOrientation="white"
        selectedTrayPiece={null}
        autoRecompute={false}
        fenDraft=""
        fenError=""
        dirty={false}
        onEditorChange={onEditorChange}
        onTrayPieceChange={vi.fn()}
        onBoardOrientationChange={vi.fn()}
        onAutoRecomputeChange={vi.fn()}
        onFenDraftChange={vi.fn()}
        onApplyFen={vi.fn()}
        onCopyFen={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole("button", { name: /确认并开始计算/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /白后/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /应用 FEN/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- PositionEditorPanel.test.tsx`

Expected: FAIL because `PositionEditorPanel` and its child components do not exist yet.

- [ ] **Step 3: Implement the minimal editor UI components**

Create the top-half composition with these exact responsibilities:

```tsx
export default function PositionEditorPanel(props: PositionEditorPanelProps) {
  return (
    <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1.15fr_0.95fr]">
      <EditableChessboard
        editorState={props.editorState}
        boardOrientation={props.boardOrientation}
        selectedTrayPiece={props.selectedTrayPiece}
        onEditorChange={props.onEditorChange}
      />
      <div className="space-y-4">
        <PieceTray
          value={props.selectedTrayPiece}
          onChange={props.onTrayPieceChange}
        />
        <PositionSetupControls
          editorState={props.editorState}
          boardOrientation={props.boardOrientation}
          onEditorChange={props.onEditorChange}
          onBoardOrientationChange={props.onBoardOrientationChange}
        />
        <FenAdvancedPanel
          fenDraft={props.fenDraft}
          fenError={props.fenError}
          onFenDraftChange={props.onFenDraftChange}
          onApplyFen={props.onApplyFen}
          onCopyFen={props.onCopyFen}
        />
        <CommitAnalysisBar
          autoRecompute={props.autoRecompute}
          dirty={props.dirty}
          onAutoRecomputeChange={props.onAutoRecomputeChange}
          onConfirm={props.onConfirm}
        />
      </div>
    </section>
  );
}
```

Implementation requirements:
- `EditableChessboard` must use `react-chessboard` with `customDarkSquareStyle={{ backgroundColor: '#779556' }}` and `customLightSquareStyle={{ backgroundColor: '#ebecd0' }}`
- `PieceTray` must expose buttons with accessible names like `白后`, `黑王`, and `取消选择`
- `PositionSetupControls` must render `白方走` / `黑方走`, 4 castling toggles, `清空棋盘`, `标准开局`, `交换视角`
- `FenAdvancedPanel` must render `应用 FEN` and `复制 FEN`
- `CommitAnalysisBar` must render `确认并开始计算` and `移动后自动更新分析`

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- PositionEditorPanel.test.tsx`

Expected: PASS with the editor shell controls present and the confirm callback firing.

- [ ] **Step 5: Commit only if explicitly authorized by the user**

```bash
git add phase2_research/frontend/src/components/SearchLab/EditableChessboard.tsx phase2_research/frontend/src/components/SearchLab/PieceTray.tsx phase2_research/frontend/src/components/SearchLab/PositionSetupControls.tsx phase2_research/frontend/src/components/SearchLab/FenAdvancedPanel.tsx phase2_research/frontend/src/components/SearchLab/CommitAnalysisBar.tsx phase2_research/frontend/src/components/SearchLab/PositionEditorPanel.tsx phase2_research/frontend/src/components/SearchLab/PositionEditorPanel.test.tsx
git commit -m "feat: add search lab position editor panel"
```

If the user has not explicitly authorized commits, verify only and do not stage.

---

### Task 3: Integrate the position editor into SearchWorkbench

**Files:**
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/PositionInspector.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/PositionInspector.test.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.test.tsx`
- Modify: `phase2_research/frontend/src/pages/SearchLabPage.tsx`
- Modify: `phase2_research/frontend/src/pages/SearchLabPage.test.tsx`

- [ ] **Step 1: Rewrite the failing integration tests first**

Add/update these test cases in `SearchWorkbench.test.tsx`:

```tsx
it("confirms the current editor position and sends its fen to search", async () => {
  vi.mocked(runWhiteboxSearch).mockResolvedValueOnce(mockResult);
  render(<SearchWorkbench />);

  fireEvent.click(screen.getByRole("button", { name: /清空棋盘/i }));
  fireEvent.click(screen.getByRole("button", { name: /白后/i }));
  fireEvent.click(screen.getByRole("button", { name: /mock-board-square-d4/i }));
  fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));

  await waitFor(() =>
    expect(runWhiteboxSearch).toHaveBeenCalledWith(
      "8/8/8/8/3Q4/8/8/8 w - - 0 1",
      expect.objectContaining({ engine: "alphabeta", evaluator: "material" }),
    ),
  );
});

it("shows a stale-analysis banner after editing the board without reconfirming", async () => {
  vi.mocked(runWhiteboxSearch).mockResolvedValueOnce(mockResult);
  render(<SearchWorkbench />);

  fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
  await screen.findByText("搜索结果");
  fireEvent.click(screen.getByRole("button", { name: /黑后/i }));
  fireEvent.click(screen.getByRole("button", { name: /mock-board-square-d4/i }));

  expect(
    screen.getByText(/当前棋盘已变更，以下结果仍基于上一次确认局面。/i),
  ).toBeInTheDocument();
});

it("recomputes automatically when auto-update is enabled and a legal move is made", async () => {
  vi.mocked(runWhiteboxSearch)
    .mockResolvedValueOnce(mockResult)
    .mockResolvedValueOnce({ ...mockResult, best_move: "g1f3" });

  render(<SearchWorkbench />);
  fireEvent.click(screen.getByRole("checkbox", { name: /移动后自动更新分析/i }));
  fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
  await screen.findByText("搜索结果");

  fireEvent.click(screen.getByRole("button", { name: /mock-board-square-e2-e4/i }));

  await waitFor(() => expect(runWhiteboxSearch).toHaveBeenCalledTimes(2));
});
```

Also update `SearchLabPage.test.tsx` to assert the top-half editor appears:

```tsx
expect(screen.getByRole("button", { name: /确认并开始计算/i })).toBeInTheDocument();
expect(screen.getByText("局面设定工作台")).toBeInTheDocument();
```

- [ ] **Step 2: Run the integration tests and verify they fail**

Run: `npm test -- SearchWorkbench.test.tsx SearchLabPage.test.tsx PositionInspector.test.tsx`

Expected: FAIL because `SearchWorkbench` still renders the old FEN-first flow.

- [ ] **Step 3: Implement the integrated state flow in `SearchWorkbench.tsx`**

Required code shape:

```tsx
const [editingPosition, setEditingPosition] = useState(() => createStartingEditorState());
const [committedPosition, setCommittedPosition] = useState(() => createStartingEditorState());
const [fenDraft, setFenDraft] = useState(DEFAULT_EDITOR_FEN);
const [selectedTrayPiece, setSelectedTrayPiece] = useState<TrayPiece | null>(null);
const [autoRecompute, setAutoRecompute] = useState(false);
const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
const [inspectorNode, setInspectorNode] = useState<SearchTreeNode | null>(null);

const editingFen = editorStateToFen(editingPosition);
const committedFen = editorStateToFen(committedPosition);
const isDirty = editingFen !== committedFen;

const commitAndRun = async (nextPosition = editingPosition) => {
  const nextFen = editorStateToFen(nextPosition);
  setCommittedPosition(nextPosition);
  setInspectorNode(null);
  await runSearch(nextFen, config);
};
```

Implementation requirements:
- Replace `PositionInputPanel` usage with `PositionEditorPanel`
- Keep search parameters/result area below the editor panel
- Preserve the existing `runWhiteboxSearch(fen, config)` request shape
- Use `new Chess(nextFen)` only for confirm/apply-FEN validation and for legal piece moves after confirm
- Render a banner above `SearchResultSummary` when `isDirty` is true and `result` exists
- Update `PositionInspector` props so it can show the confirmed inspector default when no tree node is selected
- Keep lightweight run logging if it does not add extra complexity, but do not expand restore/memory behavior in this task

- [ ] **Step 4: Run the updated integration tests to verify they pass**

Run: `npm test -- SearchWorkbench.test.tsx SearchLabPage.test.tsx PositionInspector.test.tsx`

Expected: PASS with the confirm flow, dirty-state banner, and inspector default behavior all covered.

- [ ] **Step 5: Commit only if explicitly authorized by the user**

```bash
git add phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx phase2_research/frontend/src/components/SearchLab/SearchWorkbench.test.tsx phase2_research/frontend/src/components/SearchLab/PositionInspector.tsx phase2_research/frontend/src/components/SearchLab/PositionInspector.test.tsx phase2_research/frontend/src/pages/SearchLabPage.tsx phase2_research/frontend/src/pages/SearchLabPage.test.tsx
git commit -m "feat: integrate search lab position editor"
```

If the user has not explicitly authorized commits, verify only.

---

### Task 4: Improve search-tree readability and inspector linkage

**Files:**
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchTreeExplorer.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchTreeExplorer.test.tsx`
- Modify: `phase2_research/frontend/src/components/Whitebox/TreeVisualizer.tsx`

- [ ] **Step 1: Update the tree tests to reflect the new defaults**

Add/change these assertions in `SearchTreeExplorer.test.tsx`:

```tsx
it("hides pruned nodes by default and explains how to inspect nodes", () => {
  render(<SearchTreeExplorer tree={tree as never} onNodeSelect={vi.fn()} />);

  expect(screen.getByRole("checkbox", { name: /显示剪枝节点/i })).not.toBeChecked();
  expect(screen.getByText(/点击树节点后，局面检查器会切换到对应局面。/i)).toBeInTheDocument();
});

it("shows pruned nodes when toggled on", () => {
  render(<SearchTreeExplorer tree={tree as never} onNodeSelect={vi.fn()} />);
  fireEvent.click(screen.getByRole("checkbox", { name: /显示剪枝节点/i }));

  expect(screen.getByTestId("tree-visualizer")).toHaveAttribute(
    "data-children",
    expect.stringContaining("pruned"),
  );
});
```

- [ ] **Step 2: Run the tree tests to verify they fail**

Run: `npm test -- SearchTreeExplorer.test.tsx`

Expected: FAIL because the current component still shows pruned nodes by default and the helper text has not been updated.

- [ ] **Step 3: Implement the readability improvements**

Required changes:

```tsx
const [showPrunedNodes, setShowPrunedNodes] = useState(false);

<div className="space-y-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
  <p className="text-sm text-slate-600">
    点击树节点后，局面检查器会切换到对应局面。默认仅展示更易阅读的主分支。
  </p>
  <div className="max-h-[480px] overflow-auto rounded-lg border border-slate-100 bg-slate-50/60 p-2">
    <TreeVisualizer data={visibleTree} onNodeSelect={onNodeSelect} />
  </div>
</div>
```

And in `TreeVisualizer.tsx`:
- increase container height from `400px` to `520px`
- widen the chart margins
- set `initialTreeDepth: 1`
- raise label font size modestly and keep `focus: 'descendant'`

- [ ] **Step 4: Run the focused tree tests to verify they pass**

Run: `npm test -- SearchTreeExplorer.test.tsx`

Expected: PASS with the new default prune behavior and helper copy.

- [ ] **Step 5: Commit only if explicitly authorized by the user**

```bash
git add phase2_research/frontend/src/components/SearchLab/SearchTreeExplorer.tsx phase2_research/frontend/src/components/SearchLab/SearchTreeExplorer.test.tsx phase2_research/frontend/src/components/Whitebox/TreeVisualizer.tsx
git commit -m "feat: improve search tree readability"
```

If the user has not explicitly authorized commits, verify only.

---

### Task 5: Full verification and browser smoke test

**Files:**
- Verify only: `phase2_research/frontend/**`
- Optional spot-fix only if verification exposes regressions in touched Search Lab files

- [ ] **Step 1: Run the full frontend verification chain**

Run: `npm test; if ($?) { npm run type-check }; if ($?) { npm run lint }; if ($?) { npm run build }`

Expected:
- `npm test` PASS
- `npm run type-check` PASS
- `npm run lint` PASS
- `npm run build` PASS, allowing the existing non-blocking Vite chunk-size warning only

- [ ] **Step 2: Run a targeted Prettier check on touched Search Lab files**

Run:

```bash
npx prettier --check "src/components/SearchLab/**/*.{ts,tsx}" "src/components/Whitebox/TreeVisualizer.tsx" "src/pages/SearchLabPage.tsx"
```

Expected: `All matched files use Prettier code style!`

- [ ] **Step 3: Do a browser smoke test against `/search-lab`**

Verify these user-visible states manually:
- default page shows the top-half editor, right-side controls, and `确认并开始计算`
- selecting a tray piece and clicking a board square changes the board
- toggling `白方走` / castling rights updates the exported FEN in the advanced panel
- clicking confirm triggers analysis and populates the lower-half result area
- after confirm, moving a piece changes the main board while the stale-result banner appears when auto-update is off
- clicking a search-tree node changes the inspector panel without overwriting the main board

- [ ] **Step 4: Inspect final worktree state**

Run: `git status --short`

Expected: only known worktree dirt plus the intended Search Lab/frontend files. Never stage `phase2_research/backend/results/`.

- [ ] **Step 5: Commit only if explicitly authorized by the user**

```bash
git add phase2_research/frontend/src/components/SearchLab phase2_research/frontend/src/components/Whitebox/TreeVisualizer.tsx phase2_research/frontend/src/pages/SearchLabPage.tsx phase2_research/frontend/src/pages/SearchLabPage.test.tsx
git commit -m "feat: add search lab position editor workflow"
```

If the user has not explicitly authorized commits, stop after reporting verification evidence.

---

## Self-Review

- **Spec coverage:**
  - visual board entry + matching board style: Tasks 2 and 3
  - confirm-then-search flow: Task 3
  - continue moving after confirm + mixed auto-update mode: Task 3
  - search tree density/readability fix: Task 4
  - inspector syncing to confirmed position and tree nodes: Tasks 3 and 4
  - history restore/memory de-scoped: reflected in file structure notes and Task 3 requirements
- **Placeholder scan:** no red-flag placeholder markers or unspecified implementation instructions are intentionally left in this plan.
- **Type consistency:** `EditorState`, `TrayPiece`, `committedPosition`, `autoRecompute`, and `selectedTrayPiece` naming stays consistent across Tasks 1–4.
