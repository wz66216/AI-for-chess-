import { Chess } from "chess.js";

const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 0,
};

function _terminalScore(board: Chess): number | null {
  if (board.isCheckmate()) return board.turn() === "w" ? -99999 : 99999;
  if (board.isStalemate() || board.isInsufficientMaterial()) return 0;
  return null;
}

export function materialScore(board: Chess): number {
  const t = _terminalScore(board);
  if (t !== null) return t;
  let score = 0;
  const fenBoard = board.fen().split(" ")[0];
  for (const ch of fenBoard) {
    const lower = ch.toLowerCase();
    if (lower in PIECE_VALUES) {
      score += ch === ch.toUpperCase() ? PIECE_VALUES[lower] : -PIECE_VALUES[lower];
    }
  }
  return score;
}

// Simplified PST: based on rank position bonuses
function pstBonus(square: string, piece: string): number {
  const file = square.charCodeAt(0) - 97; // a=0, h=7
  const rank = Number(square[1]) - 1;     // 1=0, 8=7
  const centerDist = Math.abs(file - 3.5) + Math.abs(rank - 3.5);
  const isWhite = piece === piece.toUpperCase();
  const r = isWhite ? rank : 7 - rank;
  switch (piece.toLowerCase()) {
    case "p": return r * 6 - Math.abs(file - 3.5) * 2;
    case "n": return (24 - centerDist * 6);
    case "b": return (18 - centerDist * 4);
    case "r": return r * 4 - Math.abs(file - 3.5) * 2;
    case "q": return (10 - centerDist * 2);
    case "k": return -centerDist * 4;
    default: return 0;
  }
}

export function pstScore(board: Chess): number {
  const t = _terminalScore(board);
  if (t !== null) return t;
  let score = 0;
  const fenBoard = board.fen().split(" ")[0];
  // Parse board squares for PST
  const rows = fenBoard.split("/");
  for (let r = 0; r < 8; r++) {
    let col = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) { col += Number(ch); continue; }
      const file = String.fromCharCode(97 + col);
      const rank = 8 - r;
      const sq = file + rank;
      const isWhite = ch === ch.toUpperCase();
      score += isWhite ? pstBonus(sq, ch) : -pstBonus(sq, ch);
      col++;
    }
  }
  return materialScore(board) + score;
}

function mobilityScore(board: Chess): number {
  const fen = board.fen();
  const b = new Chess(fen);
  const whiteMoves = b.moves().length;
  // Black moves: need to flip turn — just estimate
  return 5 * whiteMoves; // simplified
}

export function heuristicScore(board: Chess): number {
  const t = _terminalScore(board);
  if (t !== null) return t;
  return pstScore(board) + mobilityScore(board);
}

export function evaluate(board: Chess, name: string): number {
  switch (name) {
    case "material": return materialScore(board);
    case "pst": return pstScore(board);
    case "heuristic": return heuristicScore(board);
    default: return materialScore(board);
  }
}
