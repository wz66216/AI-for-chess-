# Phase 2 P0 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clearer, more product-ready Phase 2 chess analysis workbench with a Swiss-grid chessboard background, stronger main-vs-secondary hierarchy, unified status UX, explicit score semantics, and a next-step suggestion card.

**Architecture:** Keep the P0 change set frontend-only and bounded to the existing Phase 2 worktree. Most UI work stays inside the current shell files (`App.tsx`, `index.css`, `ChessGame.tsx`, `WhiteboxResultPanel.tsx`) without splitting the large page component. Semantic improvements are implemented as lightweight local helpers and presentational blocks rather than new state architecture.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, react-markdown, react-chessboard, axios

---

## File Structure / Responsibility Map

- **Modify:** `phase2_research/frontend/src/App.tsx`
  - Rebuild the app shell into a unified analysis-stage frame with stronger header, stage container, and page-level hierarchy.
- **Modify:** `phase2_research/frontend/src/index.css`
  - Add the global layered background (light chessboard texture + Swiss grid + soft tech glow) and shared utility classes for panel styling.
- **Modify:** `phase2_research/frontend/src/components/Chessboard/ChessGame.tsx`
  - Reweight the page hierarchy, unify empty/loading/unavailable blocks, add explicit score semantics, and insert the next-step suggestion card.
- **Modify:** `phase2_research/frontend/src/components/Whitebox/WhiteboxResultPanel.tsx`
  - Restyle whitebox output as a secondary “白盒搜索实验室” result surface with softer visual priority and clearer summary.

## Verification Strategy

Because the current Phase 2 frontend does not have an established automated component-test runner, P0 verification stays bounded to:

1. `npm run type-check`
2. `npm run build`
3. manual browser verification with the Phase 2 backend + frontend running together

Manual browser verification must confirm:

- page background renders as layered chessboard/grid rather than plain gray
- main interaction area is visually primary
- engine panel explicitly says score is white-perspective / post-move
- next-step suggestion card appears after a move analysis
- opening book / engine / coach / whitebox states each show coherent empty/loading/error/success styling

---

### Task 1: Rebuild the global app shell and background stage

**Files:**
- Modify: `phase2_research/frontend/src/App.tsx`
- Modify: `phase2_research/frontend/src/index.css`

- [ ] **Step 1: Replace the plain app shell in `App.tsx` with a stage layout**

Change the existing shell:

```tsx
function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <header className="bg-slate-900 text-white p-5 shadow-md flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">♞ ChessExplain <span className="text-sm font-normal text-gray-400 ml-2">国际象棋战术复盘平台</span></h1>
      </header>
      <main className="flex-grow p-6 flex justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-6xl">
          <ChessGame />
        </div>
      </main>
    </div>
  );
}
```

to a stage container like:

```tsx
function App() {
  return (
    <div className="app-stage min-h-screen font-sans text-slate-900">
      <div className="app-stage__backdrop" />

      <header className="relative z-10 border-b border-slate-900/10 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-end justify-between px-6 py-6 lg:px-10">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              ChessExplain Phase 2
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              ♞ 国际象棋分析工作台
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              结合开局库、Stockfish、DeepSeek 与白盒搜索实验的可视化分析界面。
            </p>
          </div>

          <div className="hidden rounded-full border border-slate-300/80 bg-white/80 px-4 py-2 text-xs font-medium text-slate-600 shadow-sm lg:block">
            Swiss Grid × Chess Analysis × Whitebox Lab
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
        <section className="analysis-stage-panel w-full rounded-[28px] border border-white/70 px-4 py-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:px-6 lg:py-6">
          <ChessGame />
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Add the layered global background in `index.css`**

Append these styles below the existing `body` rule:

```css
:root {
  color-scheme: light;
  background-color: #f8f8f6;
}

body {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(96, 165, 250, 0.14), transparent 28%),
    radial-gradient(circle at left center, rgba(148, 163, 184, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(248, 250, 252, 0.94));
  color: #0f172a;
}

#root {
  min-height: 100vh;
}

.app-stage {
  position: relative;
  isolation: isolate;
}

.app-stage__backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px),
    linear-gradient(45deg, rgba(255, 255, 255, 0.62) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.62) 75%),
    linear-gradient(45deg, rgba(243, 244, 246, 0.88) 25%, transparent 25%, transparent 75%, rgba(243, 244, 246, 0.88) 75%);
  background-size: 32px 32px, 32px 32px, 96px 96px, 96px 96px;
  background-position: 0 0, 0 0, 0 0, 48px 48px;
  opacity: 0.72;
}

.analysis-stage-panel {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(18px);
}

.analysis-panel {
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.analysis-panel--dark {
  border: 1px solid rgba(51, 65, 85, 0.75);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96));
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.24);
}
```

- [ ] **Step 3: Run type-check after shell/background changes**

Run:

```bash
npm run type-check
```

Expected: exit code `0` with no TypeScript errors.

- [ ] **Step 4: Commit the shell/background slice**

Run:

```bash
git add phase2_research/frontend/src/App.tsx phase2_research/frontend/src/index.css
git commit -m "feat: add phase2 analysis stage shell"
```

---

### Task 2: Rebalance ChessGame hierarchy and unify state presentation

**Files:**
- Modify: `phase2_research/frontend/src/components/Chessboard/ChessGame.tsx`

- [ ] **Step 1: Add local helper functions for score semantics and status copy**

Near the existing interfaces at the top of `ChessGame.tsx`, add lightweight helpers:

```tsx
function formatEvalText(score: number, isMate: boolean, mateScore: number | null) {
  if (isMate) {
    return {
      badge: mateScore && mateScore > 0 ? '白方胜势' : '黑方胜势',
      value: `M${mateScore}`,
      tone: mateScore && mateScore > 0 ? 'emerald' : 'rose',
    };
  }

  if (score >= 0.75) return { badge: '白方明显更好', value: `+${score.toFixed(2)}`, tone: 'emerald' };
  if (score >= 0.15) return { badge: '白方略优', value: `+${score.toFixed(2)}`, tone: 'emerald' };
  if (score <= -0.75) return { badge: '黑方明显更好', value: score.toFixed(2), tone: 'rose' };
  if (score <= -0.15) return { badge: '黑方略优', value: score.toFixed(2), tone: 'rose' };
  return { badge: '局面接近均势', value: score.toFixed(2), tone: 'slate' };
}

function getBookStatusCopy(bookMessage: string | null, bookStatus: string, hasMoves: boolean) {
  if (hasMoves) return null;
  if (bookMessage) {
    return {
      title: '开局库当前不可用',
      description: bookMessage,
      meta: `状态码：${bookStatus}`,
      tone: 'warning',
    };
  }
  return {
    title: '当前局面暂无谱招',
    description: '可能已脱离理论开局阶段，但仍可继续使用引擎分析与教练解读。',
    meta: 'Opening Book / Empty',
    tone: 'neutral',
  };
}
```

- [ ] **Step 2: Rebuild the top-level layout classes so the main interaction zone is visually primary**

Replace the root layout block starting at:

```tsx
<div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
  <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full">
```

with a hierarchy-oriented wrapper like:

```tsx
<div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
  <section className="grid gap-6 lg:grid-cols-[0.92fr_1.18fr_1.1fr] lg:items-stretch">
```

Then update the three primary columns to use the shared panel language:

```tsx
<div className="analysis-panel flex h-[540px] flex-col p-5 lg:h-[780px]">
```

```tsx
<div className="flex flex-col items-center">
```

```tsx
<div className="analysis-panel border-amber-100/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.92),rgba(255,247,237,0.88))] p-6 flex flex-col h-[540px] lg:h-[780px]">
```

- [ ] **Step 3: Replace the opening-book empty/unavailable branch with unified product-style state blocks**

Before the `return`, derive the opening-book state:

```tsx
const bookState = getBookStatusCopy(bookMessage, bookStatus, bookMoves.length > 0);
```

Then replace:

```tsx
{bookMoves.length > 0 ? (
  ...
) : bookMessage ? (
  ...
) : (
  ...
)}
```

with:

```tsx
{bookMoves.length > 0 ? (
  <div className="space-y-2">
    {bookMoves.map((move, idx) => (
      <div key={idx} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 transition hover:border-slate-300 hover:bg-white">
        <div>
          <div className="text-lg font-semibold text-slate-800">{move.san}</div>
          <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Lichess Masters</div>
        </div>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
          {move.weight.toLocaleString()} 局
        </span>
      </div>
    ))}
  </div>
) : bookState ? (
  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-5 text-center">
    <div className="mb-3 text-4xl">{bookState.tone === 'warning' ? '⚠️' : '📖'}</div>
    <h4 className="text-base font-semibold text-slate-800">{bookState.title}</h4>
    <p className="mt-2 text-sm leading-6 text-slate-600">{bookState.description}</p>
    <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-400">{bookState.meta}</p>
  </div>
) : null}
```

- [ ] **Step 4: Rewrite the engine panel heading and loading/idle copy to make score semantics explicit**

Change the engine-card header from:

```tsx
<h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
  Stockfish 引擎评估 (一二三选)
</h3>
```

to:

```tsx
<div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-700/80 pb-4">
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300/80">Engine Evaluation</p>
    <h3 className="mt-1 text-lg font-semibold text-white">局面评分（白方视角）</h3>
    <p className="mt-2 text-sm leading-6 text-slate-300">
      评分基于走后局面。正分表示白优，负分表示黑优。
    </p>
  </div>
  <div className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-300">
    Multi-PV / Top 3
  </div>
</div>
```

And update the loading/idle copy to:

```tsx
<div className="rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-8 text-center text-slate-300">
  引擎正在评估走后局面的前三条候选线…
</div>
```

```tsx
<div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 px-4 py-8 text-center text-slate-400">
  {autoAnalyze ? '走棋后将自动生成局面评分、候选线与下一步建议。' : '点击“深度解析招法”以生成局面评分与行动建议。'}
</div>
```

- [ ] **Step 5: Run type-check after the ChessGame hierarchy/state changes**

Run:

```bash
npm run type-check
```

Expected: exit code `0` with no TypeScript errors.

- [ ] **Step 6: Commit the hierarchy/state slice**

Run:

```bash
git add phase2_research/frontend/src/components/Chessboard/ChessGame.tsx
git commit -m "feat: clarify phase2 analysis hierarchy"
```

---

### Task 3: Add the next-step suggestion card and score interpretation labels

**Files:**
- Modify: `phase2_research/frontend/src/components/Chessboard/ChessGame.tsx`

- [ ] **Step 1: Derive a next-step summary from the best PV line**

Inside `ChessGame.tsx`, add a derived object before the `return`:

```tsx
const primaryLine = analysis?.engine_eval.lines[0] ?? null;
const primaryEval = primaryLine
  ? formatEvalText(primaryLine.score, primaryLine.is_mate, primaryLine.mate_score)
  : null;
const suggestedContinuation = primaryLine?.pv[1] ?? '继续完成轻子发展';
const playerMoveLabel = lastMoveInfo?.uciMove ?? '尚未走子';
```

- [ ] **Step 2: Insert a new next-step suggestion card between engine data and coach panel**

Below the engine card block and before the right-column coach panel, add:

```tsx
{analysis && primaryLine && primaryEval && (
  <div className="analysis-panel border-sky-100/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(241,245,249,0.9))] p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600">Next Step</p>
        <h3 className="mt-1 text-xl font-semibold text-slate-900">下一步建议</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          基于当前走后局面和引擎主线，先看结论，再决定是否继续阅读长文解释。
        </p>
      </div>

      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        primaryEval.tone === 'emerald'
          ? 'bg-emerald-100 text-emerald-700'
          : primaryEval.tone === 'rose'
          ? 'bg-rose-100 text-rose-700'
          : 'bg-slate-200 text-slate-700'
      }`}>
        {primaryEval.badge}
      </span>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">你的走法</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">{playerMoveLabel}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">局面判断</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">{primaryEval.value}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">推荐续走</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">{suggestedContinuation}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">一句话建议</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          先按照主线完成发展与中心控制，再决定是否切入更激进的战术计划。
        </p>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: Add semantic labels to each PV line in the engine card**

Inside the `analysis.engine_eval.lines.map(...)` block, derive and render the semantic badge:

```tsx
{analysis.engine_eval.lines.map((line, index) => {
  const evalView = formatEvalText(line.score, line.is_mate, line.mate_score);

  return (
    <div key={index} className="rounded-2xl border border-slate-700/70 bg-slate-800/65 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-sky-950/80 px-2 py-1 text-xs font-bold text-sky-300">#{index + 1}</span>
          <div>
            <div className="text-lg font-semibold text-white">{line.best_move}</div>
            <div className="mt-1 text-xs text-slate-400">{evalView.badge}</div>
          </div>
        </div>
        <div className="text-right text-lg font-bold text-white">{evalView.value}</div>
      </div>
      <div className="mt-3 truncate text-xs font-mono text-slate-400" title={line.pv.join(' ')}>
        {line.pv.join(' ')}
      </div>
    </div>
  );
})}
```

- [ ] **Step 4: Run type-check and build after the semantic/suggestion changes**

Run:

```bash
npm run type-check
npm run build
```

Expected:

- `type-check` exits `0`
- `build` exits `0`
- a large-chunk warning is acceptable if the build still succeeds

- [ ] **Step 5: Commit the score/suggestion slice**

Run:

```bash
git add phase2_research/frontend/src/components/Chessboard/ChessGame.tsx
git commit -m "feat: add next-step guidance for phase2 analysis"
```

---

### Task 4: Downgrade whitebox to a secondary laboratory surface

**Files:**
- Modify: `phase2_research/frontend/src/components/Chessboard/ChessGame.tsx`
- Modify: `phase2_research/frontend/src/components/Whitebox/WhiteboxResultPanel.tsx`

- [ ] **Step 1: Rewrite the whitebox section wrapper in `ChessGame.tsx`**

Replace the current wrapper:

```tsx
<div className="w-full bg-white rounded-xl shadow-md border border-slate-200 p-5 mb-10">
  <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-3">
    🔍 白盒引擎评测与搜索树分析
  </h2>
```

with:

```tsx
<section className="analysis-panel border-slate-200/90 bg-white/80 px-5 py-5 mb-10">
  <div className="mb-5 border-b border-slate-200 pb-4">
    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Secondary Lab</p>
    <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
      🔍 白盒搜索实验室
    </h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">
      对比 Alpha-Beta 与 MCTS 的搜索行为，作为主分析闭环之后的辅助实验模块。
    </p>
  </div>
```

- [ ] **Step 2: Restyle `WhiteboxResultPanel.tsx` as a lower-priority lab report card**

Replace the current top block:

```tsx
<div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-4">
  <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">分析结果</h2>
```

with:

```tsx
<div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50/80 p-5">
  <div className="mb-4 flex flex-col gap-2 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Whitebox Result</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-900">搜索结果摘要</h2>
    </div>
    <div className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600">
      实验结果仅供搜索行为观察
    </div>
  </div>
```

Update the stats cards to be more subdued:

```tsx
<div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
```

and use:

```tsx
className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
```

for each stat box.

- [ ] **Step 3: Add an idle/success divider above the tree visualization**

Replace the tree wrapper with:

```tsx
<div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 overflow-hidden">
  <div className="mb-3 flex items-center justify-between px-2">
    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
      搜索树展开可视化
    </h3>
    <span className="text-xs text-slate-400">Tree Visualization</span>
  </div>
  <TreeVisualizer data={result.tree} />
</div>
```

- [ ] **Step 4: Run the final frontend verification suite**

Run:

```bash
npm run type-check
npm run build
```

Then run the Phase 2 app for browser verification:

```bash
npm run dev -- --host 127.0.0.1 --port 4173
```

With the backend already running on `127.0.0.1:8000`, manually verify:

1. page loads with the layered chessboard/grid background
2. left opening-book card looks secondary relative to the central board/engine chain
3. engine card title reads `局面评分（白方视角）`
4. after `e4` + `深度解析招法`, a next-step suggestion card appears
5. whitebox section visually reads as a secondary lab, not a peer to the main analysis chain

- [ ] **Step 5: Commit the whitebox/P0 finish slice**

Run:

```bash
git add phase2_research/frontend/src/components/Chessboard/ChessGame.tsx phase2_research/frontend/src/components/Whitebox/WhiteboxResultPanel.tsx
git commit -m "feat: polish phase2 whitebox presentation"
```

---

## Self-Review Checklist

### Spec coverage

- Background layer redesign → Task 1
- Main-vs-secondary hierarchy → Task 2 + Task 4
- Unified status UX → Task 2
- Explicit score semantics → Task 2 + Task 3
- Next-step suggestion card → Task 3
- Whitebox reprioritization → Task 4

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Each task contains exact file paths and concrete code snippets.
- Verification commands are explicit and executable.

### Type consistency

- The plan reuses existing file names and exported component names: `ChessGame`, `WhiteboxResultPanel`, `TreeVisualizer`.
- New helper names introduced in the plan are consistent across tasks: `formatEvalText`, `getBookStatusCopy`, `primaryLine`, `primaryEval`, `suggestedContinuation`.
