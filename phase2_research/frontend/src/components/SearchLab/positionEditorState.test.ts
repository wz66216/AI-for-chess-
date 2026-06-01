import { describe, expect, it } from "vitest";
import {
  DEFAULT_EDITOR_FEN,
  applyPiecePlacement,
  clearBoardState,
  createEditorStateFromFen,
  createStartingEditorState,
  editorStateToFen,
  removePieceAtSquare,
  setSideToMove,
  toggleCastlingRight,
} from "./positionEditorState";

describe("positionEditorState", () => {
  it("标准初始局面可以 round-trip", () => {
    const starting = createStartingEditorState();
    expect(editorStateToFen(starting)).toBe(DEFAULT_EDITOR_FEN);
  });

  it("空棋盘放置和移除棋子时原状态不变", () => {
    const starting = createStartingEditorState();
    const empty = clearBoardState(starting);
    const placed = applyPiecePlacement(empty, "wK", "e4");
    const removed = removePieceAtSquare(placed, "e4");

    expect(empty.pieces.e4).toBeUndefined();
    expect(placed.pieces.e4).toBe("wK");
    expect(removed.pieces.e4).toBeUndefined();
    expect(starting.pieces.e4).toBeUndefined();
  });

  it("切换易位权和行棋方后 FEN 正确", () => {
    const fenState = toggleCastlingRight(
      setSideToMove(createEditorStateFromFen(DEFAULT_EDITOR_FEN), "b"),
      "whiteLong",
    );

    expect(editorStateToFen(fenState)).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b Kkq - 0 1",
    );
  });
});
