import { useMemo, useState } from "react";

import type { SearchTreeNode } from "../../types/whitebox";
import { TreeVisualizer } from "../Whitebox/TreeVisualizer";

type Props = {
  tree: SearchTreeNode | null;
  onNodeSelect: (node: SearchTreeNode) => void;
};

function pruneHiddenNodes(node: SearchTreeNode): SearchTreeNode {
  return {
    ...node,
    children: node.children
      ?.filter((child) => !child.is_pruned)
      .map(pruneHiddenNodes),
  };
}

export default function SearchTreeExplorer({ tree, onNodeSelect }: Props) {
  const [showPrunedNodes, setShowPrunedNodes] = useState(false);
  const visibleTree = useMemo(
    () => (tree && !showPrunedNodes ? pruneHiddenNodes(tree) : tree),
    [tree, showPrunedNodes],
  );

  if (!tree)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        开始搜索后，这里会显示搜索树。点击节点可查看对应局面。
      </div>
    );

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">搜索树</h3>
        <p className="text-sm text-slate-600">
          点击节点后，局面检查器会显示 FEN、着法路径、剪枝原因和 MCTS 统计。
        </p>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={showPrunedNodes}
          onChange={(event) => setShowPrunedNodes(event.target.checked)}
        />
        显示剪枝节点
      </label>

      <div className="flex flex-wrap gap-2 text-xs text-slate-700">
        <span className="rounded-full bg-slate-100 px-2 py-1">
          普通节点：已经展开的候选着法
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-1">
          白方评分：正数白好，负数黑好
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-1">
          剪枝节点：被 alpha-beta 截断的分支
        </span>
      </div>

      <div className="max-h-[480px] overflow-auto rounded-lg border border-slate-100 bg-slate-50/60 p-2">
        <TreeVisualizer data={visibleTree} onNodeSelect={onNodeSelect} />
      </div>
    </section>
  );
}
