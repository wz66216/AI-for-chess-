import type { SearchConfig } from "../../types/whitebox";

type Props = {
  config: SearchConfig;
  onChange: (patch: Partial<SearchConfig>) => void;
};

export default function SearchHyperparamsPanel({ config, onChange }: Props) {
  const isAlphaBeta = config.engine === "alphabeta";
  const modeButtonClass = (active: boolean) =>
    active
      ? "rounded-xl border border-blue-600 bg-blue-50 px-4 py-3 text-left font-semibold shadow-sm"
      : "rounded-xl border border-slate-200 bg-white px-4 py-3 text-left";
  const clampNumber = (rawValue: string, min: number, max: number) => {
    if (rawValue.trim() === "") return null;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(max, Math.max(min, parsed));
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-slate-500">① 配置搜索</div>
        <div className="text-lg font-semibold text-slate-900">搜索方式</div>
        <p className="text-sm text-slate-600">
          选择搜索算法，并调整本次实验的关键参数。
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={config.engine === "alphabeta"}
          onClick={() => onChange({ engine: "alphabeta" })}
          className={modeButtonClass(config.engine === "alphabeta")}
        >
          <div>α-β 搜索</div>
          <div className="mt-1 text-sm font-normal text-slate-600">
            适合观察剪枝与深度搜索。
          </div>
        </button>
        <button
          type="button"
          aria-pressed={config.engine === "mcts"}
          onClick={() => onChange({ engine: "mcts" })}
          className={modeButtonClass(config.engine === "mcts")}
        >
          <div>MCTS 蒙特卡洛树搜索</div>
          <div className="mt-1 text-sm font-normal text-slate-600">
            适合观察模拟次数带来的探索。
          </div>
        </button>
      </div>

      {isAlphaBeta ? (
        <div className="space-y-3">
          <label className="block">
            <span>搜索深度</span>
            <input
              aria-label="搜索深度"
              type="number"
              min={1}
              max={18}
              value={config.depth}
              onChange={(e) => {
                const nextValue = clampNumber(e.target.value, 1, 18);
                if (nextValue !== null) onChange({ depth: nextValue });
              }}
            />
          </label>
          <label className="block">
            <input
              aria-label="启用着法排序"
              type="checkbox"
              checked={config.useMoveOrdering}
              onChange={(e) => onChange({ useMoveOrdering: e.target.checked })}
            />
            <span>启用着法排序</span>
          </label>
          <p className="text-sm text-slate-600">越深越慢，但结果通常更稳定。</p>
          {config.depth >= 6 ? (
            <p className="text-sm text-amber-700">
              提示：较深搜索可能需要更长时间。
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span>模拟次数</span>
            <input
              aria-label="模拟次数"
              type="number"
              min={10}
              max={50000}
              value={config.mctsIterations}
              onChange={(e) => {
                const nextValue = clampNumber(e.target.value, 10, 50000);
                if (nextValue !== null) onChange({ mctsIterations: nextValue });
              }}
            />
          </label>
          <label className="block">
            <span>探索系数</span>
            <input
              aria-label="探索系数"
              type="number"
              min={0.1}
              max={10}
              step={0.1}
              value={config.mctsExplorationConstant}
              onChange={(e) => {
                const nextValue = clampNumber(e.target.value, 0.1, 10);
                if (nextValue !== null)
                  onChange({ mctsExplorationConstant: nextValue });
              }}
            />
            <p className="text-sm text-slate-600">次数越多，搜索越充分。</p>
          </label>
          <p className="text-sm text-slate-600">
            数值越高，越鼓励探索未充分访问的分支。
          </p>
        </div>
      )}
    </div>
  );
}
