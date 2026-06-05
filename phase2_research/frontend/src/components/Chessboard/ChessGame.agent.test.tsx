import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-chessboard", () => ({
  Chessboard: () => <div>board</div>,
}));

vi.mock("axios", () => ({
  default: {
    get: vi.fn(() => new Promise(() => {})),
    post: vi.fn(),
  },
}));

vi.mock("../../api/analysis", () => ({
  analyzeMove: vi.fn(),
  reviewGame: vi.fn(),
}));

import { ChessGame } from "./ChessGame";

describe("ChessGame agent controls", () => {
  it("renders audience and depth controls", () => {
    render(
      <MemoryRouter>
        <ChessGame />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("解释水平")).toBeInTheDocument();
    expect(screen.getByLabelText("分析深度")).toBeInTheDocument();
  });
});
