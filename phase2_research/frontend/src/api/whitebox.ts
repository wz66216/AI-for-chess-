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

// HTTP mode — original backend call
export async function runWhiteboxSearchHttp(fen: string, config: SearchConfig): Promise<WhiteboxResult> {
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

// Worker mode — in-browser engine
let _worker: Worker | null = null;
function getWorker(): Worker {
  if (!_worker) {
    _worker = new Worker(new URL('../engine/engine.worker.ts', import.meta.url), { type: 'module' });
  }
  return _worker;
}

export function runWhiteboxSearchWorker(fen: string, config: SearchConfig): Promise<WhiteboxResult> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const handler = (e: MessageEvent) => {
      w.removeEventListener('message', handler);
      if (e.data.type === 'result') {
        resolve(e.data.result as WhiteboxResult);
      } else {
        reject(new Error(e.data.error ?? 'Worker failed'));
      }
    };
    w.addEventListener('message', handler);
    w.postMessage({ fen, config });
  });
}

// Retrieve VITE_ENGINE_MODE from import.meta.env in a type-safe way
function getEngineMode(): string | undefined {
  try {
    // Vite exposes env on import.meta; cast through unknown for type safety
    const env = (import.meta as unknown as Record<string, unknown>).env as Record<string, string | undefined> | undefined;
    return env?.VITE_ENGINE_MODE;
  } catch {
    return undefined;
  }
}

// Unified entry: switch based on VITE_ENGINE_MODE env var
export const runWhiteboxSearch =
  getEngineMode() === 'worker' ? runWhiteboxSearchWorker : runWhiteboxSearchHttp;
