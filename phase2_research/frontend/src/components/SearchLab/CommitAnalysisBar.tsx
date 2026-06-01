type Props = {
  dirty: boolean;
  autoRecompute: boolean;
  onAutoRecomputeChange: (next: boolean) => void;
  onConfirm: () => void;
};

export default function CommitAnalysisBar({
  dirty,
  autoRecompute,
  onAutoRecomputeChange,
  onConfirm,
}: Props) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      {dirty ? (
        <p className="text-sm text-amber-700">当前棋盘改动尚未确认</p>
      ) : null}
      <button
        type="button"
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800"
        onClick={onConfirm}
      >
        确认并开始计算
      </button>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={autoRecompute}
          onChange={(e) => onAutoRecomputeChange(e.target.checked)}
        />
        移动后自动更新分析
      </label>
    </section>
  );
}
