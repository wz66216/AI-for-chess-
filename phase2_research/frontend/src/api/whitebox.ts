import type { SearchConfig, WhiteboxRequest, WhiteboxResult } from '../types/whitebox';
import { API_BASE } from './config';

const WHITEBOX_URL = `${API_BASE}/api/whitebox/play`;

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
export async function runWhiteboxSearchHttp(
  fen: string,
  config: SearchConfig,
  signal?: AbortSignal,
): Promise<WhiteboxResult> {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildWhiteboxRequest(fen, config)),
  };
  if (signal) init.signal = signal;

  const response = await fetch(WHITEBOX_URL, init);
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

export function runWhiteboxSearchWorker(
  fen: string,
  config: SearchConfig,
  signal?: AbortSignal,
): Promise<WhiteboxResult> {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    const cleanup = () => {
      w.removeEventListener('message', handler);
      signal?.removeEventListener('abort', abortHandler);
    };
    const handler = (e: MessageEvent) => {
      cleanup();
      if (e.data.type === 'result') {
        resolve(e.data.result as WhiteboxResult);
      } else {
        reject(new Error(e.data.error ?? 'Worker failed'));
      }
    };
    const abortHandler = () => {
      cleanup();
      _worker?.terminate();
      _worker = null;
      reject(new DOMException('Whitebox search aborted', 'AbortError'));
    };
    if (signal?.aborted) {
      abortHandler();
      return;
    }
    signal?.addEventListener('abort', abortHandler, { once: true });
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
