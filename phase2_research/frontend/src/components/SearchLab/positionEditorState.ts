export type TrayPiece =
  | "wK"
  | "wQ"
  | "wR"
  | "wB"
  | "wN"
  | "wP"
  | "bK"
  | "bQ"
  | "bR"
  | "bB"
  | "bN"
  | "bP";
export type CastlingKey =
  | "whiteShort"
  | "whiteLong"
  | "blackShort"
  | "blackLong";

export interface EditorState {
  pieces: Record<string, TrayPiece>;
  sideToMove: "w" | "b";
  castlingRights: Record<CastlingKey, boolean>;
}

export const DEFAULT_EDITOR_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const fenToPiece: Record<string, TrayPiece> = {
  p: "bP",
  r: "bR",
  n: "bN",
  b: "bB",
  q: "bQ",
  k: "bK",
  P: "wP",
  R: "wR",
  N: "wN",
  B: "wB",
  Q: "wQ",
  K: "wK",
};
const pieceToFen: Record<TrayPiece, string> = {
  wP: "P",
  wR: "R",
  wN: "N",
  wB: "B",
  wQ: "Q",
  wK: "K",
  bP: "p",
  bR: "r",
  bN: "n",
  bB: "b",
  bQ: "q",
  bK: "k",
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

function emptyCastlingRights(): Record<CastlingKey, boolean> {
  return {
    whiteShort: false,
    whiteLong: false,
    blackShort: false,
    blackLong: false,
  };
}

function cloneState(state: EditorState): EditorState {
  return {
    pieces: { ...state.pieces },
    sideToMove: state.sideToMove,
    castlingRights: { ...state.castlingRights },
  };
}

export function createStartingEditorState(): EditorState {
  return createEditorStateFromFen(DEFAULT_EDITOR_FEN);
}

export function createEditorStateFromFen(fen: string): EditorState {
  const [board, side, castling] = fen.trim().split(/\s+/);
  const pieces: Record<string, TrayPiece> = {};
  const ranks = board.split("/");
  for (let r = 0; r < 8; r++) {
    let fileIndex = 0;
    for (const ch of ranks[r] ?? "") {
      if (/\d/.test(ch)) fileIndex += Number(ch);
      else {
        pieces[`${files[fileIndex]}${8 - r}`] = fenToPiece[ch];
        fileIndex++;
      }
    }
  }
  const castlingRights = emptyCastlingRights();
  if (castling?.includes("K")) castlingRights.whiteShort = true;
  if (castling?.includes("Q")) castlingRights.whiteLong = true;
  if (castling?.includes("k")) castlingRights.blackShort = true;
  if (castling?.includes("q")) castlingRights.blackLong = true;
  return { pieces, sideToMove: side === "b" ? "b" : "w", castlingRights };
}

export function editorStateToFen(state: EditorState): string {
  const ranks: string[] = [];
  for (let rank = 8; rank >= 1; rank--) {
    let empty = 0;
    let row = "";
    for (const file of files) {
      const piece = state.pieces[`${file}${rank}`];
      if (!piece) empty++;
      else {
        if (empty) {
          row += String(empty);
          empty = 0;
        }
        row += pieceToFen[piece];
      }
    }
    if (empty) row += String(empty);
    ranks.push(row);
  }
  const castling =
    `${state.castlingRights.whiteShort ? "K" : ""}${state.castlingRights.whiteLong ? "Q" : ""}${state.castlingRights.blackShort ? "k" : ""}${state.castlingRights.blackLong ? "q" : ""}` ||
    "-";
  return `${ranks.join("/")} ${state.sideToMove} ${castling} - 0 1`;
}

export function applyPiecePlacement(
  state: EditorState,
  piece: TrayPiece,
  square: string,
): EditorState {
  const next = cloneState(state);
  next.pieces[square] = piece;
  return next;
}
export function removePieceAtSquare(
  state: EditorState,
  square: string,
): EditorState {
  const next = cloneState(state);
  delete next.pieces[square];
  return next;
}
export function toggleCastlingRight(
  state: EditorState,
  key: CastlingKey,
): EditorState {
  const next = cloneState(state);
  next.castlingRights[key] = !next.castlingRights[key];
  return next;
}

export function toggleBothCastlingForSide(
  state: EditorState,
  side: "w" | "b",
): EditorState {
  const next = cloneState(state);
  const bothOn =
    side === "w"
      ? next.castlingRights.whiteShort && next.castlingRights.whiteLong
      : next.castlingRights.blackShort && next.castlingRights.blackLong;
  if (bothOn) {
    if (side === "w") {
      next.castlingRights.whiteShort = false;
      next.castlingRights.whiteLong = false;
    } else {
      next.castlingRights.blackShort = false;
      next.castlingRights.blackLong = false;
    }
  } else {
    if (side === "w") {
      next.castlingRights.whiteShort = true;
      next.castlingRights.whiteLong = true;
    } else {
      next.castlingRights.blackShort = true;
      next.castlingRights.blackLong = true;
    }
  }
  return next;
}
export function setSideToMove(
  state: EditorState,
  side: "w" | "b",
): EditorState {
  const next = cloneState(state);
  next.sideToMove = side;
  return next;
}
export function clearBoardState(state: EditorState): EditorState {
  const next = cloneState(state);
  next.pieces = {};
  return next;
}
