import type { SearchConfig, WhiteboxResult } from "../../types/whitebox";

export interface SearchRunRecord {
  id: string;
  fen: string;
  config: SearchConfig;
  result: WhiteboxResult;
  createdAt: string;
}

type Props = {
  runs: SearchRunRecord[];
  onRestore: (run: SearchRunRecord) => void;
  onClear: () => void;
};

export default function SearchRunHistory({ runs, onRestore, onClear }: Props) {
  const engineLabel = (engine: SearchConfig["engine"]) =>
    engine === "alphabeta" ? "α-β 搜索" : "MCTS 蒙特卡洛树搜索";
  const evaluatorLabel = (evaluator: SearchConfig["evaluator"]) =>
    evaluator === "material"
      ? "子力评估"
      : evaluator === "pst"
        ? "位置表评估"
        : "综合启发式";

  if (runs.length === 0)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        暂无运行记录。完成一次搜索后会自动保存在此处。
      </div>
    );

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">运行历史</h3>
        <p className="text-sm text-slate-600">点击记录可恢复对应配置和结果。</p>
        <button type="button" onClick={onClear}>
          清空
        </button>
      </div>
      <div className="space-y-2">
        {runs.map((run) => (
          <button
            key={run.id}
            type="button"
            onClick={() => onRestore(run)}
            className="block w-full rounded-lg border border-slate-200 p-3 text-left"
          >
            <div className="font-medium">
              {engineLabel(run.config.engine)} /{" "}
              {evaluatorLabel(run.config.evaluator)}
            </div>
            <div className="text-sm text-slate-600">
              最佳着法：{run.result.best_move ?? "—"} · 访问节点：
              {run.result.nodes_evaluated} ·{" "}
              {new Date(run.createdAt).toLocaleString()}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
