type Props = { fen: string; onFenChange: (fen: string) => void; validationMessage?: string; disabled?: boolean };

export default function PositionInputPanel({ fen, onFenChange, validationMessage, disabled }: Props) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">① 输入局面</p>
        <h3 className="text-xl font-semibold text-slate-900">起始局面 FEN</h3>
        <p className="text-sm leading-6 text-slate-600">输入任意合法 FEN，默认使用标准初始局面。</p>
      </div>
      <label className="block space-y-2">
        <textarea aria-label="起始局面 FEN" value={fen} onChange={(e) => onFenChange(e.target.value)} disabled={disabled} className="min-h-28 w-full rounded-md border border-slate-300 p-3" />
      </label>
      {validationMessage ? <p role="alert" className="text-sm text-red-600">{validationMessage}</p> : null}
      {disabled ? <p className="text-sm text-slate-500">正在搜索，请稍候…</p> : null}
      <p className="text-sm text-slate-600">根局面与搜索树中选中节点的局面会分开显示，便于对比搜索路径。</p>
    </section>
  );
}
