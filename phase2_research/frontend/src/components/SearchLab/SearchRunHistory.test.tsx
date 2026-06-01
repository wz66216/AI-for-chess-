import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SearchRunHistory, { type SearchRunRecord } from "./SearchRunHistory";

const run: SearchRunRecord = {
  id: "1",
  fen: "fen",
  config: {
    engine: "alphabeta",
    evaluator: "material",
    depth: 2,
    useMoveOrdering: true,
    mctsIterations: 100,
    mctsExplorationConstant: 1.41,
  },
  result: {
    best_move: "e2e4",
    evaluation: 1,
    nodes_evaluated: 2,
    nps: 3,
    time_ms: 4,
    tree: {
      id: "t",
      name: "ROOT",
      value: 1,
      node_type: "root",
      is_pruned: false,
      metadata: { fen: "tree fen" },
    },
  },
  createdAt: "2026-05-30T10:00:00.000Z",
};

describe("SearchRunHistory", () => {
  it("shows the empty state", () => {
    render(
      <SearchRunHistory runs={[]} onRestore={vi.fn()} onClear={vi.fn()} />,
    );

    expect(
      screen.getByText("暂无运行记录。完成一次搜索后会自动保存在此处。"),
    ).toBeInTheDocument();
  });

  it("shows localized engine and evaluator labels", () => {
    render(
      <SearchRunHistory runs={[run]} onRestore={vi.fn()} onClear={vi.fn()} />,
    );

    expect(
      screen.getByRole("button", { name: /α-β 搜索 \/ 子力评估/i }),
    ).toBeInTheDocument();
  });

  it("restores and clears runs", () => {
    const onRestore = vi.fn();
    const onClear = vi.fn();

    render(
      <SearchRunHistory runs={[run]} onRestore={onRestore} onClear={onClear} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /清空/i }));
    fireEvent.click(screen.getByRole("button", { name: /e2e4/i }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onRestore).toHaveBeenCalledWith(run);
  });
});
