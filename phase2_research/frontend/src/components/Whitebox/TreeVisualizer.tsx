import { useCallback, useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type { SearchTreeNode } from "../../types/whitebox";

type TreeItemStyle = {
  color: string;
  borderColor: string;
  borderWidth: number;
  borderType: "dashed" | "solid";
};

type EChartsTreeNode = {
  name: string;
  value: number | null;
  itemStyle: TreeItemStyle;
  symbolSize: number;
  children?: EChartsTreeNode[];
};

type EChartsTooltipInfo = {
  name?: string;
  value?: unknown;
};

interface TreeVisualizerProps {
  data: SearchTreeNode | null;
  onNodeSelect?: (node: SearchTreeNode) => void;
}

export function TreeVisualizer({ data, onNodeSelect }: TreeVisualizerProps) {
  const chartRef = useRef<ReactECharts | null>(null);
  // Store raw SearchTreeNode references keyed by node id
  const nodeMap = useRef<Map<string, SearchTreeNode>>(new Map());

  // Recursively map our backend JSON node to ECharts series-tree format
  const processNode = useCallback(
    (node: SearchTreeNode): EChartsTreeNode => {
      nodeMap.current.set(node.id, node);

      let symbolSize = 12;
      let label = node.name || "ROOT";

      if (node.value !== null && node.value !== undefined) {
        label += `\n[${node.value.toFixed(2)}]`;
      }

      if (node.is_pruned) {
        symbolSize = 8;
        label += "\n(被剪枝)";
      } else if (node.node_type === "mcts") {
        const visits = node.metadata?.visits || 0;
        symbolSize = Math.max(10, Math.min(40, 10 + Math.log2(visits + 1) * 4));
        label += `\n${visits}次`;
      }

      const eNode: EChartsTreeNode = {
        name: label,
        value: node.value,
        itemStyle: {
          color: node.is_pruned ? "#fee2e2" : "#e0f2fe",
          borderColor: node.is_pruned ? "#ef4444" : "#0284c7",
          borderWidth: 2,
          borderType: node.is_pruned ? "dashed" : "solid",
        },
        symbolSize: symbolSize,
      };

      if (node.children?.length) {
        eNode.children = node.children.map(processNode);
      }

      if (node.is_pruned) {
        eNode.itemStyle.borderType = "dashed";
      }

      return eNode;
    },
    [],
  );

  const onEvents = useMemo(() => {
    if (!onNodeSelect) return undefined;
    return {
      click: (params: { treePathInfo?: { name: string }[] }) => {
        if (!params.treePathInfo || params.treePathInfo.length === 0) return;
        const last = params.treePathInfo[params.treePathInfo.length - 1];
        if (!last?.name) return;
        const label = last.name.split("\n")[0];
        for (const rawNode of nodeMap.current.values()) {
          if ((rawNode.name ?? "").split("\n")[0] === label) {
            onNodeSelect(rawNode);
            return;
          }
        }
      },
    };
  }, [onNodeSelect]);

  const option = useMemo(() => {
    if (!data) return {};
    nodeMap.current.clear();
    const mappedData = processNode(data);

    return {
      tooltip: {
        trigger: "item",
        triggerOn: "mousemove",
        formatter: function (info: EChartsTooltipInfo) {
          const v =
            typeof info.value === "number" ? info.value.toFixed(2) : "无";
          return `着法: ${(info.name ?? "").split("\n")[0]}<br/>评估值: ${v}`;
        },
      },
      series: [
        {
          type: "tree",
          data: [mappedData],
          top: "5%",
          left: "10%",
          bottom: "5%",
          right: "25%",
          symbolSize: 10,
          label: {
            position: "left",
            verticalAlign: "middle",
            align: "right",
            fontSize: 12,
          },
          leaves: {
            label: {
              position: "right",
              verticalAlign: "middle",
              align: "left",
            },
          },
          emphasis: {
            focus: "descendant",
          },
          expandAndCollapse: true,
          initialTreeDepth: 1,
          animationDuration: 550,
          animationDurationUpdate: 750,
        },
      ],
    };
  }, [data, processNode]);

  return (
    <div style={{ height: "520px", width: "100%" }}>
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: "100%", width: "100%" }}
        onEvents={onEvents}
      />
    </div>
  );
}
