import { useState } from "react";
import { API_BASE } from "../../api/config";

type PuzzleData = {
  id: string;
  fen: string;
  rating: number;
  themes: string[];
  solution: string[];
  players: { name: string; color: string; rating: number }[];
};

type Props = {
  onImportFen: (fen: string) => void;
};

type SolutionRow = {
  moveNumber: number;
  white?: string;
  black?: string;
};

const THEME_COLORS: Record<string, string> = {
  mate: "bg-red-100 text-red-700",
  mateIn1: "bg-red-100 text-red-700",
  mateIn2: "bg-red-100 text-red-700",
  mateIn3: "bg-red-100 text-red-700",
  sacrifice: "bg-amber-100 text-amber-700",
  pin: "bg-blue-100 text-blue-700",
  fork: "bg-purple-100 text-purple-700",
  skewer: "bg-indigo-100 text-indigo-700",
  deflection: "bg-orange-100 text-orange-700",
  discoveredAttack: "bg-cyan-100 text-cyan-700",
  doubleCheck: "bg-rose-100 text-rose-700",
};

function buildSolutionRows(fen: string, solution: string[]): SolutionRow[] {
  const fields = fen.split(/\s+/);
  const startsWithWhite = fields[1] !== "b";
  let moveNumber = Number(fields[5] ?? "1");
  if (!Number.isFinite(moveNumber) || moveNumber < 1) {
    moveNumber = 1;
  }

  const rows: SolutionRow[] = [];
  let currentRow: SolutionRow | null = null;
  let whiteToMove = startsWithWhite;

  solution.forEach((move) => {
    if (whiteToMove) {
      currentRow = { moveNumber, white: move };
      rows.push(currentRow);
    } else {
      if (!currentRow || currentRow.black) {
        currentRow = { moveNumber };
        rows.push(currentRow);
      }
      currentRow.black = move;
      moveNumber += 1;
    }
    whiteToMove = !whiteToMove;
  });

  return rows;
}

export default function PuzzleImporter({ onImportFen }: Props) {
  const [loading, setLoading] = useState(false);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [error, setError] = useState("");
  const [showSolution, setShowSolution] = useState(false);
  const [minRating, setMinRating] = useState(1200);
  const [maxRating, setMaxRating] = useState(2500);
  const hasSolution = (puzzle?.solution.length ?? 0) > 0;
  const solutionRows = puzzle ? buildSolutionRows(puzzle.fen, puzzle.solution) : [];

  const fetchPuzzle = async (endpoint: string) => {
    setLoading(true);
    setError("");
    setShowSolution(false);
    try {
      const resp = await fetch(
        `${API_BASE}/api/puzzle/${endpoint}?min_rating=${minRating}&max_rating=${maxRating}`,
      );
      if (!resp.ok) {
        setError(`请求失败 (${resp.status})`);
        return;
      }
      const data = (await resp.json()) as PuzzleData;
      if (!data.fen) {
        setError("未获取到谜题数据");
        return;
      }
      setPuzzle(data);
      onImportFen(data.fen);
    } catch {
      setError("网络错误，后端未启动");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-500">导入谜题</span>
        <span className="text-sm text-slate-400">评分</span>
        <input
          type="number"
          className="w-14 rounded border border-slate-300 px-1 py-0.5 text-sm"
          value={minRating}
          min={600}
          max={3000}
          onChange={(e) => setMinRating(Number(e.target.value))}
        />
        <span className="text-sm text-slate-400">–</span>
        <input
          type="number"
          className="w-14 rounded border border-slate-300 px-1 py-0.5 text-sm"
          value={maxRating}
          min={600}
          max={3000}
          onChange={(e) => setMaxRating(Number(e.target.value))}
        />
        <button
          type="button"
          className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50"
          onClick={() => fetchPuzzle("random")}
          disabled={loading}
        >
          {loading ? "获取中…" : "随机谜题"}
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
          onClick={() => fetchPuzzle("daily")}
          disabled={loading}
        >
          每日谜题
        </button>
        {error ? (
          <span className="text-sm text-rose-600">{error}</span>
        ) : null}
      </div>

      {puzzle ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-slate-700">#{puzzle.id}</span>
              <span className="text-slate-500">评分 {puzzle.rating}</span>
            </div>
            <button
              type="button"
              className="rounded border border-blue-200 bg-white px-3 py-1 text-sm font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setShowSolution(!showSolution)}
              disabled={!hasSolution}
            >
              {hasSolution
                ? showSolution
                  ? "隐藏答案"
                  : "查看答案"
                : "暂无答案"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {puzzle.themes.map((t) => (
              <span
                key={t}
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                  THEME_COLORS[t] ?? "bg-slate-200 text-slate-600"
                }`}
              >
                {t}
              </span>
            ))}
          </div>
          {showSolution && hasSolution ? (
            <div className="rounded border border-blue-100 bg-white px-3 py-2">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  完整答案
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {puzzle.solution.join(" → ")}
                </span>
              </div>
              <div
                data-testid="puzzle-solution-scroll"
                className="max-h-48 overflow-y-auto rounded border border-slate-100 text-sm"
              >
                <div className="sticky top-0 grid grid-cols-[3.5rem_1fr_1fr] bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                  <span>回合</span>
                  <span>白棋</span>
                  <span>黑棋</span>
                </div>
                {solutionRows.map((row) => (
                  <div
                    key={`${row.moveNumber}-${row.white ?? ""}-${row.black ?? ""}`}
                    className="grid grid-cols-[3.5rem_1fr_1fr] border-t border-slate-100 px-2 py-1 font-mono text-slate-700"
                  >
                    <span className="text-xs font-sans text-slate-400">
                      {row.moveNumber}.
                    </span>
                    <span className="font-semibold text-slate-800">
                      {row.white ?? ""}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {row.black ?? ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
