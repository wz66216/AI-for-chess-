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
          value: 0.25,
          node_type: "branch",
          is_pruned: false,
          metadata: { fen: "selected fen", move_path: ["e2e4", "e7e5"] },
        }}
      />,
    );

    expect(screen.getByText("选中节点").parentElement).toHaveTextContent(
      "Child (分支节点)",
    );
    expect(screen.getByText("白方评分").parentElement).toHaveTextContent("+0.25");
    expect(screen.getByText("根局面 FEN").parentElement).toHaveTextContent(
      "root fen",
    );
    expect(screen.getByText("选中节点 FEN").parentElement).toHaveTextContent(
      "selected fen",
    );
    expect(screen.getByText("着法路径").parentElement).toHaveTextContent(
      "e2e4 -> e7e5",
    );
    expect(screen.getByText("局面检查器")).toBeInTheDocument();
  });

  it("shows alpha-beta metadata and pruning reason", () => {
    render(
      <PositionInspector
        committedFen="committed fen"
        rootFen="root fen"
        node={{
          id: "1",
          name: "Pruned",
          value: null,
          node_type: "pruned",
          is_pruned: true,
          metadata: {
            alpha: 1.25,
            beta: 0.75,
            depth_remaining: 2,
            reason: "beta 0.75 <= alpha 1.25",
          },
        }}
      />,
    );

    expect(screen.getByText("剪枝说明")).toBeInTheDocument();
    expect(screen.getByText("beta 0.75 <= alpha 1.25")).toBeInTheDocument();
    expect(screen.getByText("Alpha-Beta 节点信息")).toBeInTheDocument();
    expect(screen.getByText("Alpha 下界").parentElement).toHaveTextContent(
      "1.25",
    );
    expect(screen.getByText("Beta 上界").parentElement).toHaveTextContent(
      "0.75",
    );
    expect(screen.getByText("剩余深度").parentElement).toHaveTextContent("2.00");
  });

  it("shows mcts metadata", () => {
    render(
      <PositionInspector
        committedFen="committed fen"
        rootFen="root fen"
        node={{
          id: "1",
          name: "e4",
          value: 0.6,
          node_type: "mcts",
          is_pruned: false,
          metadata: {
            visits: 25,
            wins: 20,
            white_win_rate: 0.8,
            ucb: 1.234,
          },
        }}
      />,
    );

    expect(screen.getByText("MCTS 节点信息")).toBeInTheDocument();
    expect(screen.getByText("访问次数").parentElement).toHaveTextContent("25.00");
    expect(screen.getByText("白方胜利累计").parentElement).toHaveTextContent(
      "20.00",
    );
    expect(screen.getByText("白方胜率").parentElement).toHaveTextContent("80.0%");
    expect(screen.getByText("UCB 值").parentElement).toHaveTextContent("1.23");
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

    expect(screen.getByText("选中节点").parentElement).toHaveTextContent(
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

    expect(screen.getByText("选中节点").parentElement).toHaveTextContent(
      "最近确认局面",
    );
    expect(screen.getByText("选中节点 FEN").parentElement).toHaveTextContent(
      "committed fen",
    );
    expect(screen.getByText("着法路径").parentElement).toHaveTextContent(
      "根局面",
    );
  });
});
