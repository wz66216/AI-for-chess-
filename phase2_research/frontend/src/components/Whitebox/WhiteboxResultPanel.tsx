import { TreeVisualizer } from './TreeVisualizer';
import type { SearchTreeNode } from '../../types/whitebox';

export interface WhiteboxResult {
    best_move: string | null;
    evaluation: number;
    nodes_evaluated: number;
    nps: number;
    time_ms: number;
    tree: SearchTreeNode | null;
}

interface WhiteboxResultPanelProps {
    result: WhiteboxResult | null;
}

export function WhiteboxResultPanel({ result }: WhiteboxResultPanelProps) {
    if (!result) return null;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">分析结果</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-2 rounded border">
                    <p className="text-xs text-gray-500 uppercase">最佳着法 (Best Move)</p>
                    <p className="font-mono text-lg font-bold text-green-700">{result.best_move || "无"}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded border">
                    <p className="text-xs text-gray-500 uppercase">局面评估值 (Eval)</p>
                    <p className="font-mono text-lg font-bold">{result.evaluation.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded border">
                    <p className="text-xs text-gray-500 uppercase">展开节点数 (Nodes)</p>
                    <p className="font-mono">{result.nodes_evaluated.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded border">
                    <p className="text-xs text-gray-500 uppercase">搜索速度 (NPS)</p>
                    <p className="font-mono">{result.nps.toLocaleString()} 节点/秒</p>
                </div>
                <div className="bg-gray-50 p-2 rounded border col-span-2">
                    <p className="text-xs text-gray-500 uppercase">计算耗时 (Time)</p>
                    <p className="font-mono">{result.time_ms} ms</p>
                </div>
            </div>
            
            <div className="mt-4 p-2 border border-slate-200 rounded-md w-full overflow-hidden">
                <h3 className="text-slate-800 font-bold mb-2 ml-2">搜索树展开可视化 (Treeviz)</h3>
                <TreeVisualizer data={result.tree} />
            </div>
        </div>
    );
}
