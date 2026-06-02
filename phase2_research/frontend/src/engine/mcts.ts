import { SearchConfig, SearchResult } from "./types";

export function mctsSearch(_fen: string, _config: SearchConfig): SearchResult {
  void _fen;
  void _config;

  return {
    best_move: null,
    evaluation: 0,
    nodes_evaluated: 0,
    nps: 0,
    time_ms: 0,
    tree: { id: "root", name: "ROOT", value: null, node_type: "root", is_pruned: false, metadata: {}, children: [] },
    candidates: [],
  };
}
