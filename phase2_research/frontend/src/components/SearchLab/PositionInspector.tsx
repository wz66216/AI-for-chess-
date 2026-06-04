import type { SearchTreeNode } from "../../types/whitebox";

type Props = {
  rootFen: string;
  node: SearchTreeNode | null;
  committedFen: string;
};

function formatMaybeNumber(value: unknown, digits = 2) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(digits)
    : "-";
}

function formatScore(value: number | null) {
  if (value === null || value === undefined) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function metadataValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return formatMaybeNumber(value);
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 break-words font-mono text-sm text-slate-900">
        {metadataValue(value)}
      </div>
    </div>
  );
}

export default function PositionInspector({
  rootFen,
  committedFen,
  node,
}: Props) {
  const nodeTypeLabels: Record<string, string> = {
    root: "根节点",
    move: "着法节点",
    branch: "分支节点",
    max: "白方选择节点",
    min: "黑方选择节点",
    mcts: "MCTS 节点",
    pruned: "剪枝节点",
  };
  const nodeType = node?.node_type
    ? (nodeTypeLabels[node.node_type] ?? node.node_type)
    : "";
  const metadata = node?.metadata ?? {};
  const selectedFen = metadata.fen;
  const movePath = metadata.move_path;
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
        : movePath.join(" -> ");

  const hasAlphaBetaDetails =
    metadata.alpha !== undefined ||
    metadata.beta !== undefined ||
    metadata.depth_remaining !== undefined ||
    metadata.reason !== undefined;
  const hasMctsDetails =
    metadata.visits !== undefined ||
    metadata.wins !== undefined ||
    metadata.white_win_rate !== undefined ||
    metadata.ucb !== undefined;

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">局面检查器</h3>
        <p className="text-sm text-slate-600">
          默认显示最近一次确认局面；点击搜索树节点后查看对应局面和搜索解释。
        </p>
      </div>

      <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
        <DetailRow label="选中节点" value={selectedNodeLabel} />
        <DetailRow label="白方评分" value={formatScore(node?.value ?? null)} />
        <DetailRow label="根局面 FEN" value={rootFen} />
        <DetailRow label="选中节点 FEN" value={selectedFen ?? committedFen} />
        <DetailRow label="着法路径" value={movePathText} />
      </div>

      {node?.is_pruned || metadata.reason ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <div className="font-semibold">剪枝说明</div>
          <div>{metadata.reason ? String(metadata.reason) : "该分支已被剪枝。"}</div>
        </div>
      ) : null}

      {hasAlphaBetaDetails ? (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-900">
            Alpha-Beta 节点信息
          </h4>
          <div className="grid gap-3 md:grid-cols-3">
            <DetailRow label="Alpha 下界" value={metadata.alpha} />
            <DetailRow label="Beta 上界" value={metadata.beta} />
            <DetailRow label="剩余深度" value={metadata.depth_remaining} />
          </div>
        </div>
      ) : null}

      {hasMctsDetails ? (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-900">
            MCTS 节点信息
          </h4>
          <div className="grid gap-3 md:grid-cols-4">
            <DetailRow label="访问次数" value={metadata.visits} />
            <DetailRow label="白方胜利累计" value={metadata.wins} />
            <DetailRow
              label="白方胜率"
              value={
                typeof metadata.white_win_rate === "number"
                  ? `${(metadata.white_win_rate * 100).toFixed(1)}%`
                  : undefined
              }
            />
            <DetailRow label="UCB 值" value={metadata.ucb} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
