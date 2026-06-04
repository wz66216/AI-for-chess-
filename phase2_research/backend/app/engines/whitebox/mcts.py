import chess
import uuid
import time
import math
import random
from typing import Dict, Any, List

from .evaluators import BoardEvaluator, HeuristicEvaluator
from .models import TreeNode

class MCTSNode:
    def __init__(self, state: str, parent: "MCTSNode | None" = None, move: chess.Move | None = None):
        self.state = state # FEN
        self.parent: MCTSNode | None = parent
        self.move: chess.Move | None = move
        self.children: list[MCTSNode] = []
        self.visits: int = 0
        self.wins: float = 0
        self.untried_moves: list[chess.Move] = []
        self.is_terminal: bool = False
        
    def ucb1(self, exploration_constant: float, parent_turn: chess.Color) -> float:
        if self.visits == 0:
            return float('inf')
        white_win_rate = self.wins / self.visits
        exploitation = white_win_rate if parent_turn == chess.WHITE else 1.0 - white_win_rate
        return exploitation + exploration_constant * math.sqrt(math.log(self.parent.visits) / self.visits)

class MCTSEngine:
    def __init__(
        self,
        iterations: int = 100,
        exploration_constant: float = 1.414,
        max_rollout_depth: int = 20,
        evaluator: BoardEvaluator | None = None,
    ):
        self.iterations = iterations
        self.exploration_constant = exploration_constant
        self.max_rollout_depth = max_rollout_depth
        self.evaluator = evaluator or HeuristicEvaluator()
        self.nodes_evaluated = 0

    def search(self, board: chess.Board) -> Dict[str, Any]:
        self.nodes_evaluated = 0
        start_time = time.time()
        
        root = MCTSNode(state=board.fen())
        root.untried_moves = list(board.legal_moves)
        if board.is_game_over():
            root.is_terminal = True
            
        for _ in range(self.iterations):
            node = self._select(root, board.copy())
            reward = self._simulate(board.copy(), node)
            self._backpropagate(node, reward)
            
        duration = time.time() - start_time
        ranked_children = self._rank_children_for_turn(root.children, board.turn)
        best_child = ranked_children[0] if ranked_children else None
        
        # Serialize the tree to our JSON model for visualization
        tree_viz = self._serialize_to_viz(root, max_depth=3) # Limit depth for viz so we don't crash the browser
        
        # Collect top-3 candidates from root children by visit count
        candidates = []
        for child in root.children:
            if child.visits > 0:
                try:
                    move_name = board.san(child.move) if child.move else "?"
                except Exception:
                    move_name = child.move.uci() if child.move else "?"
                candidates.append({
                    "move": move_name,
                    "evaluation": self._white_evaluation(child),
                    "nodes": child.visits,
                })
        candidates.sort(key=lambda c: c["evaluation"], reverse=board.turn == chess.WHITE)
        candidates = candidates[:3]

        return {
            "best_move": board.san(best_child.move) if best_child and best_child.move else None,
            "evaluation": self._white_evaluation(best_child) if best_child else 0,
            "nodes_evaluated": self.nodes_evaluated,
            "nps": int(self.nodes_evaluated / duration) if duration > 0 else 0,
            "time_ms": int(duration * 1000),
            "candidates": candidates,
            "tree": tree_viz
        }

    def _select(self, node: MCTSNode, board: chess.Board) -> MCTSNode:
        while not node.is_terminal:
            if len(node.untried_moves) > 0:
                return self._expand(node, board)
            else:
                parent_turn = board.turn
                node = max(node.children, key=lambda c: c.ucb1(self.exploration_constant, parent_turn))
                board.push(node.move)
        return node

    def _expand(self, node: MCTSNode, board: chess.Board) -> MCTSNode:
        move = random.choice(node.untried_moves)
        node.untried_moves.remove(move)
        
        board.push(move)
        self.nodes_evaluated += 1
        
        child = MCTSNode(state=board.fen(), parent=node, move=move)
        child.untried_moves = list(board.legal_moves)
        if board.is_game_over():
            child.is_terminal = True
            
        node.children.append(child)
        return child

    def _simulate(self, board: chess.Board, node: MCTSNode) -> float:
        # Rollout from the expanded node
        board.set_fen(node.state)
        depth = 0
        
        while not board.is_game_over() and depth < self.max_rollout_depth:
            moves = list(board.legal_moves)
            if not moves:
                break
            # Random rollout policy (could be improved with a heuristic)
            move = random.choice(moves)
            board.push(move)
            self.nodes_evaluated += 1
            depth += 1
            
        result = board.result()
        # 1.0 for White win, 0.0 for Black win, 0.5 for Draw.
        # Non-terminal cutoffs use a heuristic value, otherwise shallow MCTS
        # rollouts in ordinary positions all collapse to 0.00 in the UI.
        if result == '1-0':
            return 1.0
        elif result == '0-1':
            return 0.0
        elif result == '1/2-1/2':
            return 0.5
        return self._heuristic_reward(board)

    def _backpropagate(self, node: MCTSNode, reward: float):
        # Keep wins in one coordinate system: 1.0 is good for White,
        # 0.0 is good for Black. Selection handles whose turn it is.
        while node is not None:
            node.visits += 1
            node.wins += reward
            node = node.parent

    def _white_win_rate(self, node: MCTSNode) -> float:
        return node.wins / node.visits if node.visits > 0 else 0.5

    def _white_evaluation(self, node: MCTSNode) -> float:
        return 2.0 * self._white_win_rate(node) - 1.0

    def _heuristic_reward(self, board: chess.Board) -> float:
        white_score_centipawns = self.evaluator.evaluate(board)
        normalized = math.tanh(white_score_centipawns / 400.0)
        return 0.5 + 0.5 * normalized

    def _rank_children_for_turn(self, children: List[MCTSNode], turn: chess.Color) -> List[MCTSNode]:
        return sorted(children, key=self._white_evaluation, reverse=turn == chess.WHITE)

    def _move_path_for_node(self, node: MCTSNode) -> list[str]:
        move_path = []
        current = node
        while current.parent is not None:
            if current.move is not None:
                move_path.append(self._san_for_node(current))
            current = current.parent
        return list(reversed(move_path))

    def _san_for_node(self, node: MCTSNode) -> str:
        if not node.move:
            return "ROOT"
        # node.parent.state is the FEN BEFORE this move was played
        if node.parent:
            try:
                board = chess.Board(node.parent.state)
                return board.san(node.move)
            except Exception:
                pass
        return node.move.uci()

    def _serialize_to_viz(self, node: MCTSNode, max_depth: int, current_depth: int = 0) -> dict:
        viz_node = TreeNode(
            id=str(uuid.uuid4()),
            name=self._san_for_node(node),
            node_type="mcts",
            value=self._white_evaluation(node) if node.visits > 0 else 0,
            metadata={
                "visits": node.visits,
                "wins": node.wins,
                "white_win_rate": self._white_win_rate(node),
                "ucb": node.ucb1(self.exploration_constant, chess.Board(node.parent.state).turn) if node.parent else 0,
                "fen": node.state,
                "move_path": self._move_path_for_node(node)
            }
        )
        
        if current_depth < max_depth:
            for child in node.children:
                # To prevent massive payloads, maybe only send top visited children
                viz_node.children.append(
                    TreeNode(**self._serialize_to_viz(child, max_depth, current_depth + 1))
                )
                
        return viz_node.dict_for_viz()
