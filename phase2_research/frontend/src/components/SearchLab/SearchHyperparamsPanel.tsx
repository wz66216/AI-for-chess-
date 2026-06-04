import type { SearchConfig } from "../../types/whitebox";

type Props = {
  config: SearchConfig;
  onChange: (patch: Partial<SearchConfig>) => void;
};

const ALPHABETA_MIN_DEPTH = 1;
const ALPHABETA_MAX_DEPTH = 8;
const MCTS_MIN_ITERATIONS = 10;
const MCTS_MAX_ITERATIONS = 50000;
const MCTS_MIN_EXPLORATION = 0.1;
const MCTS_MAX_EXPLORATION = 5.0;

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
        <div className="text-sm font-semibold text-slate-500">2. 配置搜索</div>
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
          <div>Alpha-Beta 搜索</div>
          <div className="mt-1 text-sm font-normal text-slate-600">
            适合观察剪枝与固定深度搜索。
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
            适合观察模拟次数带来的探索差异。
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
              min={ALPHABETA_MIN_DEPTH}
              max={ALPHABETA_MAX_DEPTH}
              value={config.depth}
              onChange={(event) => {
                const nextValue = clampNumber(
                  event.target.value,
                  ALPHABETA_MIN_DEPTH,
                  ALPHABETA_MAX_DEPTH,
                );
                if (nextValue !== null) onChange({ depth: nextValue });
              }}
            />
          </label>
          <label className="block">
            <input
              aria-label="启用着法排序"
              type="checkbox"
              checked={config.useMoveOrdering}
              onChange={(event) =>
                onChange({ useMoveOrdering: event.target.checked })
              }
            />
            <span>启用着法排序</span>
          </label>
          <p className="text-sm text-slate-600">
            深度越高越慢；Web 交互请求限制在 8 层以内。
          </p>
          {config.depth >= 7 ? (
            <p className="text-sm text-amber-700">
              较深搜索可能耗时明显变长，适合局面简化后测试。
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
              min={MCTS_MIN_ITERATIONS}
              max={MCTS_MAX_ITERATIONS}
              value={config.mctsIterations}
              onChange={(event) => {
                const nextValue = clampNumber(
                  event.target.value,
                  MCTS_MIN_ITERATIONS,
                  MCTS_MAX_ITERATIONS,
                );
                if (nextValue !== null) onChange({ mctsIterations: nextValue });
              }}
            />
          </label>
          <label className="block">
            <span>探索系数</span>
            <input
              aria-label="探索系数"
              type="number"
              min={MCTS_MIN_EXPLORATION}
              max={MCTS_MAX_EXPLORATION}
              step={0.1}
              value={config.mctsExplorationConstant}
              onChange={(event) => {
                const nextValue = clampNumber(
                  event.target.value,
                  MCTS_MIN_EXPLORATION,
                  MCTS_MAX_EXPLORATION,
                );
                if (nextValue !== null) {
                  onChange({ mctsExplorationConstant: nextValue });
                }
              }}
            />
            <p className="text-sm text-slate-600">
              次数越多，搜索越充分；Web 交互请求最多 50000 次。
            </p>
          </label>
          <p className="text-sm text-slate-600">
            探索系数越高，越鼓励访问尚未充分探索的分支。
          </p>
        </div>
      )}
    </div>
  );
}
