import type { CastlingKey } from "./positionEditorState";

type Props = {
  sideToMove: "w" | "b";
  castlingRights: Record<CastlingKey, boolean>;
  canUndo: boolean;
  onSideToMoveChange: (side: "w" | "b") => void;
  onToggleCastlingSide: (side: "w" | "b") => void;
  onClearBoard: () => void;
  onResetStartingPosition: () => void;
  onSwapOrientation: () => void;
  onUndo: () => void;
};

const toggleBtn = (pressed: boolean) =>
  `rounded px-2 py-1 text-sm transition ${
    pressed
      ? "bg-blue-100 ring-2 ring-blue-500 text-blue-800 font-medium"
      : "bg-white hover:bg-slate-100 text-slate-700"
  }`;

const actionBtn =
  "rounded px-2 py-1 text-sm bg-white hover:bg-slate-100 text-slate-700 transition";

export default function PositionSetupControls(props: Props) {
  const whiteCastlingOn =
    props.castlingRights.whiteShort && props.castlingRights.whiteLong;
  const blackCastlingOn =
    props.castlingRights.blackShort && props.castlingRights.blackLong;

  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">局面设置</h3>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className={toggleBtn(props.sideToMove === "w")}
          aria-pressed={props.sideToMove === "w"}
          onClick={() => props.onSideToMoveChange("w")}
        >
          白方走
        </button>
        <button
          type="button"
          className={toggleBtn(props.sideToMove === "b")}
          aria-pressed={props.sideToMove === "b"}
          onClick={() => props.onSideToMoveChange("b")}
        >
          黑方走
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className={toggleBtn(whiteCastlingOn)}
          aria-pressed={whiteCastlingOn}
          onClick={() => props.onToggleCastlingSide("w")}
        >
          白方易位
        </button>
        <button
          type="button"
          className={toggleBtn(blackCastlingOn)}
          aria-pressed={blackCastlingOn}
          onClick={() => props.onToggleCastlingSide("b")}
        >
          黑方易位
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        <button type="button" className={actionBtn} onClick={props.onUndo}>
          ↩ 撤销
        </button>
        <button
          type="button"
          className={actionBtn}
          onClick={props.onClearBoard}
        >
          清空棋盘
        </button>
        <button
          type="button"
          className={actionBtn}
          onClick={props.onResetStartingPosition}
        >
          标准开局
        </button>
        <button
          type="button"
          className={actionBtn}
          onClick={props.onSwapOrientation}
        >
          交换视角
        </button>
      </div>
    </section>
  );
}
