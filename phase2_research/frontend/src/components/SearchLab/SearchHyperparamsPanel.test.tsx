import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SearchHyperparamsPanel from "./SearchHyperparamsPanel";

describe("SearchHyperparamsPanel", () => {
  it("shows alpha-beta controls and updates depth", async () => {
    const onChange = vi.fn();

    render(
      <SearchHyperparamsPanel
        config={{
          engine: "alphabeta",
          evaluator: "heuristic",
          depth: 2,
          useMoveOrdering: true,
          mctsIterations: 100,
          mctsExplorationConstant: 1.41,
        }}
        onChange={onChange}
      />,
    );

    expect(screen.getByText("搜索深度")).toBeInTheDocument();
    expect(screen.getByText("启用着法排序")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("搜索深度"), {
      target: { value: "3" },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ depth: 3 }),
    );
  });

  it("shows mcts controls when selected", () => {
    render(
      <SearchHyperparamsPanel
        config={{
          engine: "mcts",
          evaluator: "heuristic",
          depth: 2,
          useMoveOrdering: false,
          mctsIterations: 100,
          mctsExplorationConstant: 1.41,
        }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("模拟次数")).toBeInTheDocument();
    expect(screen.getByLabelText("探索系数")).toBeInTheDocument();
  });
});
