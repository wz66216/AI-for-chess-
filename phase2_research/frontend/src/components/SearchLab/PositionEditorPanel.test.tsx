import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-chessboard", () => ({
  Chessboard: ({
    onSquareClick,
  }: {
    onSquareClick?: (sq: string) => void;
  }) => <button onClick={() => onSquareClick?.("d4")}>mock-board-square-d4</button>,
}));

import PositionEditorPanel from "./PositionEditorPanel";
import { createStartingEditorState } from "./positionEditorState";

describe("PositionEditorPanel", () => {
  it("renders editor controls and forwards tray, toggle, and confirm callbacks", () => {
    const onEditorChange = vi.fn();
    const onConfirm = vi.fn();
    const onTrayPieceChange = vi.fn();
    const startingState = createStartingEditorState();

    render(
      <PositionEditorPanel
        editorState={startingState}
        boardOrientation="white"
        selectedTrayPiece="wQ"
        autoRecompute={false}
        fenDraft=""
        fenError=""
        dirty={true}
        onEditorChange={onEditorChange}
        onTrayPieceChange={onTrayPieceChange}
        onBoardOrientationChange={vi.fn()}
        onAutoRecomputeChange={vi.fn()}
        onFenDraftChange={vi.fn()}
        onApplyFen={vi.fn()}
        onCopyFen={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.getByRole("button", { name: /确认并开始计算/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /白方♕/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /应用 FEN/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /白方易位/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /黑方易位/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /白方走/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /黑方走/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: /白方易位/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /黑方易位/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/当前棋盘改动尚未确认/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /白方♕/i }));
    expect(onTrayPieceChange).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /黑方走/i }));
    expect(onEditorChange).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sideToMove: "b" }),
    );

    // Click 白方易位 → toggles both white castling off
    fireEvent.click(screen.getByRole("button", { name: /白方易位/i }));
    expect(onEditorChange).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        castlingRights: expect.objectContaining({
          whiteShort: false,
          whiteLong: false,
        }),
      }),
    );

    fireEvent.click(screen.getByText("mock-board-square-d4"));
    expect(onEditorChange).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        pieces: expect.objectContaining({ d4: "wQ" }),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /清空棋盘/i }));
    expect(onEditorChange).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ pieces: {} }),
    );

    fireEvent.click(screen.getByRole("button", { name: /标准开局/i }));
    expect(onEditorChange).toHaveBeenNthCalledWith(5, startingState);

    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
