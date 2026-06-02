import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorState } from "./positionEditorState";

type MockPositionEditorPanelProps = {
  dirty: boolean;
  fenDraft: string;
  fenError: string;
  onApplyFen: () => void;
  onAutoRecomputeChange: (next: boolean) => void;
  onConfirm: () => void;
  onEditorChange: (state: EditorState) => void;
  onFenDraftChange: (fen: string) => void;
};

vi.mock("../../api/whitebox", () => ({
  runWhiteboxSearch: vi.fn(),
}));

vi.mock("../Whitebox/TreeVisualizer", () => ({
  TreeVisualizer: () => <div data-testid="tree-visualizer-mock" />,
}));

vi.mock("./PositionEditorPanel", () => ({
  default: ({
    dirty,
    fenDraft,
    fenError,
    onApplyFen,
    onAutoRecomputeChange,
    onConfirm,
    onEditorChange,
    onFenDraftChange,
  }: MockPositionEditorPanelProps) => (
    <div>
      <h3>局面设定工作台</h3>
      <label htmlFor="mock-fen-draft">起始局面 FEN</label>
      <textarea
        id="mock-fen-draft"
        aria-label="起始局面 FEN"
        value={fenDraft}
        onChange={(event) => onFenDraftChange(event.target.value)}
      />
      <button
        type="button"
        onClick={() =>
          onEditorChange({
            pieces: {},
            sideToMove: "w",
            castlingRights: {
              whiteShort: false,
              whiteLong: false,
              blackShort: false,
              blackLong: false,
            },
          })
        }
      >
        清空棋盘
      </button>
      <button
        type="button"
        data-testid="mock-board-square-d4"
        onClick={() =>
          onEditorChange({
            pieces: { d4: "wQ" },
            sideToMove: "w",
            castlingRights: {
              whiteShort: false,
              whiteLong: false,
              blackShort: false,
              blackLong: false,
            },
          })
        }
      >
        白后
      </button>
      <button
        type="button"
        data-testid="mock-board-square-e4"
        onClick={() =>
          onEditorChange({
            pieces: { d4: "wQ", e4: "wP" },
            sideToMove: "w",
            castlingRights: {
              whiteShort: false,
              whiteLong: false,
              blackShort: false,
              blackLong: false,
            },
          })
        }
      >
        白兵-e4
      </button>
      <button
        type="button"
        data-testid="mock-board-square-e5"
        onClick={() =>
          onEditorChange({
            pieces: { d4: "wQ", e5: "wP" },
            sideToMove: "w",
            castlingRights: {
              whiteShort: false,
              whiteLong: false,
              blackShort: false,
              blackLong: false,
            },
          })
        }
      >
        白兵-e5
      </button>
      <button type="button" onClick={onApplyFen}>
        应用 FEN
      </button>
      <button type="button" data-testid="mock-confirm-search" onClick={onConfirm}>
        确认并开始计算
      </button>
      <label>
        <input
          type="checkbox"
          aria-label="移动后自动更新分析"
          onChange={(event) => onAutoRecomputeChange(event.target.checked)}
        />
        移动后自动更新分析
      </label>
      {fenError ? <div role="alert">{fenError}</div> : null}
      {dirty ? <div>dirty-true</div> : <div>dirty-false</div>}
    </div>
  ),
}));

import { runWhiteboxSearch } from "../../api/whitebox";
import type { WhiteboxResult } from "../../types/whitebox";
import SearchWorkbench from "./SearchWorkbench";
import { makeRunId } from "./runIds";

describe("SearchWorkbench", () => {
  beforeEach(() => {
    vi.mocked(runWhiteboxSearch).mockReset();
  });

  it("runs a whitebox search and renders the result", async () => {
    vi.mocked(runWhiteboxSearch).mockResolvedValueOnce({
      best_move: "e2e4",
      evaluation: 1.23,
      nodes_evaluated: 42,
      nps: 1000,
      time_ms: 50,
      instrumentation: { nodes_visited: 99, leaf_nodes_evaluated: 12 },
      tree: {
        id: "root",
        name: "ROOT",
        value: 1.23,
        node_type: "root",
        is_pruned: false,
        metadata: { fen: "startfen" },
      },
    });
    render(<SearchWorkbench />);
    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
    await waitFor(() => expect(runWhiteboxSearch).toHaveBeenCalled());
    expect(await screen.findByText("最佳着法")).toBeInTheDocument();
    expect(screen.getByText("最佳着法").parentElement).toHaveTextContent(
      "e4",
    );
  });

  it("shows fen validation feedback and blocks invalid runs", async () => {
    render(<SearchWorkbench />);
    fireEvent.change(screen.getByLabelText(/起始局面 FEN/i), {
      target: { value: "invalid fen" },
    });
    fireEvent.click(screen.getByRole("button", { name: /应用 FEN/i }));
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(/FEN 格式无效/);
    expect(runWhiteboxSearch).not.toHaveBeenCalled();
  });

  it("shows a chinese error message when search fails", async () => {
    vi.mocked(runWhiteboxSearch).mockRejectedValueOnce(
      new Error("Whitebox search failed: 500"),
    );

    render(<SearchWorkbench />);
    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "搜索失败，请稍后重试。",
    );
    expect(
      screen.queryByText(/Whitebox search failed/i),
    ).not.toBeInTheDocument();
  });

  it("applies a valid fen draft without starting a search immediately", async () => {
    vi.mocked(runWhiteboxSearch).mockResolvedValueOnce({
      best_move: "e2e4",
      evaluation: 1.23,
      nodes_evaluated: 42,
      nps: 1000,
      time_ms: 50,
      tree: {
        id: "root",
        name: "ROOT",
        value: 1.23,
        node_type: "root",
        is_pruned: false,
        metadata: { fen: "startfen" },
      },
    });
    render(<SearchWorkbench />);
    fireEvent.change(screen.getByLabelText(/起始局面 FEN/i), {
      target: { value: "8/8/8/8/3Q4/8/8/8 w - - 0 1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /应用 FEN/i }));
    expect(screen.getByLabelText(/起始局面 FEN/i)).toHaveValue(
      "8/8/8/8/3Q4/8/8/8 w - - 0 1",
    );
    expect(runWhiteboxSearch).not.toHaveBeenCalled();
  });

  it("clears stale result and selection while a new request is loading", async () => {
    let resolveSecond:
      | ((value: WhiteboxResult | PromiseLike<WhiteboxResult>) => void)
      | undefined;
    vi.mocked(runWhiteboxSearch)
      .mockResolvedValueOnce({
        best_move: "d2d4",
        evaluation: 1.23,
        nodes_evaluated: 42,
        nps: 1000,
        time_ms: 50,
        tree: {
          id: "root-1",
          name: "ROOT",
          value: 1.23,
          node_type: "root",
          is_pruned: false,
          metadata: { fen: "firstfen" },
        },
      })
      .mockImplementationOnce(
        () =>
          new Promise<WhiteboxResult>((resolve) => {
            resolveSecond = resolve;
          }),
      );
    render(<SearchWorkbench />);
    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
    await screen.findByText("最佳着法");
    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
    expect(screen.getByText("正在搜索，请稍候…")).toBeInTheDocument();
    resolveSecond?.({
      best_move: "e2e4",
      evaluation: 2.0,
      nodes_evaluated: 10,
      nps: 500,
      time_ms: 30,
      tree: {
        id: "root-2",
        name: "ROOT",
        value: 2.0,
        node_type: "root",
        is_pruned: false,
        metadata: { fen: "secondfen" },
      },
    });
    await screen.findByText("最佳着法");
    expect(screen.getByText("最佳着法").parentElement).toHaveTextContent(
      "e4",
    );
  });

  it("adds a run history entry and restores it", async () => {
    vi.mocked(runWhiteboxSearch).mockResolvedValueOnce({
      best_move: "e2e4",
      evaluation: 1.23,
      nodes_evaluated: 42,
      nps: 1000,
      time_ms: 50,
      tree: {
        id: "root-1",
        name: "ROOT",
        value: 1.23,
        node_type: "root",
        is_pruned: false,
        metadata: { fen: "treefen", move_path: ["e2e4"] },
      },
    });
    render(<SearchWorkbench />);
    fireEvent.click(screen.getByRole("button", { name: /白后/i }));
    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
    await screen.findByRole("button", { name: /α-β 搜索 \/ 综合启发式/i });
    fireEvent.click(screen.getByRole("button", { name: /清空棋盘/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /α-β 搜索 \/ 综合启发式/i }),
    );
    expect(screen.getByLabelText(/起始局面 FEN/i)).toHaveValue(
      "8/8/8/8/3Q4/8/8/8 w - - 0 1",
    );
    expect(screen.getByText("选中节点 FEN：").parentElement).toHaveTextContent(
      "8/8/8/8/3Q4/8/8/8 w - - 0 1",
    );
  });

  it("keeps the existing result visible but marks it stale after edits", async () => {
    vi.mocked(runWhiteboxSearch).mockResolvedValueOnce({
      best_move: "e2e4",
      evaluation: 1.23,
      nodes_evaluated: 42,
      nps: 1000,
      time_ms: 50,
      tree: {
        id: "root-1",
        name: "ROOT",
        value: 1.23,
        node_type: "root",
        is_pruned: false,
        metadata: { fen: "treefen" },
      },
    });
    render(<SearchWorkbench />);
    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
    await screen.findByText("最佳着法");
    fireEvent.click(screen.getByRole("button", { name: /白兵-e4/i }));

    expect(screen.getByText("最佳着法").parentElement).toHaveTextContent(
      "e4",
    );
    expect(screen.getByText("dirty-true")).toBeInTheDocument();
    expect(
      screen.getByText("当前棋盘已变更，以下结果仍基于上一次确认局面。"),
    ).toBeInTheDocument();
  });

  it("confirms edited position and uses the confirmed fen for search", async () => {
    vi.mocked(runWhiteboxSearch).mockResolvedValueOnce({
      best_move: "d4d5",
      evaluation: 0.5,
      nodes_evaluated: 12,
      nps: 100,
      time_ms: 10,
      tree: {
        id: "root-confirmed",
        name: "ROOT",
        value: 0.5,
        node_type: "root",
        is_pruned: false,
        metadata: { fen: "confirmed" },
      },
    });

    render(<SearchWorkbench />);
    fireEvent.click(screen.getByRole("button", { name: /白后/i }));
    fireEvent.click(screen.getByTestId("mock-board-square-d4"));
    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));

    await waitFor(() => expect(runWhiteboxSearch).toHaveBeenCalled());
    expect(vi.mocked(runWhiteboxSearch).mock.calls[0]?.[0]).toBe(
      "8/8/8/8/3Q4/8/8/8 w - - 0 1",
    );
    expect(vi.mocked(runWhiteboxSearch).mock.calls[0]?.[1].evaluator).toBe(
      "heuristic",
    );
  });

  it("shows a stale result banner after the edited board changes again", async () => {
    vi.mocked(runWhiteboxSearch).mockResolvedValueOnce({
      best_move: "d4d5",
      evaluation: 0.5,
      nodes_evaluated: 12,
      nps: 100,
      time_ms: 10,
      tree: {
        id: "root-confirmed",
        name: "ROOT",
        value: 0.5,
        node_type: "root",
        is_pruned: false,
        metadata: { fen: "confirmed" },
      },
    });

    render(<SearchWorkbench />);
    fireEvent.click(screen.getByRole("button", { name: /白后/i }));
    fireEvent.click(screen.getByTestId("mock-board-square-d4"));
    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
    await screen.findByText("最佳着法");

    fireEvent.click(screen.getByRole("button", { name: /白兵-e4/i }));
    fireEvent.click(screen.getByTestId("mock-board-square-e4"));

    expect(
      screen.getByText("当前棋盘已变更，以下结果仍基于上一次确认局面。"),
    ).toBeInTheDocument();
  });

  it("recomputes automatically after a confirmed legal move when enabled", async () => {
    vi.mocked(runWhiteboxSearch)
      .mockResolvedValueOnce({
        best_move: "d4d5",
        evaluation: 0.5,
        nodes_evaluated: 12,
        nps: 100,
        time_ms: 10,
        tree: {
          id: "root-1",
          name: "ROOT",
          value: 0.5,
          node_type: "root",
          is_pruned: false,
          metadata: { fen: "confirmed-1" },
        },
      })
      .mockResolvedValueOnce({
        best_move: "d4d5",
        evaluation: 0.7,
        nodes_evaluated: 14,
        nps: 100,
        time_ms: 12,
        tree: {
          id: "root-2",
          name: "ROOT",
          value: 0.7,
          node_type: "root",
          is_pruned: false,
          metadata: { fen: "confirmed-2" },
        },
      });

    render(<SearchWorkbench />);
    fireEvent.click(screen.getByRole("button", { name: /白后/i }));
    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
    await waitFor(() => expect(runWhiteboxSearch).toHaveBeenCalledTimes(1));

    fireEvent.click(
      screen.getByRole("checkbox", { name: /移动后自动更新分析/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /白兵-e5/i }));

    await waitFor(() => expect(runWhiteboxSearch).toHaveBeenCalledTimes(2));
  });

  it("generates distinct fallback ids without crypto.randomUUID", async () => {
    expect(makeRunId(undefined, 1)).toBe("run-1");
    expect(makeRunId(() => undefined, 2)).toBe("run-2");
    vi.mocked(runWhiteboxSearch).mockResolvedValue({
      best_move: "e2e4",
      evaluation: 1.23,
      nodes_evaluated: 42,
      nps: 1000,
      time_ms: 50,
      tree: {
        id: "root-1",
        name: "ROOT",
        value: 1.23,
        node_type: "root",
        is_pruned: false,
        metadata: { fen: "treefen" },
      },
    });
    render(<SearchWorkbench />);
    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
    await screen.findByRole("button", { name: /α-β 搜索 \/ 综合启发式/i });
    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
    await waitFor(() => expect(runWhiteboxSearch).toHaveBeenCalledTimes(2));
    expect(
      screen.getAllByRole("button", { name: /α-β 搜索 \/ 综合启发式/i }),
    ).toHaveLength(2);
  });

  it("invalidates an in-flight request when restoring history", async () => {
    let resolvePending:
      | ((value: WhiteboxResult | PromiseLike<WhiteboxResult>) => void)
      | undefined;
    vi.mocked(runWhiteboxSearch)
      .mockResolvedValueOnce({
        best_move: "d2d4",
        evaluation: 1,
        nodes_evaluated: 1,
        nps: 1,
        time_ms: 1,
        tree: {
          id: "r1",
          name: "ROOT",
          value: 1,
          node_type: "root",
          is_pruned: false,
          metadata: { fen: "fen-1" },
        },
      })
      .mockImplementationOnce(
        () =>
          new Promise<WhiteboxResult>((resolve) => {
            resolvePending = resolve;
          }),
      );
    render(<SearchWorkbench />);
    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
    await screen.findByText("最佳着法");
    fireEvent.click(screen.getByRole("button", { name: /确认并开始计算/i }));
    expect(screen.getByText("正在搜索，请稍候…")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /α-β 搜索 \/ 综合启发式/i }),
    );
    expect(screen.getByLabelText(/起始局面 FEN/i)).toHaveValue(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );
    resolvePending?.({
      best_move: "e2e4",
      evaluation: 2,
      nodes_evaluated: 2,
      nps: 2,
      time_ms: 2,
      tree: {
        id: "r2",
        name: "ROOT",
        value: 2,
        node_type: "root",
        is_pruned: false,
        metadata: { fen: "fen-2" },
      },
    });
    await screen.findByText("最佳着法");
    expect(screen.getByText("最佳着法").parentElement).toHaveTextContent(
      "d4",
    );
  });

  it("aborts a stopped search and allows a later shorter search to finish", async () => {
    let firstSignal: AbortSignal | undefined;
    let resolveSecond:
      | ((value: WhiteboxResult | PromiseLike<WhiteboxResult>) => void)
      | undefined;

    vi.mocked(runWhiteboxSearch)
      .mockImplementationOnce((_fen, _config, signal) => {
        firstSignal = signal;
        return new Promise<WhiteboxResult>(() => {});
      })
      .mockImplementationOnce(
        () =>
          new Promise<WhiteboxResult>((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const confirmButton = () => screen.getByTestId("mock-confirm-search");
    const stopButton = () => screen.queryByLabelText("停止当前搜索");

    render(<SearchWorkbench />);
    fireEvent.click(confirmButton());
    await waitFor(() => expect(firstSignal).toBeDefined());
    fireEvent.click(stopButton() as HTMLElement);

    expect(firstSignal?.aborted).toBe(true);
    expect(stopButton()).toBeNull();

    fireEvent.click(confirmButton());
    resolveSecond?.({
      best_move: "e2e4",
      evaluation: 2,
      nodes_evaluated: 2,
      nps: 2,
      time_ms: 2,
      tree: {
        id: "r2",
        name: "ROOT",
        value: 2,
        node_type: "root",
        is_pruned: false,
        metadata: { fen: "fen-2" },
      },
    });

    await waitFor(() => expect(stopButton()).toBeNull());
    expect(runWhiteboxSearch).toHaveBeenCalledTimes(2);
  });
});
