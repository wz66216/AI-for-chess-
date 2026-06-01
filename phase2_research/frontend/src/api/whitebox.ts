import type { SearchConfig, WhiteboxRequest, WhiteboxResult } from '../types/whitebox';

const WHITEBOX_URL = 'http://localhost:8000/api/whitebox/play';

export function buildWhiteboxRequest(fen: string, config: SearchConfig): WhiteboxRequest {
  return {
    fen,
    engine: config.engine,
    evaluator: config.evaluator,
    depth: config.depth,
    use_move_ordering: config.useMoveOrdering,
    mcts_iterations: config.mctsIterations,
    mcts_exploration_constant: config.mctsExplorationConstant,
  };
}

export async function runWhiteboxSearch(
  fen: string,
  config: SearchConfig,
): Promise<WhiteboxResult> {
  const response = await fetch(WHITEBOX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildWhiteboxRequest(fen, config)),
  });

  if (!response.ok) {
    throw new Error(`Whitebox search failed: ${response.status}`);
  }

  return response.json() as Promise<WhiteboxResult>;
}
