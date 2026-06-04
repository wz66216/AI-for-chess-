import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import PuzzleImporter from "./PuzzleImporter";

describe("PuzzleImporter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("imports a puzzle and reveals the complete answer on demand", async () => {
    const user = userEvent.setup();
    const onImportFen = vi.fn();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "mate-001",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        rating: 900,
        themes: ["mateIn1"],
        solution: ["Bb5", "a6", "Ba4"],
        players: [],
      }),
    } as Response);

    render(<PuzzleImporter onImportFen={onImportFen} />);

    await user.click(screen.getByRole("button", { name: "随机谜题" }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/puzzle/random?min_rating=1200&max_rating=2500"),
    );
    expect(onImportFen).toHaveBeenCalledWith(
      "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    );
    expect(screen.getByRole("button", { name: "查看答案" })).toBeEnabled();
    expect(screen.queryByText("完整答案")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "查看答案" }));

    expect(screen.getByText("完整答案")).toBeInTheDocument();
    expect(screen.getByText("回合")).toBeInTheDocument();
    expect(screen.getByText("白棋")).toBeInTheDocument();
    expect(screen.getByText("黑棋")).toBeInTheDocument();
    expect(screen.getByText("3.")).toBeInTheDocument();
    expect(screen.getByText("4.")).toBeInTheDocument();
    expect(screen.getByText("Bb5")).toBeInTheDocument();
    expect(screen.getByText("a6")).toBeInTheDocument();
    expect(screen.getByText("Ba4")).toBeInTheDocument();
  });

  it("disables the answer button when the backend has no solution", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "empty-solution",
        fen: "8/8/8/8/8/8/8/K6k w - - 0 1",
        rating: 600,
        themes: [],
        solution: [],
        players: [],
      }),
    } as Response);

    render(<PuzzleImporter onImportFen={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "随机谜题" }));

    expect(screen.getByRole("button", { name: "暂无答案" })).toBeDisabled();
  });

  it("keeps long answers inside a scrollable answer table", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "long-line",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        rating: 1800,
        themes: ["long"],
        solution: [
          "Bb5",
          "a6",
          "Ba4",
          "Nf6",
          "O-O",
          "Be7",
          "Re1",
          "b5",
          "Bb3",
          "d6",
          "c3",
          "O-O",
          "h3",
          "Nb8",
          "d4",
          "Nbd7",
          "Nbd2",
          "Bb7",
          "Bc2",
          "Re8",
        ],
        players: [],
      }),
    } as Response);

    render(<PuzzleImporter onImportFen={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "随机谜题" }));
    await user.click(screen.getByRole("button", { name: "查看答案" }));

    expect(screen.getByTestId("puzzle-solution-scroll")).toHaveClass(
      "max-h-48",
      "overflow-y-auto",
    );
    expect(screen.getByText("12.")).toBeInTheDocument();
    expect(screen.getByText("Re8")).toBeInTheDocument();
  });
});
