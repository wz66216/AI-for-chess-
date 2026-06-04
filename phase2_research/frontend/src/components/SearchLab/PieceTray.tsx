import type { TrayPiece } from "./positionEditorState";

type Props = {
  selectedPiece: TrayPiece | null;
  onChange: (piece: TrayPiece | null) => void;
  onClearBoard: () => void;
};

const PIECE_SYMBOL: Record<TrayPiece, string> = {
  wK: "\u2654",
  wQ: "\u2655",
  wR: "\u2656",
  wB: "\u2657",
  wN: "\u2658",
  wP: "\u2659",
  bK: "\u265A",
  bQ: "\u265B",
  bR: "\u265C",
  bB: "\u265D",
  bN: "\u265E",
  bP: "\u265F",
};

const WHITE: TrayPiece[] = ["wK", "wQ", "wR", "wB", "wN", "wP"];
const BLACK: TrayPiece[] = ["bK", "bQ", "bR", "bB", "bN", "bP"];

function btnClass(piece: TrayPiece, selected: TrayPiece | null): string {
  const base =
    "flex h-9 w-9 items-center justify-center rounded text-xl leading-none transition";
  return selected === piece
    ? `${base} ring-2 ring-blue-500 bg-blue-100`
    : `${base} hover:bg-slate-100`;
}

const trayActionClass =
  "rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-100";

export default function PieceTray({
  selectedPiece,
  onChange,
  onClearBoard,
}: Props) {
  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">棋子托盘</h3>
      <div className="flex gap-6">
        <div className="flex flex-col gap-1">
          {WHITE.map((piece) => (
            <button
              key={piece}
              type="button"
              className={btnClass(piece, selectedPiece)}
              aria-label={`白方${PIECE_SYMBOL[piece]}`}
              aria-pressed={selectedPiece === piece}
              onClick={() => onChange(piece)}
            >
              {PIECE_SYMBOL[piece]}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {BLACK.map((piece) => (
            <button
              key={piece}
              type="button"
              className={btnClass(piece, selectedPiece)}
              aria-label={`黑方${PIECE_SYMBOL[piece]}`}
              aria-pressed={selectedPiece === piece}
              onClick={() => onChange(piece)}
            >
              {PIECE_SYMBOL[piece]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={trayActionClass}
          onClick={() => onChange(null)}
        >
          取消选择
        </button>
        <button
          type="button"
          className={trayActionClass}
          onClick={onClearBoard}
        >
          清空棋盘
        </button>
      </div>
    </section>
  );
}
