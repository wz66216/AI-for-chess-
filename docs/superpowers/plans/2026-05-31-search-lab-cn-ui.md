# Search Lab CN UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize the Phase 2 `/search-lab` interface into Chinese and improve its visual hierarchy without changing search behavior, API contracts, or engine defaults.

**Architecture:** Keep the existing Search Lab component split and state ownership in `SearchWorkbench`. Apply copy and Tailwind layout changes inside the current components, then update tests to assert Chinese user-visible text and unchanged behavior.

**Tech Stack:** React, TypeScript, Tailwind CSS, chess.js, Vitest, Testing Library, Vite.

---

## Approved Spec

Read before implementing:

- `docs/superpowers/specs/2026-05-31-search-lab-cn-ui-design.md`

## File Structure

Modify these files only unless a test failure reveals a directly related Search Lab issue:

- `phase2_research/frontend/src/App.tsx` — localize the navigation label for the Search Lab route.
- `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx` — page shell, section layout, run button copy, validation and request error copy.
- `phase2_research/frontend/src/components/SearchLab/PositionInputPanel.tsx` — FEN input card copy, description, loading copy, textarea styling.
- `phase2_research/frontend/src/components/SearchLab/SearchHyperparamsPanel.tsx` — algorithm buttons, Alpha-Beta/MCTS labels, helper copy, selected-state styling.
- `phase2_research/frontend/src/components/SearchLab/EvaluatorSelector.tsx` — evaluator titles/descriptions and selected-state card styling.
- `phase2_research/frontend/src/components/SearchLab/SearchResultSummary.tsx` — Chinese metric cards, loading/empty states, instrumentation labels.
- `phase2_research/frontend/src/components/SearchLab/SearchTreeExplorer.tsx` — Chinese search-tree title, empty state, pruned-node toggle and legend.
- `phase2_research/frontend/src/components/SearchLab/PositionInspector.tsx` — Chinese node detail labels and empty/fallback copy.
- `phase2_research/frontend/src/components/SearchLab/SearchRunHistory.tsx` — Chinese history title, empty state, clear button, record summaries.
- `phase2_research/frontend/src/components/SearchLab/*.test.tsx` — update assertions to Chinese accessible labels/copy while preserving behavior coverage.

Do not modify:

- `phase2_research/backend/**`
- `phase2_research/frontend/src/api/whitebox.ts`
- `phase2_research/frontend/src/types/whitebox.ts`
- Search engine defaults in `SearchWorkbench.tsx`

## Task 1: Localize top-level Search Lab shell and FEN input

**Files:**

- Modify: `phase2_research/frontend/src/App.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/PositionInputPanel.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.test.tsx`

- [ ] **Step 1: Update tests for Chinese shell and FEN validation**

In `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.test.tsx`, update the existing text/label/button expectations that refer to the page shell, FEN input, run button, invalid FEN message, loading copy, empty result copy, and position fallback copy.

Use these concrete replacements:

```tsx
// In the "runs a whitebox search and renders the result" test:
fireEvent.click(screen.getByRole('button', { name: /开始搜索/i }));
expect(await screen.findByText('最佳着法')).toBeInTheDocument();
expect(screen.getByText('最佳着法').parentElement).toHaveTextContent('e2e4');

// In the invalid FEN test:
fireEvent.change(screen.getByLabelText(/起始局面 FEN/i), { target: { value: 'invalid fen' } });
expect(screen.getByRole('alert')).toHaveTextContent(/FEN 格式无效/i);
expect(screen.getByRole('button', { name: /开始搜索/i })).toBeDisabled();
fireEvent.click(screen.getByRole('button', { name: /开始搜索/i }));

// In valid-run tests:
fireEvent.click(screen.getByRole('button', { name: /开始搜索/i }));

// In loading tests:
expect(screen.getByRole('button', { name: /正在搜索/i })).toBeDisabled();
expect(screen.getByText('正在搜索，请稍候…')).toBeInTheDocument();

// In FEN input assertions:
screen.getByLabelText(/起始局面 FEN/i)

// In result reset assertions:
expect(screen.getByText('开始搜索后，这里会显示关键指标。')).toBeInTheDocument();
expect(screen.getByText('未选择节点')).toBeInTheDocument();
expect(screen.getByText('选中节点 FEN：').parentElement).toHaveTextContent('当前节点没有可用元数据。');
```

Also change history/evaluator assertions in this file only where touched by top-level interactions:

```tsx
await screen.findByText('暂无运行记录。完成一次搜索后会自动保存在此处。');
fireEvent.click(screen.getByRole('button', { name: /^子力评估/i }));
expect(screen.getByText('选中节点 FEN：').parentElement).toHaveTextContent('treefen');
await screen.findByText('运行历史');
await screen.findAllByRole('button', { name: /α-β 搜索/i });
expect(screen.getAllByRole('button', { name: /α-β 搜索/i })).toHaveLength(2);
fireEvent.click(screen.getByRole('button', { name: /α-β 搜索.*子力评估/i }));
```

- [ ] **Step 2: Run the focused failing test**

Run from `phase2_research/frontend`:

```powershell
npm test -- SearchWorkbench.test.tsx
```

Expected: FAIL because the implementation still renders English labels like `Root FEN`, `Run Search`, and `Best move`.

- [ ] **Step 3: Localize nav, shell, run button, and validation copy**

In `phase2_research/frontend/src/App.tsx`, change the Search Lab nav label:

```tsx
<NavLink to="/search-lab" className={({ isActive }) => `px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>
  搜索实验室
</NavLink>
```

In `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx`, keep `DEFAULT_FEN`, `DEFAULT_CONFIG`, and request behavior unchanged. Replace validation and button copy, and expand the page shell:

```tsx
const INVALID_FEN_MESSAGE = 'FEN 格式无效，请检查棋盘、行棋方、易位权利和回合数。';
```

Use `INVALID_FEN_MESSAGE` in both the validation IIFE and the invalid-run branch:

```tsx
const fenValidationMessage = (() => {
  try {
    new Chess(fen);
    return '';
  } catch {
    return INVALID_FEN_MESSAGE;
  }
})();
```

```tsx
if (!isFenValid) {
  setError(INVALID_FEN_MESSAGE);
  return;
}
```

Replace the `return` JSX with a readable workbench layout:

```tsx
return (
  <div className="space-y-6">
    <header className="space-y-2 border-b border-slate-200 pb-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Search Lab</p>
      <h2 className="text-3xl font-bold tracking-tight text-slate-950">搜索实验室</h2>
      <p className="max-w-3xl text-sm leading-6 text-slate-600">探索不同搜索策略对局面评估的影响。输入一个合法 FEN，配置搜索方式，然后查看指标、搜索树与局面详情。</p>
    </header>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <section className="space-y-4">
        <PositionInputPanel
          fen={fen}
          onFenChange={(nextFen) => {
            setFen(nextFen);
            if (result || selectedNode) {
              setResult(null);
              setSelectedNode(null);
              setResultRootFen(null);
            }
          }}
          validationMessage={fenValidationMessage}
          disabled={loading}
        />
        <SearchHyperparamsPanel config={config} onChange={(patch) => setConfig((prev) => ({ ...prev, ...patch }))} />
        {config.engine === 'alphabeta' ? <EvaluatorSelector value={config.evaluator} onChange={(value) => setConfig((prev) => ({ ...prev, evaluator: value }))} /> : null}
        <button
          type="button"
          onClick={handleRun}
          disabled={loading || !isFenValid}
          className="w-full rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {loading ? '正在搜索…' : '开始搜索'}
        </button>
        {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      </section>

      <section className="space-y-4">
        <SearchResultSummary result={result} loading={loading} />
        <SearchTreeExplorer tree={result?.tree ?? null} onNodeSelect={setSelectedNode} />
        <PositionInspector rootFen={resultRootFen ?? fen} node={selectedNode} />
        <SearchRunHistory runs={runs} onRestore={restoreRun} onClear={() => setRuns([])} />
      </section>
    </div>
  </div>
);
```

In `phase2_research/frontend/src/components/SearchLab/PositionInputPanel.tsx`, replace the body with:

```tsx
return (
  <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div>
      <p className="text-sm font-semibold text-blue-600">① 输入局面</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-950">起始局面 FEN</h3>
      <p className="mt-1 text-sm text-slate-600">输入任意合法 FEN，默认使用标准初始局面。</p>
    </div>
    <label className="block space-y-2">
      <span className="sr-only">起始局面 FEN</span>
      <textarea
        aria-label="起始局面 FEN"
        value={fen}
        disabled={disabled}
        onChange={(e) => onFenChange(e.target.value)}
        className="min-h-28 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-sm text-slate-900 shadow-inner focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
    {validationMessage ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{validationMessage}</p> : null}
    {disabled ? <p className="text-sm text-slate-500">正在搜索，请稍候…</p> : null}
    <p className="text-xs leading-5 text-slate-500">根局面与搜索树中选中节点的局面会分开显示，便于对比搜索路径。</p>
  </section>
);
```

- [ ] **Step 4: Run the focused test and fix only direct shell/input issues**

Run from `phase2_research/frontend`:

```powershell
npm test -- SearchWorkbench.test.tsx
```

Expected: still FAIL on labels owned by later components such as result summary, history, and inspector. Do not implement those in this task.

- [ ] **Step 5: Commit Task 1 changes if committing is allowed**

Only commit if the user has explicitly asked for commits in this session. If allowed, run from the worktree root:

```powershell
git add phase2_research/frontend/src/App.tsx phase2_research/frontend/src/components/SearchLab/SearchWorkbench.tsx phase2_research/frontend/src/components/SearchLab/PositionInputPanel.tsx phase2_research/frontend/src/components/SearchLab/SearchWorkbench.test.tsx
git commit -m "feat: localize search lab shell"
```

If commits are not allowed, skip this step and leave the files unstaged.

## Task 2: Localize search configuration and evaluator cards

**Files:**

- Modify: `phase2_research/frontend/src/components/SearchLab/SearchHyperparamsPanel.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/EvaluatorSelector.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchHyperparamsPanel.test.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/EvaluatorSelector.test.tsx`

- [ ] **Step 1: Update configuration/evaluator tests first**

In `SearchHyperparamsPanel.test.tsx`, replace English label assertions with Chinese labels:

```tsx
expect(screen.getByLabelText(/搜索深度/i)).toBeInTheDocument();
expect(screen.getByLabelText(/启用着法排序/i)).toBeInTheDocument();
fireEvent.change(screen.getByLabelText(/搜索深度/i), { target: { value: '3' } });
expect(screen.getByLabelText(/模拟次数/i)).toBeInTheDocument();
expect(screen.getByLabelText(/探索系数/i)).toBeInTheDocument();
```

In `EvaluatorSelector.test.tsx`, replace English evaluator assertions:

```tsx
expect(screen.getByRole('button', { name: /子力评估/i })).toBeInTheDocument();
expect(screen.getByRole('button', { name: /位置表评估/i })).toBeInTheDocument();
expect(screen.getByRole('button', { name: /综合启发式/i })).toBeInTheDocument();
expect(screen.getByText(/只统计双方棋子的基础价值/i)).toBeInTheDocument();
await user.click(screen.getByRole('button', { name: /综合启发式/i }));
```

- [ ] **Step 2: Run focused tests to verify failure**

Run from `phase2_research/frontend`:

```powershell
npm test -- SearchHyperparamsPanel.test.tsx EvaluatorSelector.test.tsx
```

Expected: FAIL because controls still render English labels.

- [ ] **Step 3: Implement Chinese search parameter panel**

In `SearchHyperparamsPanel.tsx`, add a reusable class helper near `isAlphaBeta`:

```tsx
const modeButtonClass = (active: boolean) =>
  `rounded-xl border px-4 py-3 text-left text-sm transition ${active ? 'border-blue-600 bg-blue-50 font-semibold text-blue-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`;
```

Replace the returned JSX with:

```tsx
return (
  <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div>
      <p className="text-sm font-semibold text-blue-600">② 配置搜索</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-950">搜索方式</h3>
      <p className="mt-1 text-sm text-slate-600">选择搜索算法，并调整本次实验的关键参数。</p>
    </div>

    <div className="grid gap-2 sm:grid-cols-2">
      <button type="button" aria-pressed={config.engine === 'alphabeta'} onClick={() => onChange({ engine: 'alphabeta' })} className={modeButtonClass(config.engine === 'alphabeta')}>
        <span className="block">α-β 搜索</span>
        <span className="mt-1 block text-xs font-normal text-slate-500">适合观察剪枝与深度搜索。</span>
      </button>
      <button type="button" aria-pressed={config.engine === 'mcts'} onClick={() => onChange({ engine: 'mcts' })} className={modeButtonClass(config.engine === 'mcts')}>
        <span className="block">MCTS 蒙特卡洛树搜索</span>
        <span className="mt-1 block text-xs font-normal text-slate-500">适合观察模拟次数带来的探索。</span>
      </button>
    </div>

    {isAlphaBeta ? (
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-800">搜索深度</span>
          <input aria-label="搜索深度" type="number" min={1} max={5} value={config.depth} onChange={(e) => { const nextValue = clampNumber(e.target.value, 1, 5); if (nextValue !== null) onChange({ depth: nextValue }); }} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          <span className="text-xs text-slate-500">越深越慢，但结果通常更稳定。</span>
        </label>
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <input aria-label="启用着法排序" type="checkbox" checked={config.useMoveOrdering} onChange={(e) => onChange({ useMoveOrdering: e.target.checked })} className="mt-1" />
          <span><span className="font-medium text-slate-900">启用着法排序</span><span className="block text-xs text-slate-500">优先尝试更可能有效的候选着法。</span></span>
        </label>
        {config.depth >= 4 ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">提示：较深搜索可能需要更长时间。</p> : null}
      </div>
    ) : (
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-800">模拟次数</span>
          <input aria-label="模拟次数" type="number" min={10} max={2000} value={config.mctsIterations} onChange={(e) => { const nextValue = clampNumber(e.target.value, 10, 2000); if (nextValue !== null) onChange({ mctsIterations: nextValue }); }} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          <span className="text-xs text-slate-500">次数越多，搜索越充分。</span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-800">探索系数</span>
          <input aria-label="探索系数" type="number" min={0.1} max={3} step={0.1} value={config.mctsExplorationConstant} onChange={(e) => { const nextValue = clampNumber(e.target.value, 0.1, 3); if (nextValue !== null) onChange({ mctsExplorationConstant: nextValue }); }} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          <span className="text-xs text-slate-500">数值越高，越鼓励探索未充分访问的分支。</span>
        </label>
      </div>
    )}
  </section>
);
```

- [ ] **Step 4: Implement Chinese evaluator cards**

In `EvaluatorSelector.tsx`, replace `OPTIONS` with:

```tsx
const OPTIONS: Array<{ value: EvaluatorName; title: string; description: string }> = [
  { value: 'material', title: '子力评估', description: '只统计双方棋子的基础价值。' },
  { value: 'pst', title: '位置表评估', description: '在子力价值上加入棋子位置加成。' },
  { value: 'heuristic', title: '综合启发式', description: '综合考虑机动性、兵型与王安全。' },
];
```

Replace the returned wrapper with a section and stronger selected state:

```tsx
return (
  <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div>
      <p className="text-sm font-semibold text-blue-600">③ 选择评估器</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-950">局面评估方式</h3>
      <p className="mt-1 text-sm text-slate-600">评估器决定叶子节点如何打分。</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={clsx(
              'rounded-xl border p-4 text-left transition',
              selected ? 'border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <div className="font-semibold text-slate-900">{option.title}</div>
            <div className="mt-1 text-sm leading-5 text-slate-600">{option.description}</div>
          </button>
        );
      })}
    </div>
  </section>
);
```

- [ ] **Step 5: Run focused tests**

Run from `phase2_research/frontend`:

```powershell
npm test -- SearchHyperparamsPanel.test.tsx EvaluatorSelector.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2 changes if committing is allowed**

Only commit if explicitly allowed:

```powershell
git add phase2_research/frontend/src/components/SearchLab/SearchHyperparamsPanel.tsx phase2_research/frontend/src/components/SearchLab/EvaluatorSelector.tsx phase2_research/frontend/src/components/SearchLab/SearchHyperparamsPanel.test.tsx phase2_research/frontend/src/components/SearchLab/EvaluatorSelector.test.tsx
git commit -m "feat: localize search configuration controls"
```

## Task 3: Localize result summary, tree explorer, inspector, and history

**Files:**

- Modify: `phase2_research/frontend/src/components/SearchLab/SearchResultSummary.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchTreeExplorer.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/PositionInspector.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchRunHistory.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchResultSummary.test.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchTreeExplorer.test.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/PositionInspector.test.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchRunHistory.test.tsx`
- Modify: `phase2_research/frontend/src/components/SearchLab/SearchWorkbench.test.tsx`

- [ ] **Step 1: Update focused tests for Chinese result/detail/history labels**

In `SearchResultSummary.test.tsx`:

```tsx
expect(screen.getByText(/正在搜索/i)).toBeInTheDocument();
expect(screen.getByText('最佳着法')).toBeInTheDocument();
expect(screen.getByText('e2e4')).toBeInTheDocument();
expect(screen.getByText('剪枝 / 截断')).toBeInTheDocument();
expect(screen.getByText('material')).toBeInTheDocument();
```

In `SearchTreeExplorer.test.tsx`:

```tsx
fireEvent.click(screen.getByRole('checkbox', { name: /显示剪枝节点/i }));
```

In `PositionInspector.test.tsx`:

```tsx
expect(screen.getByText('选中节点：').parentElement).toHaveTextContent('Child (branch)');
expect(screen.getByText('根局面 FEN：').parentElement).toHaveTextContent('root fen');
expect(screen.getByText('选中节点 FEN：').parentElement).toHaveTextContent('selected fen');
expect(screen.getByText('着法路径：').parentElement).toHaveTextContent('e2e4 → e7e5');
expect(screen.getByText('选中节点 FEN：').parentElement).toHaveTextContent('当前节点没有可用元数据。');
expect(screen.getByText('着法路径：').parentElement).toHaveTextContent('当前节点没有可用元数据。');
```

In `SearchRunHistory.test.tsx`:

```tsx
expect(screen.getByText(/暂无运行记录。完成一次搜索后会自动保存在此处。/i)).toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: /清空/i }));
fireEvent.click(screen.getByRole('button', { name: /e2e4/i }));
```

In `SearchWorkbench.test.tsx`, finish replacing all remaining English labels from result/inspector/history:

```tsx
await screen.findByText('最佳着法');
expect(screen.getByText('最佳着法').parentElement).toHaveTextContent('d2d4');
expect(screen.getByText('开始搜索后，这里会显示关键指标。')).toBeInTheDocument();
expect(screen.getByText('未选择节点')).toBeInTheDocument();
expect(screen.getByText('选中节点 FEN：').parentElement).toHaveTextContent('当前节点没有可用元数据。');
```

- [ ] **Step 2: Run focused tests to verify failure**

Run from `phase2_research/frontend`:

```powershell
npm test -- SearchResultSummary.test.tsx SearchTreeExplorer.test.tsx PositionInspector.test.tsx SearchRunHistory.test.tsx SearchWorkbench.test.tsx
```

Expected: FAIL because implementation still renders English labels in these components.

- [ ] **Step 3: Implement Chinese result summary**

In `SearchResultSummary.tsx`, replace loading/empty copy and labels:

```tsx
export default function SearchResultSummary({ result, loading }: Props) {
  if (loading) return <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-800">正在搜索，请稍候…</section>;
  if (!result) return <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">开始搜索后，这里会显示关键指标。</section>;

  const instrumentation = result.instrumentation ?? {};
  const nodes = instrumentation.nodes_visited ?? result.nodes_evaluated;
  const leafs = instrumentation.leaf_evaluations ?? instrumentation.leaf_nodes_evaluated;
  const pruned = instrumentation.cutoffs ?? instrumentation.pruned_nodes;
  const generatedChildren = instrumentation.generated_children;
  const branchingFactor = instrumentation.branching_factor;
  const evaluator = instrumentation.evaluator_name ?? instrumentation.evaluator;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-950">搜索结果</h3>
        <p className="mt-1 text-sm text-slate-600">本次搜索返回的最佳着法与关键性能指标。</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="最佳着法" value={result.best_move} />
        <StatCard label="评分" value={result.evaluation} />
        <StatCard label="访问节点" value={nodes} />
        <StatCard label="搜索耗时 (ms)" value={result.time_ms} />
        <StatCard label="每秒节点数" value={result.nps} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="叶子评估" value={leafs} />
        <StatCard label="剪枝 / 截断" value={pruned} />
        <StatCard label="生成子节点" value={generatedChildren} />
        <StatCard label="分支因子" value={branchingFactor} />
        <StatCard label="评估器" value={evaluator} />
      </div>
    </section>
  );
}
```

Also update `StatCard` to keep the same labels but improve hierarchy:

```tsx
function StatCard({ label, value }: { label: string; value: unknown }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-sm text-slate-500">{label}</div><div className="mt-1 text-lg font-semibold text-slate-950">{formatValue(value)}</div></div>;
}
```

- [ ] **Step 4: Implement Chinese tree explorer**

In `SearchTreeExplorer.tsx`, replace empty and main JSX:

```tsx
if (!tree) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">开始搜索后，这里会显示搜索树。点击节点可查看对应局面。</section>;
}

return (
  <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="text-lg font-semibold text-slate-950">搜索树</h3>
        <p className="mt-1 text-sm text-slate-600">点击树节点可在局面检查器中查看对应 FEN 与着法路径。</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={showPrunedNodes} onChange={(e) => setShowPrunedNodes(e.target.checked)} />
        显示剪枝节点
      </label>
    </div>
    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
      <span className="rounded-full bg-slate-100 px-2 py-1">普通节点：已展开的候选着法</span>
      <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">最佳路径：评分更优的搜索分支</span>
      <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">剪枝节点：被 α-β 截断的分支</span>
    </div>
    <TreeVisualizer data={visibleTree} onNodeSelect={onNodeSelect} />
  </section>
);
```

- [ ] **Step 5: Implement Chinese position inspector**

In `PositionInspector.tsx`, replace fallback strings and JSX:

```tsx
const unavailable = '当前节点没有可用元数据。';
const movePathText = movePath === undefined ? (node ? unavailable : '根局面') : movePath.length === 0 ? '根局面' : movePath.join(' → ');
```

```tsx
return (
  <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div>
      <h3 className="text-lg font-semibold text-slate-950">局面检查器</h3>
      <p className="mt-1 text-sm text-slate-600">查看当前选中搜索树节点的局面信息。</p>
    </div>
    <div className="space-y-2 text-sm text-slate-700">
      <div><span className="font-medium text-slate-950">选中节点：</span> {node ? `${node.name} (${node.node_type})` : '未选择节点'}</div>
      <div><span className="font-medium text-slate-950">根局面 FEN：</span> <span className="font-mono text-xs">{rootFen}</span></div>
      <div><span className="font-medium text-slate-950">选中节点 FEN：</span> <span className="font-mono text-xs">{selectedFen ?? unavailable}</span></div>
      <div><span className="font-medium text-slate-950">着法路径：</span> {movePathText}</div>
    </div>
  </section>
);
```

- [ ] **Step 6: Implement Chinese run history**

In `SearchRunHistory.tsx`, add helpers above the component:

```tsx
function engineLabel(engine: SearchConfig['engine']) {
  return engine === 'alphabeta' ? 'α-β 搜索' : 'MCTS 蒙特卡洛树搜索';
}

function evaluatorLabel(evaluator: SearchConfig['evaluator']) {
  if (evaluator === 'material') return '子力评估';
  if (evaluator === 'pst') return '位置表评估';
  return '综合启发式';
}
```

Replace the component body with:

```tsx
if (runs.length === 0) return <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">暂无运行记录。完成一次搜索后会自动保存在此处。</section>;

return (
  <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold text-slate-950">运行历史</h3>
        <p className="mt-1 text-sm text-slate-600">点击记录可恢复对应配置和结果。</p>
      </div>
      <button type="button" onClick={onClear} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">清空</button>
    </div>
    <div className="space-y-2">
      {runs.map((run) => (
        <button key={run.id} type="button" onClick={() => onRestore(run)} className="block w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50">
          <div className="font-medium text-slate-950">{engineLabel(run.config.engine)} / {evaluatorLabel(run.config.evaluator)}</div>
          <div className="mt-1 text-sm text-slate-600">最佳着法：{run.result.best_move ?? '—'} · 访问节点：{run.result.nodes_evaluated} · {new Date(run.createdAt).toLocaleString()}</div>
        </button>
      ))}
    </div>
  </section>
);
```

- [ ] **Step 7: Run focused tests**

Run from `phase2_research/frontend`:

```powershell
npm test -- SearchResultSummary.test.tsx SearchTreeExplorer.test.tsx PositionInspector.test.tsx SearchRunHistory.test.tsx SearchWorkbench.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit Task 3 changes if committing is allowed**

Only commit if explicitly allowed:

```powershell
git add phase2_research/frontend/src/components/SearchLab/SearchResultSummary.tsx phase2_research/frontend/src/components/SearchLab/SearchTreeExplorer.tsx phase2_research/frontend/src/components/SearchLab/PositionInspector.tsx phase2_research/frontend/src/components/SearchLab/SearchRunHistory.tsx phase2_research/frontend/src/components/SearchLab/SearchResultSummary.test.tsx phase2_research/frontend/src/components/SearchLab/SearchTreeExplorer.test.tsx phase2_research/frontend/src/components/SearchLab/PositionInspector.test.tsx phase2_research/frontend/src/components/SearchLab/SearchRunHistory.test.tsx phase2_research/frontend/src/components/SearchLab/SearchWorkbench.test.tsx
git commit -m "feat: localize search lab results"
```

## Task 4: Full verification and browser smoke test

**Files:**

- No planned source edits. Only fix direct failures found by verification.

- [ ] **Step 1: Run all frontend unit tests**

Run from `phase2_research/frontend`:

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run type checking**

Run from `phase2_research/frontend`:

```powershell
npm run type-check
```

Expected: command exits successfully with no TypeScript errors.

- [ ] **Step 3: Run lint**

Run from `phase2_research/frontend`:

```powershell
npm run lint
```

Expected: command exits successfully with no lint errors.

- [ ] **Step 4: Run production build**

Run from `phase2_research/frontend`:

```powershell
npm run build
```

Expected: build succeeds. A Vite chunk-size warning is acceptable if it matches the existing known warning.

- [ ] **Step 5: Verify browser default and invalid-FEN states**

Use the existing frontend dev server if it is running at `http://127.0.0.1:5173/search-lab`. If it is not running, start it from `phase2_research/frontend`:

```powershell
npm run dev -- --host 127.0.0.1
```

Then open `http://127.0.0.1:5173/search-lab` and verify:

- Page title shows `搜索实验室`.
- FEN input label shows `起始局面 FEN`.
- Primary button shows `开始搜索`.
- Entering `bad fen` displays `FEN 格式无效，请检查棋盘、行棋方、易位权利和回合数。`.
- The `开始搜索` button is disabled for invalid FEN.

- [ ] **Step 6: Verify browser successful-search state**

With a valid FEN and backend running, click `开始搜索` and verify:

- Button changes to `正在搜索…` while loading.
- Results show Chinese metric labels including `最佳着法`, `访问节点`, and `评估器`.
- Search tree section shows `搜索树` and `显示剪枝节点`.
- Position inspector shows `局面检查器`, `根局面 FEN：`, and `选中节点 FEN：`.
- History shows `运行历史` and a record with Chinese algorithm/evaluator labels.

- [ ] **Step 7: Capture final git status**

Run from the worktree root:

```powershell
git status --short
```

Expected: only intended Search Lab frontend files, tests, and this plan/spec are changed or untracked. `phase2_research/backend/results/` must remain uncommitted.

- [ ] **Step 8: Commit verification changes if committing is allowed**

Only commit if explicitly allowed and only stage intended files:

```powershell
git add docs/superpowers/specs/2026-05-31-search-lab-cn-ui-design.md docs/superpowers/plans/2026-05-31-search-lab-cn-ui.md phase2_research/frontend/src/App.tsx phase2_research/frontend/src/components/SearchLab
git commit -m "feat: polish search lab chinese UI"
```

Do not stage `phase2_research/backend/results/`.

## Self-Review Notes

- Spec coverage: the plan covers Chinese copy, page hierarchy, component-level visual polish, unchanged data flow, unchanged API/algorithms/defaults, focused tests, full frontend verification, and browser smoke testing.
- Red-flag scan: no placeholder markers or unspecified implementation steps are intentionally left in this plan.
- Type consistency: labels use existing `SearchConfig`, `EvaluatorName`, `WhiteboxResult`, and `SearchTreeNode` types; no new exported types are introduced.
