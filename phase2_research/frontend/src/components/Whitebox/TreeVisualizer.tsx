import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface TreeVisualizerProps {
    data: any;
}

export function TreeVisualizer({ data }: TreeVisualizerProps) {
    // Recursively map our backend JSON node to ECharts series-tree format
    const processNode = (node: any): any => {
        let color = '#5470c6'; // default
        let symbolSize = 12;
        let label = node.name || 'ROOT';
        
        // Add evaluation value to label if present
        if (node.value !== null && node.value !== undefined) {
            label += `\n[${node.value.toFixed(2)}]`;
        }

        if (node.is_pruned) {
            color = '#ee6666'; // red for pruned
            symbolSize = 8;
            label += '\n(被剪枝)';
        } else if (node.node_type === 'mcts') {
            const visits = node.metadata?.visits || 1;
            // Scale node size logarithmically with visits
            symbolSize = Math.max(10, Math.min(40, 10 + Math.log2(visits) * 4));
            
            // Color mapping based on win rate (value)
            const winRate = node.value || 0;
            if (winRate > 0.6) color = '#91cc75'; // green for good
            else if (winRate < 0.4) color = '#ee6666'; // red for bad
            else color = '#fac858'; // yellow for neutral
            
            label += `\n${visits}次`;
        } else if (node.node_type === 'max') {
            color = '#73c0de'; // light blue
        } else if (node.node_type === 'min') {
            color = '#3ba272'; // green
        }

        const eNode = {
            name: label,
            value: node.value,
          itemStyle: {
            color: node.is_pruned ? '#fee2e2' : '#e0f2fe',
            borderColor: node.is_pruned ? '#ef4444' : '#0284c7',
            borderWidth: 2,
            borderType: node.is_pruned ? 'dashed' : 'solid'
          } as any,
            symbolSize: symbolSize,
            children: node.children ? node.children.map(processNode) : []
        };
        
        // Style pruned edge slightly differently if possible, but standard is fine
        if (node.is_pruned) {
            eNode.itemStyle.borderType = 'dashed';
        }
        
        return eNode;
    };

    const option = useMemo(() => {
        if (!data) return {};
        
        const mappedData = processNode(data);
        
        return {
            tooltip: {
                trigger: 'item',
                triggerOn: 'mousemove',
                formatter: function(info: any) {
                    const v = info.value !== undefined ? info.value.toFixed(2) : '无';
                    return `着法: ${info.name.split('\\n')[0]}<br/>评估值: ${v}`;
                }
            },
            series: [
                {
                    type: 'tree',
                    data: [mappedData],
                    top: '5%',
                    left: '7%',
                    bottom: '5%',
                    right: '20%',
                    symbolSize: 10,
                    label: {
                        position: 'left',
                        verticalAlign: 'middle',
                        align: 'right',
                        fontSize: 10
                    },
                    leaves: {
                        label: {
                            position: 'right',
                            verticalAlign: 'middle',
                            align: 'left'
                        }
                    },
                    emphasis: {
                        focus: 'descendant'
                    },
                    expandAndCollapse: true,
                    initialTreeDepth: 2, // Only expand 2 levels initially to avoid overwhelming the view
                    animationDuration: 550,
                    animationDurationUpdate: 750
                }
            ]
        };
    }, [data]);

    return (
        <div style={{ height: '400px', width: '100%' }}>
            <ReactECharts 
                option={option} 
                style={{ height: '100%', width: '100%' }} 
                notMerge={true} 
            />
        </div>
    );
}
