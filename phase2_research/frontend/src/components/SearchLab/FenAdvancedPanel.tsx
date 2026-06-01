type Props = {
  fenDraft: string;
  fenError: string;
  onFenDraftChange: (fen: string) => void;
  onApplyFen: () => void;
  onCopyFen: () => void;
};

const btn =
  "rounded border border-slate-300 px-2 py-1 text-sm bg-white hover:bg-slate-100 text-slate-700 transition";

export default function FenAdvancedPanel({
  fenDraft,
  fenError,
  onFenDraftChange,
  onApplyFen,
  onCopyFen,
}: Props) {
  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">FEN 高级设置</h3>
      <textarea
        className="w-full rounded border border-slate-300 p-2 font-mono text-sm"
        rows={3}
        value={fenDraft}
        onChange={(e) => onFenDraftChange(e.target.value)}
      />
      {fenError ? (
        <div role="alert" className="text-sm text-rose-600">
          {fenError}
        </div>
      ) : null}
      <div className="flex gap-1">
        <button type="button" className={btn} onClick={onApplyFen}>
          应用 FEN
        </button>
        <button type="button" className={btn} onClick={onCopyFen}>
          复制 FEN
        </button>
      </div>
    </section>
  );
}
