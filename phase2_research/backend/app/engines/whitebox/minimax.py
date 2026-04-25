import chess
import uuid
import time
from typing import Tuple, Dict, Any
from .models import TreeNode

# Very basic piece values for standard Minimax evaluation
PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000
}

class AlphaBetaEngine:
    def __init__(self, depth: int = 3, use_move_ordering: bool = True):
        self.depth = depth
        self.use_move_ordering = use_move_ordering
        self.nodes_evaluated = 0

    def evaluate_board(self, board: chess.Board) -> float:
        self.nodes_evaluated += 1
        
        # Checkmates and stalemates
        if board.is_checkmate():
            return -99999.0 if board.turn else 99999.0
        if board.is_stalemate() or board.is_insufficient_material():
            return 0.0

        # Simple material counting
        score = 0.0
        for piece_type, value in PIECE_VALUES.items():
            score += len(board.pieces(piece_type, chess.WHITE)) * value
            score -= len(board.pieces(piece_type, chess.BLACK)) * value
            
        return score

    def order_moves(self, board: chess.Board, moves) -> list:
        if not self.use_move_ordering:
            return list(moves)
            
        def move_score(move):
            score = 0
            if board.is_capture(move):
                score += 1000 # Prioritize captures
            if board.gives_check(move):
                score += 500
            if move.promotion:
                score += 800
            return score
            
        return sorted(list(moves), key=move_score, reverse=True)

    def search(self, board: chess.Board) -> Dict[str, Any]:
        self.nodes_evaluated = 0
        start_time = time.time()
        
        root_id = str(uuid.uuid4())
        root_node = TreeNode(
            id=root_id, 
            name="ROOT", 
            node_type="root",
            metadata={"alpha": -float('inf'), "beta": float('inf')}
        )
        
        best_val, best_move = self._alphabeta(
            board, 
            self.depth, 
            -float('inf'), 
            float('inf'), 
            board.turn == chess.WHITE, 
            root_node
        )
        
        duration = time.time() - start_time
        
        return {
            "best_move": best_move.uci() if best_move else None,
            "evaluation": best_val,
            "nodes_evaluated": self.nodes_evaluated,
            "nps": int(self.nodes_evaluated / duration) if duration > 0 else 0,
            "time_ms": int(duration * 1000),
            "tree": root_node.dict_for_viz()
        }

    def _alphabeta(self, board: chess.Board, depth: int, alpha: float, beta: float, maximizing_player: bool, current_node: TreeNode) -> Tuple[float, chess.Move]:
        if depth == 0 or board.is_game_over():
            val = self.evaluate_board(board)
            current_node.value = val
            return val, None

        best_move = None
        ordered_moves = self.order_moves(board, board.legal_moves)
        
        if maximizing_player:
            max_eval = -float('inf')
            
            for move in ordered_moves:
                child_node = TreeNode(
                    id=str(uuid.uuid4()), 
                    name=move.uci(), 
                    node_type="max", 
                    metadata={"alpha": alpha, "beta": beta}
                )
                current_node.children.append(child_node)

                board.push(move)
                eval_val, _ = self._alphabeta(board, depth - 1, alpha, beta, False, child_node)
                board.pop()

                if eval_val > max_eval:
                    max_eval = eval_val
                    best_move = move
                    
                alpha = max(alpha, eval_val)
                child_node.value = eval_val

                if beta <= alpha:
                    # Pruning happens here. We add a dummy pruned node just to show the UI where it stopped.
                    pruned_node = TreeNode(
                        id=str(uuid.uuid4()),
                        name="Pruned",
                        node_type="pruned",
                        is_pruned=True,
                        metadata={"reason": f"beta {beta} <= alpha {alpha}"}
                    )
                    current_node.children.append(pruned_node)
                    break
                    
            current_node.value = max_eval
            return max_eval, best_move
            
        else: # Minimizing player
            min_eval = float('inf')
            
            for move in ordered_moves:
                child_node = TreeNode(
                    id=str(uuid.uuid4()), 
                    name=move.uci(), 
                    node_type="min", 
                    metadata={"alpha": alpha, "beta": beta}
                )
                current_node.children.append(child_node)

                board.push(move)
                eval_val, _ = self._alphabeta(board, depth - 1, alpha, beta, True, child_node)
                board.pop()

                if eval_val < min_eval:
                    min_eval = eval_val
                    best_move = move
                    
                beta = min(beta, eval_val)
                child_node.value = eval_val

                if beta <= alpha:
                    pruned_node = TreeNode(
                        id=str(uuid.uuid4()),
                        name="Pruned",
                        node_type="pruned",
                        is_pruned=True,
                        metadata={"reason": f"beta {beta} <= alpha {alpha}"}
                    )
                    current_node.children.append(pruned_node)
                    break
                    
            current_node.value = min_eval
            return min_eval, best_move
