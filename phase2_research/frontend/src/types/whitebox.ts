export type WhiteboxEngine = 'alphabeta' | 'mcts';
export type EvaluatorName = 'material' | 'pst' | 'heuristic';

export interface WhiteboxRequest {
  fen: string;
  engine: WhiteboxEngine;
  depth: number;
  use_move_ordering: boolean;
  evaluator: EvaluatorName;
  mcts_iterations: number;
  mcts_exploration_constant: number;
}

export interface SearchTreeNodeMetadata {
  fen?: string;
  move_path?: string[];
  alpha?: number;
  beta?: number;
  depth_remaining?: number;
  reason?: string;
  visits?: number;
  wins?: number;
  ucb?: number;
  [key: string]: unknown;
}

export interface SearchTreeNode {
  id: string;
  name: string;
  value: number | null;
  node_type: string;
  is_pruned: boolean;
  metadata: SearchTreeNodeMetadata;
  children?: SearchTreeNode[];
}

export interface WhiteboxInstrumentation {
  evaluator_name?: EvaluatorName;
  nodes_visited?: number;
  leaf_evaluations?: number;
  leaf_nodes_evaluated?: number;
  cutoffs?: number;
  generated_children?: number;
  remaining_depth_counts?: Record<string, number>;
  children_by_remaining_depth?: Record<string, number>;
  branching_factor?: number;
  depth_node_counts?: Record<string, number>;
  [key: string]: unknown;
}

export interface Candidate {
  move: string;
  /** White-centric score: positive is better for White, negative is better for Black. */
  evaluation: number;
  nodes?: number;
}

export interface WhiteboxResult {
  best_move: string | null;
  /** White-centric score: positive is better for White, negative is better for Black. */
  evaluation: number;
  nodes_evaluated: number;
  nps: number;
  time_ms: number;
  instrumentation?: WhiteboxInstrumentation | null;
  candidates?: Candidate[];
  tree: SearchTreeNode;
}

export interface SearchConfig {
  engine: WhiteboxEngine;
  evaluator: EvaluatorName;
  depth: number;
  useMoveOrdering: boolean;
  mctsIterations: number;
  mctsExplorationConstant: number;
}
