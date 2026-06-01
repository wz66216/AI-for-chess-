import { Chess, Move } from "chess.js";
import { SearchConfig, SearchResult, TreeNode, Candidate } from "./types";
import { evaluate } from "./evaluators";

function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}

export function alphabetaSearch(fen: string, config: SearchConfig): SearchResult {
  const board = new Chess(fen);
  const startTime = performance.now();
  let nodesEvaluated = 0;

  function orderMoves(moves: Move[]): Move[] {
    if (!config.useMoveOrdering) return moves;
    return [...moves].sort((a, b2) => {
      const sa = ((a.captured != null) ? 1000 : 0) + ((a.flags || "").includes("k") || (a.flags || "").includes("q") ? 800 : 0);
      const sb = ((b2.captured != null) ? 1000 : 0) + ((b2.flags || "").includes("k") || (b2.flags || "").includes("q") ? 800 : 0);
      return sb - sa;
    });
  }

  function alphabeta(
    b: Chess,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
    parentNode: TreeNode
  ): [number, Move | null] {
    if (depth === 0 || b.isGameOver()) {
      nodesEvaluated++;
      const val = evaluate(b, config.evaluator);
      parentNode.value = val;
      return [val, null];
    }

    const movesRaw = b.moves({ verbose: true });
    const moves = orderMoves(movesRaw as unknown as Move[]);
    let bestMove: Move | null = null;

    if (maximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const child: TreeNode = {
          id: genId(), name: move.san, value: null,
          node_type: "max", is_pruned: false, metadata: {}, children: [],
        };
        parentNode.children.push(child);
        b.move(move.san);
        const [evalVal] = alphabeta(b, depth - 1, alpha, beta, false, child);
        b.undo();
        child.value = evalVal;
        if (evalVal > maxEval) { maxEval = evalVal; bestMove = move; }
        alpha = Math.max(alpha, evalVal);
        if (beta <= alpha) {
          parentNode.children.push({
            id: genId(), name: "Pruned", value: null,
            node_type: "pruned", is_pruned: true, metadata: {}, children: [],
          });
          break;
        }
      }
      parentNode.value = maxEval;
      return [maxEval, bestMove];
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const child: TreeNode = {
          id: genId(), name: move.san, value: null,
          node_type: "min", is_pruned: false, metadata: {}, children: [],
        };
        parentNode.children.push(child);
        b.move(move.san);
        const [evalVal] = alphabeta(b, depth - 1, alpha, beta, true, child);
        b.undo();
        child.value = evalVal;
        if (evalVal < minEval) { minEval = evalVal; bestMove = move; }
        beta = Math.min(beta, evalVal);
        if (beta <= alpha) {
          parentNode.children.push({
            id: genId(), name: "Pruned", value: null,
            node_type: "pruned", is_pruned: true, metadata: {}, children: [],
          });
          break;
        }
      }
      parentNode.value = minEval;
      return [minEval, bestMove];
    }
  }

  const root: TreeNode = {
    id: "root", name: "ROOT", value: null,
    node_type: "root", is_pruned: false, metadata: {}, children: [],
  };

  const isMax = board.turn() === "w";
  const [bestVal, bestMove] = alphabeta(board, config.depth, -Infinity, Infinity, isMax, root);
  const duration = performance.now() - startTime;

  const candidates: Candidate[] = root.children
    .filter(c => !c.is_pruned && c.value !== null)
    .map(c => ({ move: c.name, evaluation: c.value ?? 0, nodes: 0 }))
    .sort((a, b) => isMax ? b.evaluation - a.evaluation : a.evaluation - b.evaluation)
    .slice(0, 3);

  return {
    best_move: bestMove?.san ?? null,
    evaluation: bestVal,
    nodes_evaluated: nodesEvaluated,
    nps: Math.round(nodesEvaluated / (duration / 1000)) || 0,
    time_ms: Math.round(duration),
    tree: root,
    candidates,
  };
}
