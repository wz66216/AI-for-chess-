export type EvaluatorName = "material" | "pst" | "heuristic";

export interface SearchConfig {
  engine: "alphabeta" | "mcts";
  evaluator: EvaluatorName;
  depth: number;
  useMoveOrdering: boolean;
  mctsIterations: number;
  mctsExplorationConstant: number;
}

export interface Candidate {
  move: string;
  evaluation: number;
  nodes: number;
}

export interface SearchResult {
  best_move: string | null;
  evaluation: number;
  nodes_evaluated: number;
  nps: number;
  time_ms: number;
  instrumentation?: Record<string, unknown>;
  tree: TreeNode;
  candidates: Candidate[];
}

export interface TreeNode {
  id: string;
  name: string;
  value: number | null;
  node_type: string;
  is_pruned: boolean;
  metadata: Record<string, unknown>;
  children: TreeNode[];
}
