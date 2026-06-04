import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SearchResultSummary from "./SearchResultSummary";

const baseTree = {
  id: "r",
  name: "ROOT",
  value: 0,
  node_type: "root",
  is_pruned: false,
  metadata: {},
};

describe("SearchResultSummary", () => {
  it("renders nothing while loading because progress is shown elsewhere", () => {
    const { container } = render(<SearchResultSummary result={null} loading />);
    expect(container.textContent).toBe("");
  });

  it("renders summary cards and instrumentation fields", () => {
    render(
      <SearchResultSummary
        result={{
          best_move: "e2e4",
          evaluation: 1.23,
          nodes_evaluated: 42,
          nps: 1000,
          time_ms: 50,
          instrumentation: {
            nodes_visited: 99,
            leaf_nodes_evaluated: 12,
            cutoffs: 3,
            generated_children: 27,
            branching_factor: 2.5,
            evaluator_name: "material",
          },
          tree: baseTree,
        }}
      />,
    );

    expect(screen.getByText("搜索结果")).toBeInTheDocument();
    expect(screen.getByText(/评分始终以白方视角显示/)).toBeInTheDocument();
    expect(screen.getByText("白方评分")).toBeInTheDocument();
    expect(screen.getByText("+1.23")).toBeInTheDocument();
    expect(screen.getByText("访问节点")).toBeInTheDocument();
    expect(screen.getByText("e2e4")).toBeInTheDocument();
    expect(screen.getByText("剪枝 / 截断")).toBeInTheDocument();
    expect(screen.getByText("子力评估")).toBeInTheDocument();
  });

  it("maps evaluator names to chinese labels", () => {
    render(
      <SearchResultSummary
        result={{
          best_move: "e2e4",
          evaluation: 1.23,
          nodes_evaluated: 42,
          nps: 1000,
          time_ms: 50,
          instrumentation: {
            evaluator_name: "pst",
          },
          tree: baseTree,
        }}
      />,
    );

    expect(screen.getByText("位置表评估")).toBeInTheDocument();
  });

  it("renders candidate move rows with white-centric score labels", () => {
    render(
      <SearchResultSummary
        result={{
          best_move: "e4",
          evaluation: -0.12,
          nodes_evaluated: 42,
          nps: 1000,
          time_ms: 50,
          candidates: [
            { move: "e4", evaluation: -0.12 },
            { move: "d4", evaluation: 0.05 },
            { move: "Nf3", evaluation: 0 },
          ],
          tree: baseTree,
        }}
      />,
    );

    expect(screen.getByLabelText("候选招列表")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("e4")).toBeInTheDocument();
    expect(screen.getByLabelText("白方评分 -0.12")).toBeInTheDocument();
    expect(screen.queryByText("最佳着法")).not.toBeInTheDocument();
  });
});
