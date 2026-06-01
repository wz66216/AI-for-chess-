import chess
import uuid
import time
from typing import Tuple, Dict, Any, Optional
from .evaluators import BoardEvaluator, MaterialEvaluator
from .instrumentation import AlphaBetaInstrumentation
from .models import TreeNode

class AlphaBetaEngine:
    def __init__(self, depth: int = 3, use_move_ordering: bool = True, evaluator: Optional[BoardEvaluator] = None):
        self.depth = depth
        self.use_move_ordering = use_move_ordering
        self.evaluator = evaluator or MaterialEvaluator()
        self.nodes_evaluated = 0
        self.instrumentation = AlphaBetaInstrumentation(evaluator_name=getattr(self.evaluator, "name", None))

    def evaluate_board(self, board: chess.Board) -> float:
        self.nodes_evaluated += 1
        return self.evaluator.evaluate(board)

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
        self.instrumentation = AlphaBetaInstrumentation(evaluator_name=getattr(self.evaluator, "name", None))
        start_time = time.time()
        
        root_id = str(uuid.uuid4())
        root_node = TreeNode(
            id=root_id, 
            name="ROOT", 
            node_type="root",
            metadata={"alpha": -float('inf'), "beta": float('inf'), "fen": board.fen(), "move_path": [], "depth_remaining": self.depth}
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
        
        # Collect top-3 candidate moves from root children
        candidates = []
        for child in root_node.children:
            if not child.is_pruned and child.value is not None and child.name not in (None, "Pruned"):
                candidates.append({"move": child.name, "evaluation": child.value, "nodes": 0})
        candidates.sort(key=lambda c: abs(c["evaluation"]), reverse=True)
        candidates = candidates[:3]

        return {
            "best_move": best_move.uci() if best_move else None,
            "evaluation": best_val,
            "nodes_evaluated": self.nodes_evaluated,
            "nps": int(self.nodes_evaluated / duration) if duration > 0 else 0,
            "time_ms": int(duration * 1000),
            "instrumentation": self.instrumentation.to_dict(),
            "tree": root_node.dict_for_viz(),
            "candidates": candidates,
        }

    def _alphabeta(self, board: chess.Board, depth: int, alpha: float, beta: float, maximizing_player: bool, current_node: TreeNode, move_path: Optional[list[str]] = None) -> Tuple[float, Optional[chess.Move]]:
        move_path = move_path or []
        self.instrumentation.record_visit(depth)
        if depth == 0 or board.is_game_over():
            self.instrumentation.record_leaf(depth)
            val = self.evaluate_board(board)
            current_node.value = val
            return val, None

        best_move = None
        ordered_moves = self.order_moves(board, board.legal_moves)
        self.instrumentation.record_children(depth, len(ordered_moves))
        
        if maximizing_player:
            max_eval = -float('inf')
            
            for move in ordered_moves:
                child_node = TreeNode(
                    id=str(uuid.uuid4()), 
                    name=board.san(move), 
                    node_type="max", 
                )

                board.push(move)
                next_move_path = [*move_path, move.uci()]
                child_node.metadata = {"alpha": alpha, "beta": beta, "fen": board.fen(), "move_path": next_move_path, "depth_remaining": depth - 1}
                current_node.children.append(child_node)

                eval_val, _ = self._alphabeta(board, depth - 1, alpha, beta, False, child_node, next_move_path)
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
                        metadata={"reason": f"beta {beta} <= alpha {alpha}", "fen": board.fen(), "move_path": move_path, "depth_remaining": depth}
                    )
                    current_node.children.append(pruned_node)
                    self.instrumentation.record_cutoff()
                    break
                    
            current_node.value = max_eval
            return max_eval, best_move
            
        else: # Minimizing player
            min_eval = float('inf')
            
            for move in ordered_moves:
                child_node = TreeNode(
                    id=str(uuid.uuid4()), 
                    name=board.san(move), 
                    node_type="min", 
                )

                board.push(move)
                next_move_path = [*move_path, move.uci()]
                child_node.metadata = {"alpha": alpha, "beta": beta, "fen": board.fen(), "move_path": next_move_path, "depth_remaining": depth - 1}
                current_node.children.append(child_node)

                eval_val, _ = self._alphabeta(board, depth - 1, alpha, beta, True, child_node, next_move_path)
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
                        metadata={"reason": f"beta {beta} <= alpha {alpha}", "fen": board.fen(), "move_path": move_path, "depth_remaining": depth}
                    )
                    current_node.children.append(pruned_node)
                    self.instrumentation.record_cutoff()
                    break
                    
            current_node.value = min_eval
            return min_eval, best_move
