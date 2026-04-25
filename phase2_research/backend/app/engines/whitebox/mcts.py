import chess
import uuid
import time
import math
import random
from typing import Dict, Any, List
from .models import TreeNode

class MCTSNode:
    def __init__(self, state: str, parent=None, move=None):
        self.state = state # FEN
        self.parent = parent
        self.move = move
        self.children = []
        self.visits = 0
        self.wins = 0
        self.untried_moves = []
        self.is_terminal = False
        
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
        
        return {
            "best_move": best_child.move.uci() if best_child else None,
            "evaluation": best_child.wins / best_child.visits if best_child and best_child.visits > 0 else 0,
            "nodes_evaluated": self.nodes_evaluated,
            "nps": int(self.nodes_evaluated / duration) if duration > 0 else 0,
            "time_ms": int(duration * 1000),
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
        while node is not None:
            node.visits += 1
            node.wins += reward
            node = node.parent

    def _serialize_to_viz(self, node: MCTSNode, max_depth: int, current_depth: int = 0) -> dict:
        viz_node = TreeNode(
            id=str(uuid.uuid4()),
            name=node.move.uci() if node.move else "ROOT",
            node_type="mcts",
            value=node.wins / node.visits if node.visits > 0 else 0,
            metadata={
                "visits": node.visits,
                "wins": node.wins,
                "ucb": node.ucb1(self.exploration_constant) if node.parent else 0
            }
        )
        
        if current_depth < max_depth:
            for child in node.children:
                # To prevent massive payloads, maybe only send top visited children
                viz_node.children.append(
                    TreeNode(**self._serialize_to_viz(child, max_depth, current_depth + 1))
                )
                
        return viz_node.dict_for_viz()
