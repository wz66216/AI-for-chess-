import { useState } from "react";

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

export default function PuzzleImporter({ onImportFen }: Props) {
  const [loading, setLoading] = useState(false);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [error, setError] = useState("");
  const [showSolution, setShowSolution] = useState(false);
  const [minRating, setMinRating] = useState(1200);
  const [maxRating, setMaxRating] = useState(2500);

  const fetchPuzzle = async (endpoint: string) => {
    setLoading(true);
    setError("");
    setShowSolution(false);
    try {
      const resp = await fetch(
        `http://localhost:8000/api/puzzle/${endpoint}?min_rating=${minRating}&max_rating=${maxRating}`,
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
    <div className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-3 max-w-xl">
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
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">#{puzzle.id}</span>
            <span className="text-slate-500">评分 {puzzle.rating}</span>
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
          {puzzle.solution.length > 0 ? (
            <div>
              <button
                type="button"
                className="text-sm text-blue-600 underline hover:text-blue-800"
                onClick={() => setShowSolution(!showSolution)}
              >
                {showSolution ? "隐藏解法" : "显示解法"}
              </button>
              {showSolution ? (
                <div className="mt-1 font-mono text-sm text-slate-600">
                  {puzzle.solution.join(" → ")}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
