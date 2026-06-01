import chess
import uuid
import time
import math
import random
from typing import Dict, Any, List
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
        
    def ucb1(self, exploration_constant: float) -> float:
        if self.visits == 0:
            return float('inf')
        # Standard UCB formula
        return (self.wins / self.visits) + exploration_constant * math.sqrt(math.log(self.parent.visits) / self.visits)

class MCTSEngine:
    def __init__(self, iterations: int = 100, exploration_constant: float = 1.414, max_rollout_depth: int = 20):
        self.iterations = iterations
        self.exploration_constant = exploration_constant
        self.max_rollout_depth = max_rollout_depth
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
        best_child = max(root.children, key=lambda c: c.visits) if root.children else None
        
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
                    "evaluation": child.wins / child.visits,
                    "nodes": child.visits,
                })
        candidates.sort(key=lambda c: c["nodes"], reverse=True)
        candidates = candidates[:3]

        return {
            "best_move": board.san(best_child.move) if best_child and best_child.move else None,
            "evaluation": best_child.wins / best_child.visits if best_child and best_child.visits > 0 else 0,
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
                # Node is fully expanded, pick child with highest UCB1
                node = max(node.children, key=lambda c: c.ucb1(self.exploration_constant))
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
        # 1.0 for White win, 0.0 for Black win, 0.5 for Draw
        if result == '1-0':
            return 1.0
        elif result == '0-1':
            return 0.0
        else:
            # Draw or reached max depth
            # Better evaluation would use material count here
            return 0.5

    def _backpropagate(self, node: MCTSNode, reward: float):
        # Alternate perspective: flip reward for each level so that
        # white-move nodes accumulate wins from white's point of view
        # and black-move nodes accumulate wins from black's point of view.
        current_reward = reward
        while node is not None:
            node.visits += 1
            node.wins += current_reward
            current_reward = 1.0 - current_reward
            node = node.parent

    def _move_path_for_node(self, node: MCTSNode) -> list[str]:
        move_path = []
        current = node
        while current.parent is not None:
            if current.move is not None:
                move_path.append(current.move.uci())
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
            value=node.wins / node.visits if node.visits > 0 else 0,
            metadata={
                "visits": node.visits,
                "wins": node.wins,
                "ucb": node.ucb1(self.exploration_constant) if node.parent else 0,
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
