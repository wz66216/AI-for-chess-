import { useState } from "react";

export interface WhiteboxParams {
  engine: "alphabeta" | "mcts";
  depth: number;
  use_move_ordering: boolean;
  mcts_iterations: number;
  mcts_exploration_constant: number;
}

interface WhiteboxControlPanelProps {
  onAnalyze: (params: WhiteboxParams) => void;
  isLoading: boolean;
}

const MAX_ALPHABETA_DEPTH = 8;
const MAX_MCTS_ITERATIONS = 50000;
const MAX_MCTS_EXPLORATION = 5.0;

export function WhiteboxControlPanel({
  onAnalyze,
  isLoading,
}: WhiteboxControlPanelProps) {
  const [engine, setEngine] = useState<"alphabeta" | "mcts">("alphabeta");
  const [depth, setDepth] = useState(3);
  const [useMoveOrdering, setUseMoveOrdering] = useState(true);
  const [iterations, setIterations] = useState(100);
  const [cValue, setCValue] = useState(1.4);

  const handleAnalyze = () => {
    onAnalyze({
      engine,
      depth,
      use_move_ordering: useMoveOrdering,
      mcts_iterations: iterations,
      mcts_exploration_constant: cValue,
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 border-b pb-2 text-lg font-bold text-gray-800">
        白盒引擎参数控制
      </h2>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          运行算法
        </label>
        <div className="flex space-x-2">
          <button
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              engine === "alphabeta"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setEngine("alphabeta")}
            type="button"
          >
            Alpha-Beta
          </button>
          <button
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              engine === "mcts"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setEngine("mcts")}
            type="button"
          >
            MCTS
          </button>
        </div>
      </div>

      <div className="mb-4 space-y-4 rounded-md bg-gray-50 p-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
          超参数
        </h3>

        {engine === "alphabeta" ? (
          <>
            <div>
              <label className="mb-1 flex justify-between text-sm text-gray-700">
                <span>搜索深度</span>
                <span className="rounded border bg-white px-1 font-mono">
                  {depth}
                </span>
              </label>
              <input
                aria-label="搜索深度"
                className="w-full"
                max={MAX_ALPHABETA_DEPTH}
                min="1"
                onChange={(event) => setDepth(Number(event.target.value))}
                type="range"
                value={depth}
              />
            </div>
            <div className="mt-3 flex items-center">
              <input
                checked={useMoveOrdering}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                id="moveOrdering"
                onChange={(event) => setUseMoveOrdering(event.target.checked)}
                type="checkbox"
              />
              <label
                className="ml-2 block text-sm text-gray-700"
                htmlFor="moveOrdering"
              >
                启用着法排序 (MVV-LVA)
              </label>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1 flex justify-between text-sm text-gray-700">
                <span>模拟次数</span>
                <span className="rounded border bg-white px-1 font-mono">
                  {iterations}
                </span>
              </label>
              <input
                aria-label="模拟次数"
                className="w-full"
                max={MAX_MCTS_ITERATIONS}
                min="10"
                onChange={(event) => setIterations(Number(event.target.value))}
                step="10"
                type="range"
                value={iterations}
              />
            </div>
            <div>
              <label className="mb-1 mt-3 flex justify-between text-sm text-gray-700">
                <span>探索系数</span>
                <span className="rounded border bg-white px-1 font-mono">
                  {cValue.toFixed(2)}
                </span>
              </label>
              <input
                aria-label="探索系数"
                className="w-full"
                max={MAX_MCTS_EXPLORATION}
                min="0.1"
                onChange={(event) => setCValue(Number(event.target.value))}
                step="0.1"
                type="range"
                value={cValue}
              />
            </div>
          </>
        )}
      </div>

      <button
        className={`w-full rounded-lg py-3 text-lg font-bold text-white shadow-sm transition-colors ${
          isLoading
            ? "cursor-not-allowed bg-gray-400"
            : engine === "alphabeta"
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-green-600 hover:bg-green-700"
        }`}
        disabled={isLoading}
        onClick={handleAnalyze}
        type="button"
      >
        {isLoading
          ? "正在计算搜索树..."
          : `运行 ${engine === "alphabeta" ? "Alpha-Beta" : "MCTS"} 引擎分析`}
      </button>
    </div>
  );
}
