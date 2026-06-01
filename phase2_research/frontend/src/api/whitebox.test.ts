import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { buildWhiteboxRequest, runWhiteboxSearch } from './whitebox';
import type { SearchConfig } from '../types/whitebox';

const baseConfig: SearchConfig = {
  engine: 'alphabeta',
  evaluator: 'heuristic',
  depth: 3,
  useMoveOrdering: true,
  mctsIterations: 100,
  mctsExplorationConstant: 1.41,
};

describe('whitebox API helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps Search Lab config to backend whitebox request shape', () => {
    expect(buildWhiteboxRequest('start-fen', baseConfig)).toEqual({
      fen: 'start-fen',
      engine: 'alphabeta',
      evaluator: 'heuristic',
      depth: 3,
      use_move_ordering: true,
      mcts_iterations: 100,
      mcts_exploration_constant: 1.41,
    });
  });

  it('posts whitebox search requests to the backend endpoint', async () => {
    const responseBody = {
      best_move: 'e2e4',
      evaluation: 0.25,
      nodes_evaluated: 10,
      nps: 1000,
      time_ms: 10,
      tree: {
        id: 'root',
        name: 'root',
        value: 0.25,
        node_type: 'root',
        is_pruned: false,
        metadata: { fen: 'start-fen', move_path: [] },
        children: [],
      },
    };
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    } as Response);

    const result = await runWhiteboxSearch('start-fen', baseConfig);

    expect(result).toEqual(responseBody);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/whitebox/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildWhiteboxRequest('start-fen', baseConfig)),
    });
  });

  it('accepts leaf tree nodes without children and with null values', async () => {
    const responseBody = {
      best_move: null,
      evaluation: 0,
      nodes_evaluated: 1,
      nps: 0,
      time_ms: 1,
      tree: {
        id: 'leaf',
        name: 'leaf',
        value: null,
        node_type: 'leaf',
        is_pruned: false,
        metadata: { fen: 'start-fen', move_path: ['e2e4'] },
      },
    };
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    } as Response);

    await expect(runWhiteboxSearch('start-fen', baseConfig)).resolves.toEqual(responseBody);
  });
});
