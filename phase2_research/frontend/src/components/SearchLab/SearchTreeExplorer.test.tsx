import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../Whitebox/TreeVisualizer", () => ({
  TreeVisualizer: ({
    data,
  }: {
    data: { children?: Array<{ id: string; is_pruned: boolean }> } | null;
  }) => (
    <div
      data-testid="tree-visualizer"
      data-children={JSON.stringify(data?.children ?? [])}
    />
  ),
}));

import SearchTreeExplorer from "./SearchTreeExplorer";

const tree = {
  id: "root",
  name: "ROOT",
  value: 0,
  node_type: "root",
  is_pruned: false,
  metadata: {},
  children: [
    {
      id: "keep",
      name: "keep",
      value: 1,
      node_type: "move",
      is_pruned: false,
      metadata: {},
    },
    {
      id: "pruned",
      name: "pruned",
      value: 2,
      node_type: "move",
      is_pruned: true,
      metadata: {},
    },
  ],
};

describe("SearchTreeExplorer", () => {
  it("hides pruned nodes by default and explains how to inspect nodes", () => {
    render(<SearchTreeExplorer tree={tree as never} onNodeSelect={vi.fn()} />);

    expect(
      screen.getByRole("checkbox", { name: /显示剪枝节点/i }),
    ).not.toBeChecked();
    expect(
      screen.getByText(/点击树节点后，局面检查器会切换到对应局面/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("tree-visualizer")).toHaveAttribute(
      "data-children",
      '[{"id":"keep","name":"keep","value":1,"node_type":"move","is_pruned":false,"metadata":{}}]',
    );
  });

  it("shows pruned nodes when toggled on", () => {
    render(<SearchTreeExplorer tree={tree as never} onNodeSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /显示剪枝节点/i }));

    expect(screen.getByTestId("tree-visualizer")).toHaveAttribute(
      "data-children",
      expect.stringContaining("pruned"),
    );
    expect(screen.getByText("搜索树")).toBeInTheDocument();
  });
});
