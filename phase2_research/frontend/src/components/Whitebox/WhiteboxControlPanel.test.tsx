import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WhiteboxControlPanel } from "./WhiteboxControlPanel";

describe("WhiteboxControlPanel", () => {
  it("submits alpha-beta parameters within the backend limits", () => {
    const onAnalyze = vi.fn();

    render(<WhiteboxControlPanel isLoading={false} onAnalyze={onAnalyze} />);

    fireEvent.change(screen.getByLabelText("搜索深度"), {
      target: { value: "8" },
    });
    fireEvent.click(screen.getByRole("button", { name: /运行 Alpha-Beta/ }));

    expect(onAnalyze).toHaveBeenCalledWith(
      expect.objectContaining({
        engine: "alphabeta",
        depth: 8,
        use_move_ordering: true,
      }),
    );
  });

  it("keeps mcts controls aligned with the backend limits", () => {
    const onAnalyze = vi.fn();

    render(<WhiteboxControlPanel isLoading={false} onAnalyze={onAnalyze} />);

    fireEvent.click(screen.getByRole("button", { name: "MCTS" }));
    fireEvent.change(screen.getByLabelText("模拟次数"), {
      target: { value: "50000" },
    });
    fireEvent.change(screen.getByLabelText("探索系数"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /运行 MCTS/ }));

    expect(onAnalyze).toHaveBeenCalledWith(
      expect.objectContaining({
        engine: "mcts",
        mcts_iterations: 50000,
        mcts_exploration_constant: 5,
      }),
    );
  });
});
