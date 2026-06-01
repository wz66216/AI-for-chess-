import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PositionInspector from "./PositionInspector";

describe("PositionInspector", () => {
  it("shows root and selected node positions separately", () => {
    render(
      <PositionInspector
        committedFen="committed fen"
        rootFen="root fen"
        node={{
          id: "1",
          name: "Child",
          value: 0,
          node_type: "branch",
          is_pruned: false,
          metadata: { fen: "selected fen", move_path: ["e2e4", "e7e5"] },
        }}
      />,
    );

    expect(screen.getByText("选中节点：").parentElement).toHaveTextContent(
      "Child (分支节点)",
    );
    expect(screen.getByText("根局面 FEN：").parentElement).toHaveTextContent(
      "root fen",
    );
    expect(screen.getByText("选中节点 FEN：").parentElement).toHaveTextContent(
      "selected fen",
    );
    expect(screen.getByText("着法路径：").parentElement).toHaveTextContent(
      "e2e4 → e7e5",
    );
    expect(screen.getByText("局面检查器")).toBeInTheDocument();
  });

  it("shows metadata fallback when selected fen is unavailable", () => {
    render(
      <PositionInspector
        committedFen="committed fen"
        rootFen="root fen"
        node={{
          id: "1",
          name: "Child",
          value: 0,
          node_type: "branch",
          is_pruned: false,
          metadata: {},
        }}
      />,
    );

    expect(screen.getByText("选中节点 FEN：").parentElement).toHaveTextContent(
      "committed fen",
    );
    expect(screen.getByText("着法路径：").parentElement).toHaveTextContent(
      "当前节点没有可用元数据。",
    );
  });

  it("keeps unknown node types unchanged", () => {
    render(
      <PositionInspector
        committedFen="committed fen"
        rootFen="root fen"
        node={{
          id: "1",
          name: "Child",
          value: 0,
          node_type: "custom",
          is_pruned: false,
          metadata: {},
        }}
      />,
    );

    expect(screen.getByText("选中节点：").parentElement).toHaveTextContent(
      "Child (custom)",
    );
  });

  it("shows the committed position when no tree node is selected", () => {
    render(
      <PositionInspector
        committedFen="committed fen"
        rootFen="root fen"
        node={null}
      />,
    );

    expect(screen.getByText("选中节点：").parentElement).toHaveTextContent(
      "最近确认局面",
    );
    expect(screen.getByText("选中节点 FEN：").parentElement).toHaveTextContent(
      "committed fen",
    );
    expect(screen.getByText("着法路径：").parentElement).toHaveTextContent(
      "根局面",
    );
  });
});
