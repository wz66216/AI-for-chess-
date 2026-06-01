import type { SearchTreeNode } from "../../types/whitebox";

type Props = {
  rootFen: string;
  node: SearchTreeNode | null;
  committedFen: string;
};

export default function PositionInspector({
  rootFen,
  committedFen,
  node,
}: Props) {
  const nodeTypeLabels: Record<string, string> = {
    root: "根节点",
    move: "着法节点",
    branch: "分支节点",
    mcts: "MCTS 节点",
  };
  const nodeType = node?.node_type
    ? (nodeTypeLabels[node.node_type] ?? node.node_type)
    : "";
  const selectedFen = node?.metadata?.fen;
  const movePath = node?.metadata?.move_path;
  const selectedNodeLabel = node
    ? `${node.name} (${nodeType})`
    : "最近确认局面";
  const movePathText =
    movePath === undefined
      ? node
        ? "当前节点没有可用元数据。"
        : "根局面"
      : movePath.length === 0
        ? "根局面"
        : movePath.join(" → ");

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-semibold text-slate-900">局面检查器</h3>
      <p className="text-sm text-slate-600">
        默认显示最近一次确认局面；点击搜索树节点后查看对应局面。
      </p>
      <div className="text-sm text-slate-700">
        <div>
          <span className="font-medium">选中节点：</span> {selectedNodeLabel}
        </div>
        <div>
          <span className="font-medium">根局面 FEN：</span>{" "}
          <span className="font-mono">{rootFen}</span>
        </div>
        <div>
          <span className="font-medium">选中节点 FEN：</span>{" "}
          <span className="font-mono">{selectedFen ?? committedFen}</span>
        </div>
        <div>
          <span className="font-medium">着法路径：</span> {movePathText}
        </div>
      </div>
    </section>
  );
}
