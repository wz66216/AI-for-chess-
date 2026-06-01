# Phase 2 Search Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated Phase 2 Search Lab subpage for visualizing whitebox chess-search runs, selecting evaluators, tuning hyperparameters, inspecting search trees, and previewing evaluated positions.

**Architecture:** Add a focused Search Lab route/page in the Phase 2 frontend while preserving the existing analysis page. Reuse the existing `/api/whitebox/play` endpoint, add optional tree-node metadata on the backend for position inspection, and keep run history local to the page for the first slice.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, ECharts, react-chessboard/chess.js patterns already in the Phase 2 frontend, FastAPI/Pydantic backend, python-chess whitebox engines, pytest, Vitest + React Testing Library for new frontend tests.

---

## Execution Context

Use the existing worktree unless a new one is explicitly created by the controller:

```text
C:\Users\15096\Desktop\ChessExplain\.worktrees\phase2-backend-search-research
```

Frontend commands run from:

```bash
phase2_research/frontend
```

Backend commands run from:

```bash
phase2_research/backend
```

Do not commit unless the user explicitly authorizes commits. The plan includes verification checkpoints instead of mandatory commit steps.

## File Structure / Responsibility Map

### Backend

- **Modify:** `phase2_research/backend/app/engines/whitebox/minimax.py`
  - Add optional `fen` and `move_path` metadata to Alpha-Beta tree nodes so the Search Lab can inspect evaluated positions.
- **Modify:** `phase2_research/backend/app/engines/whitebox/mcts.py`
  - Add optional `fen` and `move_path` metadata to serialized MCTS tree nodes.
- **Add:** `phase2_research/backend/tests/engines/whitebox/test_tree_metadata.py`
  - Lock down tree-node position metadata for Alpha-Beta and MCTS.

### Frontend test harness

- **Modify:** `phase2_research/frontend/package.json`
  - Add frontend test scripts and dev dependencies.
- **Add:** `phase2_research/frontend/vitest.config.ts`
  - Configure Vitest for React component tests.
- **Add:** `phase2_research/frontend/src/test/setup.ts`
  - Register jest-dom matchers.

### Frontend shared types/API

- **Add:** `phase2_research/frontend/src/types/whitebox.ts`
  - Shared typed request/response/tree models for Search Lab and existing whitebox UI.
- **Add:** `phase2_research/frontend/src/api/whitebox.ts`
  - Request builder and `runWhiteboxSearch(...)` wrapper for `POST /api/whitebox/play`.
- **Add:** `phase2_research/frontend/src/api/whitebox.test.ts`
  - Test evaluator-aware request mapping and API error behavior.

### Frontend page/navigation

- **Modify:** `phase2_research/frontend/src/App.tsx`
  - Add top-level navigation and routes for Analysis and Search Lab.
- **Modify:** `phase2_research/frontend/src/main.tsx`
  - Wrap `App` in `BrowserRouter` so route links and `Routes` work in the browser.
- **Add:** `phase2_research/frontend/src/pages/SearchLabPage.tsx`
  - Dedicated Search Lab subpage shell.
- **Add:** `phase2_research/frontend/src/pages/SearchLabPage.test.tsx`
  - Test that the Search Lab route renders the new page.

### Frontend Search Lab components

- **Add directory:** `phase2_research/frontend/src/components/SearchLab/`
- **Add:** `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx`
  - Orchestrates FEN, config, request lifecycle, result, selected node, and local run history.
- **Add:** `phase2_research/frontend/src/components/SearchLab/EvaluatorSelector.tsx`
  - `material` / `pst` / `heuristic` selector with teaching descriptions.
- **Add:** `phase2_research/frontend/src/components/SearchLab/SearchHyperparamsPanel.tsx`
  - Engine-specific hyperparameter controls and safe-run warnings.
- **Add:** `phase2_research/frontend/src/components/SearchLab/PositionInputPanel.tsx`
  - Root FEN input and validation feedback.
- **Add:** `phase2_research/frontend/src/components/SearchLab/SearchResultSummary.tsx`
  - Best move, eval, nodes, NPS, time, and instrumentation cards.
- **Add:** `phase2_research/frontend/src/components/SearchLab/SearchTreeExplorer.tsx`
  - Wrapper around existing `TreeVisualizer` with node selection and pruned-node visibility controls.
- **Add:** `phase2_research/frontend/src/components/SearchLab/PositionInspector.tsx`
  - Shows root-vs-selected-node distinction, FEN, move path, and metadata.
- **Add:** `phase2_research/frontend/src/components/SearchLab/SearchRunHistory.tsx`
  - Local run history and restore action.
- **Add:** focused tests under `phase2_research/frontend/src/components/SearchLab/*.test.tsx` for components with state transitions.

## Scope Guardrails

- Keep the existing analysis page usable at `/`.
- First slice uses local run history only; no database, persistence, export, or sharing.
- Do not build side-by-side compare mode yet.
- Do not add a new backend endpoint unless `/api/whitebox/play` is proven insufficient.
- Add backend tree metadata as optional fields inside existing `metadata`; preserve existing tree shape.
- Keep expensive search defaults safe: Alpha-Beta depth defaults to `2` or `3`; MCTS iterations default to a modest value; warn for high-cost settings.

## Task 1: Add backend tree-position metadata

**Files:**
- Add: `phase2_research/backend/tests/engines/whitebox/test_tree_metadata.py`
- Modify: `phase2_research/backend/app/engines/whitebox/minimax.py`
- Modify: `phase2_research/backend/app/engines/whitebox/mcts.py`

- [ ] **Step 1: Write failing backend tests for tree metadata**

Create `phase2_research/backend/tests/engines/whitebox/test_tree_metadata.py`:

```python
import random

import chess

from app.engines.whitebox.minimax import AlphaBetaEngine
from app.engines.whitebox.mcts import MCTSEngine


def _first_real_child(tree: dict) -> dict:
    children = tree.get("children") or []
    return next(child for child in children if not child.get("is_pruned"))


def test_alphabeta_tree_nodes_include_fen_and_move_path_metadata():
    board = chess.Board()
    result = AlphaBetaEngine(depth=1).search(board)

    root = result["tree"]
    assert root["metadata"]["fen"] == board.fen()
    assert root["metadata"]["move_path"] == []

    child = _first_real_child(root)
    child_board = chess.Board(child["metadata"]["fen"])

    assert child["metadata"]["move_path"] == [child["name"]]
    assert child_board.is_valid()


def test_mcts_tree_nodes_include_fen_and_move_path_metadata():
    random.seed(0)
    board = chess.Board()
    result = MCTSEngine(iterations=5).search(board)

    root = result["tree"]
    assert root["metadata"]["fen"] == board.fen()
    assert root["metadata"]["move_path"] == []

    child = _first_real_child(root)
    child_board = chess.Board(child["metadata"]["fen"])

    assert child["metadata"]["move_path"] == [child["name"]]
    assert child_board.is_valid()
```

- [ ] **Step 2: Run the backend metadata tests and verify they fail**

Run from `phase2_research/backend`:

```bash
python -m pytest tests/engines/whitebox/test_tree_metadata.py -v
```

Expected: FAIL with missing `metadata["fen"]` and/or missing `metadata["move_path"]`.

- [ ] **Step 3: Add Alpha-Beta tree metadata**

Modify `phase2_research/backend/app/engines/whitebox/minimax.py` so root, normal children, and pruned markers carry optional position metadata. The implementation should preserve existing response keys.

Use this shape for the root node in `search(...)`:

```python
root_node = TreeNode(
    id=root_id,
    name="ROOT",
    node_type="root",
    metadata={
        "alpha": -float("inf"),
        "beta": float("inf"),
        "fen": board.fen(),
        "move_path": [],
        "depth_remaining": self.depth,
    },
)
```

Change `_alphabeta(...)` to accept a move-path parameter:

```python
def _alphabeta(
    self,
    board: chess.Board,
    depth: int,
    alpha: float,
    beta: float,
    maximizing_player: bool,
    current_node: TreeNode,
    move_path: Optional[list[str]] = None,
) -> Tuple[float, Optional[chess.Move]]:
    move_path = move_path or []
```

When recursing into a move, compute the child path and child FEN after pushing the move:

```python
next_move_path = [*move_path, move.uci()]
board.push(move)
child_node = TreeNode(
    id=str(uuid.uuid4()),
    name=move.uci(),
    node_type="max" if maximizing_player else "min",
    metadata={
        "alpha": alpha,
        "beta": beta,
        "fen": board.fen(),
        "move_path": next_move_path,
        "depth_remaining": depth - 1,
    },
)
current_node.children.append(child_node)
eval_val, _ = self._alphabeta(
    board,
    depth - 1,
    alpha,
    beta,
    not maximizing_player,
    child_node,
    next_move_path,
)
board.pop()
```

When adding a pruned marker, include the current board context:

```python
metadata={
    "reason": f"beta {beta} <= alpha {alpha}",
    "fen": board.fen(),
    "move_path": move_path,
    "depth_remaining": depth,
}
```

Keep the maximizing/minimizing value logic unchanged.

- [ ] **Step 4: Add MCTS tree metadata**

Modify `phase2_research/backend/app/engines/whitebox/mcts.py` with a helper that reconstructs the move path from the node parent chain:

```python
def _move_path_for_node(self, node: MCTSNode) -> list[str]:
    moves: list[str] = []
    current = node
    while current is not None and current.move is not None:
        moves.append(current.move.uci())
        current = current.parent
    return list(reversed(moves))
```

Then include `fen` and `move_path` in `_serialize_to_viz(...)` metadata:

```python
metadata={
    "visits": node.visits,
    "wins": node.wins,
    "ucb": node.ucb1(self.exploration_constant) if node.parent else 0,
    "fen": node.state,
    "move_path": self._move_path_for_node(node),
}
```

- [ ] **Step 5: Verify backend metadata tests pass**

Run from `phase2_research/backend`:

```bash
python -m pytest tests/engines/whitebox/test_tree_metadata.py -v
```

Expected: PASS.

- [ ] **Step 6: Run existing whitebox backend tests**

Run:

```bash
python -m pytest tests/engines/whitebox tests/api/test_whitebox_api.py -v
```

Expected: PASS.

## Task 2: Add frontend test harness and shared whitebox types

**Files:**
- Modify: `phase2_research/frontend/package.json`
- Add: `phase2_research/frontend/vitest.config.ts`
- Add: `phase2_research/frontend/src/test/setup.ts`
- Add: `phase2_research/frontend/src/types/whitebox.ts`
- Add: `phase2_research/frontend/src/api/whitebox.ts`
- Add: `phase2_research/frontend/src/api/whitebox.test.ts`

- [ ] **Step 1: Install frontend test dependencies**

Run from `phase2_research/frontend`:

```bash
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: `package.json` and lockfile update with those dev dependencies.

- [ ] **Step 2: Add test scripts**

Modify `phase2_research/frontend/package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Add Vitest config and setup**

Create `phase2_research/frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

Create `phase2_research/frontend/src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Add shared whitebox types**

Create `phase2_research/frontend/src/types/whitebox.ts`:

```typescript
export type WhiteboxEngine = 'alphabeta' | 'mcts'
export type EvaluatorName = 'material' | 'pst' | 'heuristic'

export interface WhiteboxRequest {
  fen: string
  engine: WhiteboxEngine
  depth: number
  use_move_ordering: boolean
  evaluator: EvaluatorName
  mcts_iterations: number
  mcts_exploration_constant: number
}

export interface SearchTreeNodeMetadata {
  fen?: string
  move_path?: string[]
  alpha?: number | string
  beta?: number | string
  depth_remaining?: number
  reason?: string
  visits?: number
  wins?: number
  ucb?: number
  [key: string]: unknown
}

export interface SearchTreeNode {
  id: string
  name: string
  value?: number | null
  node_type: 'root' | 'max' | 'min' | 'pruned' | 'mcts' | string
  is_pruned?: boolean
  metadata?: SearchTreeNodeMetadata
  children?: SearchTreeNode[]
}

export interface WhiteboxInstrumentation {
  evaluator_name?: EvaluatorName
  nodes_evaluated?: number
  leaf_nodes_evaluated?: number
  pruned_nodes?: number
  cutoffs?: number
  max_depth_reached?: number
  branching_factor?: number
  depth_node_counts?: Record<string, number>
  nodes_visited?: number
  leaf_evaluations?: number
  generated_children?: number
  remaining_depth_counts?: Record<string, number>
  children_by_remaining_depth?: Record<string, number>
}

export interface WhiteboxResult {
  best_move: string | null
  evaluation: number
  nodes_evaluated: number
  nps: number
  time_ms: number
  instrumentation?: WhiteboxInstrumentation | null
  tree: SearchTreeNode
}

export interface SearchConfig {
  engine: WhiteboxEngine
  evaluator: EvaluatorName
  depth: number
  useMoveOrdering: boolean
  mctsIterations: number
  mctsExplorationConstant: number
}
```

- [ ] **Step 5: Write failing API request-builder tests**

Create `phase2_research/frontend/src/api/whitebox.test.ts`:

```typescript
import { describe, expect, it, vi, afterEach } from 'vitest'

import { buildWhiteboxRequest, runWhiteboxSearch } from './whitebox'
import type { SearchConfig } from '../types/whitebox'

const config: SearchConfig = {
  engine: 'alphabeta',
  evaluator: 'heuristic',
  depth: 3,
  useMoveOrdering: true,
  mctsIterations: 100,
  mctsExplorationConstant: 1.41,
}

describe('whitebox API helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds evaluator-aware backend requests', () => {
    expect(buildWhiteboxRequest('start-fen', config)).toEqual({
      fen: 'start-fen',
      engine: 'alphabeta',
      evaluator: 'heuristic',
      depth: 3,
      use_move_ordering: true,
      mcts_iterations: 100,
      mcts_exploration_constant: 1.41,
    })
  })

  it('posts to /api/whitebox/play', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          best_move: 'e2e4',
          evaluation: 0,
          nodes_evaluated: 1,
          nps: 1,
          time_ms: 1,
          tree: { id: 'root', name: 'ROOT', node_type: 'root', metadata: {} },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await runWhiteboxSearch('start-fen', config)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/whitebox/play',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
```

- [ ] **Step 6: Run the API helper test and verify it fails**

Run from `phase2_research/frontend`:

```bash
npm test -- src/api/whitebox.test.ts
```

Expected: FAIL because `src/api/whitebox.ts` does not exist yet.

- [ ] **Step 7: Add API helper implementation**

Create `phase2_research/frontend/src/api/whitebox.ts`:

```typescript
import type { SearchConfig, WhiteboxRequest, WhiteboxResult } from '../types/whitebox'

const WHITEBOX_URL = 'http://localhost:8000/api/whitebox/play'

export function buildWhiteboxRequest(fen: string, config: SearchConfig): WhiteboxRequest {
  return {
    fen,
    engine: config.engine,
    evaluator: config.evaluator,
    depth: config.depth,
    use_move_ordering: config.useMoveOrdering,
    mcts_iterations: config.mctsIterations,
    mcts_exploration_constant: config.mctsExplorationConstant,
  }
}

export async function runWhiteboxSearch(fen: string, config: SearchConfig): Promise<WhiteboxResult> {
  const response = await fetch(WHITEBOX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildWhiteboxRequest(fen, config)),
  })

  if (!response.ok) {
    throw new Error(`Whitebox search failed: ${response.status}`)
  }

  return response.json() as Promise<WhiteboxResult>
}
```

- [ ] **Step 8: Verify frontend API helper tests pass**

Run:

```bash
npm test -- src/api/whitebox.test.ts
```

Expected: PASS.

## Task 3: Add route/page shell for Analysis and Search Lab

**Files:**
- Modify: `phase2_research/frontend/src/App.tsx`
- Modify: `phase2_research/frontend/src/main.tsx`
- Add: `phase2_research/frontend/src/pages/SearchLabPage.tsx`
- Add: `phase2_research/frontend/src/pages/SearchLabPage.test.tsx`

- [ ] **Step 1: Write failing page-shell tests**

Create `phase2_research/frontend/src/pages/SearchLabPage.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import App from '../App'

describe('Search Lab routing', () => {
  it('renders the dedicated Search Lab page at /search-lab', () => {
    render(
      <MemoryRouter initialEntries={['/search-lab']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /搜索实验室|Search Lab/i })).toBeInTheDocument()
    expect(screen.getByText(/可视化 Alpha-Beta 和 MCTS 搜索过程/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the page-shell test and verify it fails**

Run from `phase2_research/frontend`:

```bash
npm test -- src/pages/SearchLabPage.test.tsx
```

Expected: FAIL because `SearchLabPage` and routes are not implemented.

- [ ] **Step 3: Add the Search Lab page placeholder**

Create `phase2_research/frontend/src/pages/SearchLabPage.tsx`:

```typescript
export function SearchLabPage() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Phase 2</p>
        <h2 className="text-2xl font-bold text-slate-900">搜索实验室 Search Lab</h2>
        <p className="mt-2 text-sm text-slate-600">
          可视化 Alpha-Beta 和 MCTS 搜索过程，比较评估函数，调整搜索深度与超参数。
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
        Search Lab workbench will render here.
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Update App routing and navigation**

Modify `phase2_research/frontend/src/App.tsx` so it uses `Routes`, `Route`, `NavLink`, and keeps the existing analysis page at `/`:

```typescript
import { NavLink, Route, Routes } from 'react-router-dom'

import ChessGame from './components/Chessboard/ChessGame'
import { SearchLabPage } from './pages/SearchLabPage'

function App() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ChessExplain Phase 2</h1>
            <p className="text-sm text-slate-500">Analysis and whitebox search research workspace</p>
          </div>
          <nav className="flex gap-2" aria-label="Primary navigation">
            <NavLink to="/" className={navLinkClass} end>
              Analysis
            </NavLink>
            <NavLink to="/search-lab" className={navLinkClass}>
              Search Lab
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Routes>
          <Route path="/" element={<ChessGame />} />
          <Route path="/search-lab" element={<SearchLabPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
```

- [ ] **Step 5: Wrap App with BrowserRouter in the browser entrypoint**

Modify `phase2_research/frontend/src/main.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

- [ ] **Step 6: Verify page-shell test passes**

Run:

```bash
npm test -- src/pages/SearchLabPage.test.tsx
```

Expected: PASS.

## Task 4: Build Search Lab configuration controls

**Files:**
- Add: `phase2_research/frontend/src/components/SearchLab/EvaluatorSelector.tsx`
- Add: `phase2_research/frontend/src/components/SearchLab/SearchHyperparamsPanel.tsx`
- Add: `phase2_research/frontend/src/components/SearchLab/PositionInputPanel.tsx`
- Add: component tests for those files

- [ ] **Step 1: Write failing EvaluatorSelector tests**

Create `phase2_research/frontend/src/components/SearchLab/EvaluatorSelector.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EvaluatorSelector } from './EvaluatorSelector'

describe('EvaluatorSelector', () => {
  it('shows evaluator choices with teaching descriptions', async () => {
    const onChange = vi.fn()
    render(<EvaluatorSelector value="material" onChange={onChange} />)

    expect(screen.getByRole('button', { name: /Material/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /PST/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Heuristic/i })).toBeInTheDocument()
    expect(screen.getByText(/counts piece values/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Heuristic/i }))
    expect(onChange).toHaveBeenCalledWith('heuristic')
  })
})
```

- [ ] **Step 2: Add EvaluatorSelector implementation**

Create `phase2_research/frontend/src/components/SearchLab/EvaluatorSelector.tsx`:

```typescript
import type { EvaluatorName } from '../../types/whitebox'

interface EvaluatorSelectorProps {
  value: EvaluatorName
  onChange: (value: EvaluatorName) => void
  disabled?: boolean
}

const evaluators: Array<{ value: EvaluatorName; label: string; description: string }> = [
  { value: 'material', label: 'Material', description: 'Counts piece values only.' },
  { value: 'pst', label: 'PST', description: 'Adds piece-square positional bonuses.' },
  { value: 'heuristic', label: 'Heuristic', description: 'Adds mobility, pawn structure, and king safety.' },
]

export function EvaluatorSelector({ value, onChange, disabled = false }: EvaluatorSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Evaluator</h3>
        <p className="text-xs text-slate-500">Choose how Alpha-Beta scores leaf positions.</p>
      </div>
      <div className="grid gap-2">
        {evaluators.map((evaluator) => {
          const selected = evaluator.value === value
          return (
            <button
              key={evaluator.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(evaluator.value)}
              className={`rounded-lg border p-3 text-left transition ${
                selected ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white hover:border-blue-300'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <div className="font-medium">{evaluator.label}</div>
              <div className="text-xs text-slate-500">{evaluator.description}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write failing hyperparameter panel tests**

Create `phase2_research/frontend/src/components/SearchLab/SearchHyperparamsPanel.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SearchHyperparamsPanel } from './SearchHyperparamsPanel'
import type { SearchConfig } from '../../types/whitebox'

const baseConfig: SearchConfig = {
  engine: 'alphabeta',
  evaluator: 'material',
  depth: 2,
  useMoveOrdering: true,
  mctsIterations: 100,
  mctsExplorationConstant: 1.41,
}

describe('SearchHyperparamsPanel', () => {
  it('shows Alpha-Beta controls and updates depth', async () => {
    const onChange = vi.fn()
    render(<SearchHyperparamsPanel config={baseConfig} onChange={onChange} />)

    expect(screen.getByLabelText(/Depth/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Move ordering/i)).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText(/Depth/i))
    await userEvent.type(screen.getByLabelText(/Depth/i), '3')

    expect(onChange).toHaveBeenLastCalledWith({ ...baseConfig, depth: 3 })
  })

  it('shows MCTS controls only for MCTS', () => {
    render(<SearchHyperparamsPanel config={{ ...baseConfig, engine: 'mcts' }} onChange={vi.fn()} />)

    expect(screen.getByLabelText(/Iterations/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Exploration/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Add SearchHyperparamsPanel implementation**

Create `phase2_research/frontend/src/components/SearchLab/SearchHyperparamsPanel.tsx` with controlled inputs for engine, depth, move ordering, MCTS iterations, and exploration constant. Keep engine-specific controls conditional:

```typescript
import type { SearchConfig, WhiteboxEngine } from '../../types/whitebox'

interface SearchHyperparamsPanelProps {
  config: SearchConfig
  onChange: (config: SearchConfig) => void
}

export function SearchHyperparamsPanel({ config, onChange }: SearchHyperparamsPanelProps) {
  const update = (patch: Partial<SearchConfig>) => onChange({ ...config, ...patch })
  const setEngine = (engine: WhiteboxEngine) => update({ engine })

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Search Engine</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setEngine('alphabeta')} className={config.engine === 'alphabeta' ? 'rounded-lg bg-blue-600 px-3 py-2 text-white' : 'rounded-lg bg-slate-100 px-3 py-2'}>
            Alpha-Beta
          </button>
          <button type="button" onClick={() => setEngine('mcts')} className={config.engine === 'mcts' ? 'rounded-lg bg-blue-600 px-3 py-2 text-white' : 'rounded-lg bg-slate-100 px-3 py-2'}>
            MCTS
          </button>
        </div>
      </div>

      {config.engine === 'alphabeta' ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Depth
            <input
              aria-label="Depth"
              type="number"
              min={1}
              max={5}
              value={config.depth}
              onChange={(event) => update({ depth: Number(event.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              aria-label="Move ordering"
              type="checkbox"
              checked={config.useMoveOrdering}
              onChange={(event) => update({ useMoveOrdering: event.target.checked })}
            />
            Move ordering
          </label>
          {config.depth >= 4 ? <p className="text-xs text-amber-600">Depth 4+ may produce large trees.</p> : null}
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Iterations
            <input
              aria-label="Iterations"
              type="number"
              min={10}
              max={2000}
              value={config.mctsIterations}
              onChange={(event) => update({ mctsIterations: Number(event.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Exploration constant
            <input
              aria-label="Exploration"
              type="number"
              min={0.1}
              max={3}
              step={0.1}
              value={config.mctsExplorationConstant}
              onChange={(event) => update({ mctsExplorationConstant: Number(event.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Add PositionInputPanel**

Create `phase2_research/frontend/src/components/SearchLab/PositionInputPanel.tsx`:

```typescript
interface PositionInputPanelProps {
  fen: string
  onFenChange: (fen: string) => void
}

export function PositionInputPanel({ fen, onFenChange }: PositionInputPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <label className="block text-sm font-semibold text-slate-900">
        Root FEN
        <textarea
          value={fen}
          onChange={(event) => onFenChange(event.target.value)}
          className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
        />
      </label>
      <p className="mt-2 text-xs text-slate-500">This is the root position. Selected tree-node positions are shown separately.</p>
    </div>
  )
}
```

- [ ] **Step 6: Verify Search Lab control tests pass**

Run:

```bash
npm test -- src/components/SearchLab/EvaluatorSelector.test.tsx src/components/SearchLab/SearchHyperparamsPanel.test.tsx
```

Expected: PASS.

## Task 5: Build SearchWorkbench request flow and result rendering

**Files:**
- Modify: `phase2_research/frontend/src/pages/SearchLabPage.tsx`
- Add: `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx`
- Add: `phase2_research/frontend/src/components/SearchLab/SearchResultSummary.tsx`
- Add: `phase2_research/frontend/src/components/SearchLab/SearchTreeExplorer.tsx`
- Modify: `phase2_research/frontend/src/components/Whitebox/TreeVisualizer.tsx`
- Add: component tests as needed

- [ ] **Step 1: Update TreeVisualizer to support node selection**

Modify `phase2_research/frontend/src/components/Whitebox/TreeVisualizer.tsx` to accept optional props without breaking existing callers:

```typescript
interface TreeVisualizerProps {
  data: any
  onNodeSelect?: (node: any) => void
}

export default function TreeVisualizer({ data, onNodeSelect }: TreeVisualizerProps) {
  // existing implementation
}
```

When building ECharts node data in `processNode`, preserve the original backend node under `rawNode`:

```typescript
const node = {
  name: `${data.name}${data.value !== null && data.value !== undefined ? ` (${data.value.toFixed(1)})` : ''}`,
  value: data.value,
  rawNode: data,
  itemStyle: { color: getNodeColor(data) },
  children: data.children?.map(processNode),
}
```

Add an ECharts click handler that calls `onNodeSelect`:

```typescript
chart.on('click', (params: any) => {
  const rawNode = params.data?.rawNode
  if (rawNode && onNodeSelect) {
    onNodeSelect(rawNode)
  }
})
```

Clean up the handler when disposing the chart.

- [ ] **Step 2: Add SearchResultSummary**

Create `phase2_research/frontend/src/components/SearchLab/SearchResultSummary.tsx`:

```typescript
import type { WhiteboxInstrumentation, WhiteboxResult } from '../../types/whitebox'

interface SearchResultSummaryProps {
  result: WhiteboxResult | null
  loading: boolean
}

function instrumentationItems(instrumentation?: WhiteboxInstrumentation | null) {
  if (!instrumentation) return []
  return [
    ['Evaluator', instrumentation.evaluator_name],
    ['Cutoffs', instrumentation.cutoffs],
    ['Nodes visited', instrumentation.nodes_visited ?? instrumentation.nodes_evaluated],
    ['Leaves', instrumentation.leaf_evaluations ?? instrumentation.leaf_nodes_evaluated],
    ['Generated children', instrumentation.generated_children],
  ].filter(([, value]) => value !== undefined && value !== null)
}

export function SearchResultSummary({ result, loading }: SearchResultSummaryProps) {
  if (loading) return <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">Running search...</div>
  if (!result) return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Run a search to see metrics.</div>

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Result Summary</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-500">Best move</div><div className="font-semibold">{result.best_move ?? 'N/A'}</div></div>
        <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-500">Evaluation</div><div className="font-semibold">{result.evaluation}</div></div>
        <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-500">Nodes</div><div className="font-semibold">{result.nodes_evaluated}</div></div>
        <div className="rounded-lg bg-slate-50 p-3"><div className="text-slate-500">Time</div><div className="font-semibold">{result.time_ms} ms</div></div>
      </div>
      {instrumentationItems(result.instrumentation).length > 0 ? (
        <div className="border-t border-slate-100 pt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Instrumentation</div>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {instrumentationItems(result.instrumentation).map(([label, value]) => (
              <div key={String(label)} className="rounded bg-slate-50 p-2">
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-medium text-slate-800">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 3: Add SearchTreeExplorer**

Create `phase2_research/frontend/src/components/SearchLab/SearchTreeExplorer.tsx`:

```typescript
import TreeVisualizer from '../Whitebox/TreeVisualizer'
import type { SearchTreeNode } from '../../types/whitebox'

interface SearchTreeExplorerProps {
  tree: SearchTreeNode | null
  onNodeSelect: (node: SearchTreeNode) => void
}

export function SearchTreeExplorer({ tree, onNodeSelect }: SearchTreeExplorerProps) {
  if (!tree) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Search tree will appear after a run.</div>
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Search Tree</h3>
        <p className="text-xs text-slate-500">Click a node to inspect the evaluated position and metadata.</p>
      </div>
      <TreeVisualizer data={tree} onNodeSelect={onNodeSelect} />
    </div>
  )
}
```

- [ ] **Step 4: Add SearchWorkbench request flow**

Create `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx`:

```typescript
import { useState } from 'react'

import { runWhiteboxSearch } from '../../api/whitebox'
import type { SearchConfig, SearchTreeNode, WhiteboxResult } from '../../types/whitebox'
import { EvaluatorSelector } from './EvaluatorSelector'
import { PositionInputPanel } from './PositionInputPanel'
import { SearchHyperparamsPanel } from './SearchHyperparamsPanel'
import { SearchResultSummary } from './SearchResultSummary'
import { SearchTreeExplorer } from './SearchTreeExplorer'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const defaultConfig: SearchConfig = {
  engine: 'alphabeta',
  evaluator: 'material',
  depth: 2,
  useMoveOrdering: true,
  mctsIterations: 100,
  mctsExplorationConstant: 1.41,
}

export function SearchWorkbench() {
  const [fen, setFen] = useState(START_FEN)
  const [config, setConfig] = useState<SearchConfig>(defaultConfig)
  const [result, setResult] = useState<WhiteboxResult | null>(null)
  const [selectedNode, setSelectedNode] = useState<SearchTreeNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRun() {
    setLoading(true)
    setError(null)
    setSelectedNode(null)
    try {
      const nextResult = await runWhiteboxSearch(fen, config)
      setResult(nextResult)
      setSelectedNode(nextResult.tree)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(280px,1fr)_minmax(320px,1fr)_minmax(420px,1.3fr)]">
      <div className="space-y-4">
        <PositionInputPanel fen={fen} onFenChange={setFen} />
      </div>
      <div className="space-y-4">
        <SearchHyperparamsPanel config={config} onChange={setConfig} />
        {config.engine === 'alphabeta' ? <EvaluatorSelector value={config.evaluator} onChange={(evaluator) => setConfig({ ...config, evaluator })} /> : null}
        <button type="button" onClick={handleRun} disabled={loading} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
          {loading ? 'Running...' : 'Run Search'}
        </button>
        {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        <SearchResultSummary result={result} loading={loading} />
      </div>
      <div className="space-y-4">
        <SearchTreeExplorer tree={result?.tree ?? null} onNodeSelect={setSelectedNode} />
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Selected node: {selectedNode?.name ?? 'none'}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Mount SearchWorkbench in SearchLabPage**

Modify `phase2_research/frontend/src/pages/SearchLabPage.tsx`:

```typescript
import { SearchWorkbench } from '../components/SearchLab/SearchWorkbench'

export function SearchLabPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Phase 2</p>
        <h2 className="text-2xl font-bold text-slate-900">搜索实验室 Search Lab</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          可视化 Alpha-Beta 和 MCTS 搜索过程，比较评估函数，调整搜索深度与超参数。
        </p>
      </div>
      <SearchWorkbench />
    </section>
  )
}
```

- [ ] **Step 6: Verify page tests and type-check pass**

Run from `phase2_research/frontend`:

```bash
npm test -- src/pages/SearchLabPage.test.tsx src/api/whitebox.test.ts
npm run type-check
```

Expected: PASS.

## Task 6: Add position inspector and local run history

**Files:**
- Add: `phase2_research/frontend/src/components/SearchLab/PositionInspector.tsx`
- Add: `phase2_research/frontend/src/components/SearchLab/SearchRunHistory.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx`
- Add: component tests for inspector/history behavior

- [ ] **Step 1: Add PositionInspector**

Create `phase2_research/frontend/src/components/SearchLab/PositionInspector.tsx`:

```typescript
import type { SearchTreeNode } from '../../types/whitebox'

interface PositionInspectorProps {
  rootFen: string
  node: SearchTreeNode | null
}

export function PositionInspector({ rootFen, node }: PositionInspectorProps) {
  const metadata = node?.metadata
  const fen = metadata?.fen
  const movePath = metadata?.move_path ?? []

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Position Inspector</h3>
      <p className="mt-1 text-xs text-slate-500">Root and selected-node positions are kept separate.</p>
      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Selected node</dt>
          <dd className="font-medium text-slate-900">{node?.name ?? 'No node selected'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Root FEN</dt>
          <dd className="break-all font-mono text-xs text-slate-700">{rootFen}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Selected-node FEN</dt>
          <dd className="break-all font-mono text-xs text-slate-700">{fen ?? 'Metadata unavailable for this node.'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Move path</dt>
          <dd className="text-slate-700">{movePath.length > 0 ? movePath.join(' → ') : 'Root position'}</dd>
        </div>
      </dl>
    </aside>
  )
}
```

- [ ] **Step 2: Add SearchRunHistory**

Create `phase2_research/frontend/src/components/SearchLab/SearchRunHistory.tsx`:

```typescript
import type { SearchConfig, WhiteboxResult } from '../../types/whitebox'

export interface SearchRunRecord {
  id: string
  fen: string
  config: SearchConfig
  result: WhiteboxResult
  createdAt: string
}

interface SearchRunHistoryProps {
  runs: SearchRunRecord[]
  onRestore: (run: SearchRunRecord) => void
  onClear: () => void
}

export function SearchRunHistory({ runs, onRestore, onClear }: SearchRunHistoryProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Run History</h3>
        <button type="button" onClick={onClear} className="text-xs text-slate-500 hover:text-slate-900">
          Clear
        </button>
      </div>
      {runs.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Recent runs will appear here.</p>
      ) : (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {runs.map((run) => (
            <button key={run.id} type="button" onClick={() => onRestore(run)} className="rounded-lg border border-slate-200 p-3 text-left hover:border-blue-300">
              <div className="text-sm font-semibold text-slate-900">{run.config.engine} {run.config.engine === 'alphabeta' ? run.config.evaluator : ''}</div>
              <div className="text-xs text-slate-500">Best: {run.result.best_move ?? 'N/A'} · Nodes: {run.result.nodes_evaluated}</div>
              <div className="text-xs text-slate-400">{new Date(run.createdAt).toLocaleTimeString()}</div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Wire inspector and run history into SearchWorkbench**

Modify `SearchWorkbench.tsx` to add:

```typescript
import { PositionInspector } from './PositionInspector'
import { SearchRunHistory, type SearchRunRecord } from './SearchRunHistory'
```

Add state:

```typescript
const [runs, setRuns] = useState<SearchRunRecord[]>([])
```

After a successful search, add a run record:

```typescript
const record: SearchRunRecord = {
  id: crypto.randomUUID(),
  fen,
  config,
  result: nextResult,
  createdAt: new Date().toISOString(),
}
setRuns((previous) => [record, ...previous].slice(0, 8))
```

Add restore handler:

```typescript
function restoreRun(run: SearchRunRecord) {
  setFen(run.fen)
  setConfig(run.config)
  setResult(run.result)
  setSelectedNode(run.result.tree)
  setError(null)
}
```

Replace the temporary selected-node card with:

```tsx
<PositionInspector rootFen={fen} node={selectedNode} />
```

Render run history below the workbench grid:

```tsx
<SearchRunHistory runs={runs} onRestore={restoreRun} onClear={() => setRuns([])} />
```

- [ ] **Step 4: Verify frontend tests and type-check pass**

Run:

```bash
npm test -- src/components/SearchLab src/pages/SearchLabPage.test.tsx src/api/whitebox.test.ts
npm run type-check
```

Expected: PASS.

## Task 7: Final frontend/backend verification

**Files:**
- Modify only if fixes are required.

- [ ] **Step 1: Run all frontend tests**

Run from `phase2_research/frontend`:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run frontend type-check**

Run:

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 3: Run frontend lint**

Run:

```bash
npm run lint
```

Expected: PASS with zero warnings.

- [ ] **Step 4: Run frontend production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Run backend whitebox tests**

Run from `phase2_research/backend`:

```bash
python -m pytest tests/engines/whitebox tests/api/test_whitebox_api.py -v
```

Expected: PASS.

- [ ] **Step 6: Manual smoke test checklist**

Start backend and frontend in separate terminals:

```bash
# terminal 1, from phase2_research/backend
python -m uvicorn app.main:app --reload

# terminal 2, from phase2_research/frontend
npm run dev
```

Manual checks:
- Open the app and navigate to `Search Lab`.
- Run Alpha-Beta with `material`, depth `2`, move ordering on.
- Run Alpha-Beta with `heuristic`, depth `3`, move ordering on.
- Run MCTS with low iterations such as `50`.
- Click at least one search-tree node and confirm the inspector updates without confusing root FEN and selected-node FEN.
- Restore one previous run from Run History.

Expected: all checks complete without console errors.

## Self-Review Checklist

Before executing this plan, verify:

- Search Lab has a dedicated page instead of being only a mode inside `ChessGame`.
- Existing analysis page remains reachable.
- Alpha-Beta exposes evaluator selection: `material`, `pst`, `heuristic`.
- Alpha-Beta exposes depth and move-ordering controls.
- MCTS exposes iterations and exploration constant.
- Results show best move, eval, nodes, time, NPS, and instrumentation when present.
- Tree node selection updates an inspector.
- Inspector gracefully handles nodes without FEN metadata.
- Run history is local only and capped.
- No persistent storage, compare mode, benchmark CSV visualization, or Stockfish overlay is included in Phase 1.
- Frontend and backend verification commands are explicit.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-30-phase2-search-lab.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
