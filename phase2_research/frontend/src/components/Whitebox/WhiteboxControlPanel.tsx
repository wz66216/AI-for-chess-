import { useState } from 'react';

export interface WhiteboxParams {
    engine: "alphabeta" | "mcts";
    depth: number;
    use_move_ordering: boolean;
    mcts_iterations: number;
    mcts_exploration_constant: number;
}

interface WhiteboxControlPanelProps {
    onAnalyze: (params: WhiteboxParams) => void;
    isLoading: boolean;
}

export function WhiteboxControlPanel({ onAnalyze, isLoading }: WhiteboxControlPanelProps) {
    const [engine, setEngine] = useState<"alphabeta" | "mcts">("alphabeta");
    
    // AB params
    const [depth, setDepth] = useState(3);
    const [useMoveOrdering, setUseMoveOrdering] = useState(true);
    
    // MCTS params
    const [iterations, setIterations] = useState(100);
    const [cValue, setCValue] = useState(1.41);

    const handleAnalyze = () => {
        onAnalyze({
            engine,
            depth,
            use_move_ordering: useMoveOrdering,
            mcts_iterations: iterations,
            mcts_exploration_constant: cValue
        });
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">白盒引擎参数控制台</h2>
            
            {/* Engine Selection */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">运行算法</label>
                <div className="flex space-x-2">
                    <button 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${engine === 'alphabeta' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        onClick={() => setEngine('alphabeta')}
                    >
                        Alpha-Beta
                    </button>
                    <button 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${engine === 'mcts' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        onClick={() => setEngine('mcts')}
                    >
                        MCTS
                    </button>
                </div>
            </div>

            {/* Hyperparameters */}
            <div className="space-y-4 bg-gray-50 p-3 rounded-md mb-4">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">超参数</h3>
                
                {engine === 'alphabeta' ? (
                    <>
                        <div>
                            <label className="flex justify-between text-sm text-gray-700 mb-1">
                                <span>搜索深度 (Depth)</span>
                                <span className="font-mono bg-white px-1 rounded border">{depth}</span>
                            </label>
                            <input 
                                type="range" min="1" max="5" value={depth} 
                                onChange={(e) => setDepth(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                        <div className="flex items-center mt-3">
                            <input 
                                type="checkbox" id="moveOrdering"
                                checked={useMoveOrdering}
                                onChange={(e) => setUseMoveOrdering(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="moveOrdering" className="ml-2 block text-sm text-gray-700">
                                启用着法排序 (MVV-LVA)
                            </label>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <label className="flex justify-between text-sm text-gray-700 mb-1">
                                <span>模拟次数 (Iterations)</span>
                                <span className="font-mono bg-white px-1 rounded border">{iterations}</span>
                            </label>
                            <input 
                                type="range" min="10" max="2000" step="10" value={iterations} 
                                onChange={(e) => setIterations(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="flex justify-between text-sm text-gray-700 mb-1 mt-3">
                                <span>探索常数 (c)</span>
                                <span className="font-mono bg-white px-1 rounded border">{cValue.toFixed(2)}</span>
                            </label>
                            <input 
                                type="range" min="0.1" max="3.0" step="0.1" value={cValue} 
                                onChange={(e) => setCValue(Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Action Button */}
            <button 
                onClick={handleAnalyze}
                disabled={isLoading}
                className={`w-full py-3 rounded-lg text-white font-bold text-lg shadow-sm transition-colors ${
                    isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : engine === 'alphabeta' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                }`}
            >
                {isLoading ? '正在计算搜索树...' : `运行 ${engine === 'alphabeta' ? 'Alpha-Beta' : 'MCTS'} 引擎分析`}
            </button>
        </div>
    );
}
