import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-chessboard", () => ({
  Chessboard: ({
    onSquareClick,
    onPieceDrop,
  }: {
    onSquareClick?: (sq: string) => void;
    onPieceDrop?: (from: string, to: string) => boolean;
  }) => (
    <div>
      <button onClick={() => onSquareClick?.("e2")}>square-e2</button>
      <button onClick={() => onSquareClick?.("e4")}>square-e4</button>
      <button onClick={() => onSquareClick?.("e7")}>square-e7</button>
      <button onClick={() => onSquareClick?.("e5")}>square-e5</button>
      <button onClick={() => onSquareClick?.("d4")}>square-d4</button>
      <button onClick={() => onPieceDrop?.("e2", "e4")}>drag-e2-e4</button>
      <button onClick={() => onPieceDrop?.("e7", "e5")}>drag-e7-e5</button>
    </div>
  ),
}));

import PositionEditorPanel from "./PositionEditorPanel";
import { createStartingEditorState } from "./positionEditorState";
import type { EditorState, TrayPiece } from "./positionEditorState";

function renderPanel({
  state = createStartingEditorState(),
  selectedTrayPiece = null,
  onEditorChange = vi.fn(),
}: {
  state?: EditorState;
  selectedTrayPiece?: TrayPiece | null;
  onEditorChange?: ReturnType<typeof vi.fn>;
} = {}) {
  const props = {
    editorState: state,
    boardOrientation: "white" as const,
    selectedTrayPiece,
    autoRecompute: false,
    fenDraft: "",
    fenError: "",
    dirty: true,
    onEditorChange,
    onTrayPieceChange: vi.fn(),
    onBoardOrientationChange: vi.fn(),
    onAutoRecomputeChange: vi.fn(),
    onFenDraftChange: vi.fn(),
    onApplyFen: vi.fn(),
    onCopyFen: vi.fn(),
    onConfirm: vi.fn(),
  };
  render(<PositionEditorPanel {...props} />);
  return props;
}

describe("PositionEditorPanel", () => {
  it("supports click-to-move and alternates the side to move", () => {
    const onEditorChange = vi.fn();
    renderPanel({ onEditorChange });

    fireEvent.click(screen.getByText("square-e2"));
    fireEvent.click(screen.getByText("square-e4"));

    expect(onEditorChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sideToMove: "b",
        pieces: expect.objectContaining({ e4: "wP" }),
      }),
    );
  });

  it("supports drag-to-move with the same legal move rules", () => {
    const onEditorChange = vi.fn();
    renderPanel({ onEditorChange });

    fireEvent.click(screen.getByText("drag-e2-e4"));

    expect(onEditorChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sideToMove: "b",
        pieces: expect.objectContaining({ e4: "wP" }),
      }),
    );
  });

  it("does not allow the wrong side to move twice", () => {
    const onEditorChange = vi.fn();
    renderPanel({ onEditorChange });

    fireEvent.click(screen.getByText("square-e7"));
    fireEvent.click(screen.getByText("square-e5"));
    fireEvent.click(screen.getByText("drag-e7-e5"));

    expect(onEditorChange).not.toHaveBeenCalled();
  });

  it("keeps tray piece placement as free board editing", () => {
    const onEditorChange = vi.fn();
    renderPanel({ selectedTrayPiece: "wQ", onEditorChange });

    fireEvent.click(screen.getByText("square-d4"));

    expect(onEditorChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pieces: expect.objectContaining({ d4: "wQ" }),
      }),
    );
  });

  it("places clear-board next to cancel selection in the piece tray", () => {
    const onEditorChange = vi.fn();
    renderPanel({ onEditorChange });

    const tray = screen.getByRole("heading", { name: "棋子托盘" })
      .parentElement;
    expect(tray).not.toBeNull();

    expect(tray).toContainElement(screen.getByRole("button", { name: "取消选择" }));
    expect(tray).toContainElement(screen.getByRole("button", { name: "清空棋盘" }));

    fireEvent.click(screen.getByRole("button", { name: "清空棋盘" }));

    expect(onEditorChange).toHaveBeenCalledWith(
      expect.objectContaining({ pieces: {} }),
    );
  });
});
