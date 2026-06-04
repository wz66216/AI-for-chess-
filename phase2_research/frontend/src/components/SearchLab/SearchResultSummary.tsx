import type { WhiteboxResult } from "../../types/whitebox";

type Props = { result: WhiteboxResult | null; loading?: boolean };

function formatValue(value: unknown) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function formatScore(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function StatCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">
        {formatValue(value)}
      </div>
    </div>
  );
}

function formatEvaluatorName(value: unknown) {
  if (typeof value !== "string") return value;
  const mapping: Record<string, string> = {
    material: "子力评估",
    pst: "位置表评估",
    heuristic: "综合启发式",
  };
  return mapping[value] ?? value;
}

export default function SearchResultSummary({ result, loading }: Props) {
  if (loading) return null;
  if (!result)
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        开始搜索后，这里会显示关键指标。
      </section>
    );

  const instrumentation = result.instrumentation ?? {};
  const nodes = instrumentation.nodes_visited ?? result.nodes_evaluated;
  const leafs =
    instrumentation.leaf_evaluations ?? instrumentation.leaf_nodes_evaluated;
  const pruned = instrumentation.cutoffs ?? instrumentation.pruned_nodes;
  const generatedChildren = instrumentation.generated_children;
  const branchingFactor = instrumentation.branching_factor;
  const evaluator = formatEvaluatorName(
    instrumentation.evaluator_name ?? instrumentation.evaluator,
  );

  const hasCandidates = result.candidates && result.candidates.length > 0;
  const maxEval = hasCandidates
    ? Math.max(...result.candidates!.map((c) => Math.abs(c.evaluation)), 0.01)
    : 0;

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">搜索结果</h3>
        <p className="text-sm text-slate-600">
          评分始终以白方视角显示：正数代表白方更好，负数代表黑方更好；候选招按当前行棋方的选择偏好排序。
        </p>
      </div>

      {hasCandidates ? (
        <div className="space-y-1.5" aria-label="候选招列表">
          {result.candidates!.map((c, i) => {
            const isBest = c.move === result.best_move;
            const barPct = Math.round((Math.abs(c.evaluation) / maxEval) * 100);
            return (
              <div
                key={`${c.move}-${i}`}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                  isBest
                    ? "border-blue-300 bg-blue-50 font-semibold"
                    : "border-slate-200"
                }`}
              >
                <span className="w-6 text-xs text-slate-400">#{i + 1}</span>
                <span className="w-16 font-mono">{c.move}</span>
                <span
                  aria-label={`白方评分 ${formatScore(c.evaluation)}`}
                  className={`w-16 text-right ${
                    c.evaluation > 0
                      ? "text-emerald-600"
                      : c.evaluation < 0
                        ? "text-rose-600"
                        : "text-slate-500"
                  }`}
                >
                  {formatScore(c.evaluation)}
                </span>
                <div className="h-2 flex-1 rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      isBest ? "bg-blue-500" : "bg-slate-300"
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="最佳着法" value={result.best_move} />
          <StatCard label="白方评分" value={formatScore(result.evaluation)} />
          <StatCard label="访问节点" value={nodes} />
          <StatCard label="搜索耗时 (ms)" value={result.time_ms} />
          <StatCard label="每秒节点数" value={result.nps} />
        </div>
      )}

      {hasCandidates ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="白方评分" value={formatScore(result.evaluation)} />
          <StatCard label="访问节点" value={nodes} />
          <StatCard label="搜索耗时 (ms)" value={result.time_ms} />
          <StatCard label="每秒节点数" value={result.nps} />
          <StatCard label="评估器" value={evaluator} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="叶子评估" value={leafs} />
          <StatCard label="剪枝 / 截断" value={pruned} />
          <StatCard label="生成子节点" value={generatedChildren} />
          <StatCard label="分支因子" value={branchingFactor} />
          <StatCard label="评估器" value={evaluator} />
        </div>
      )}
    </section>
  );
}
