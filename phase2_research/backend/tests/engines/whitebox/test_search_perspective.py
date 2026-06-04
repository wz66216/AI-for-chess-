import chess

from app.engines.whitebox.mcts import MCTSEngine, MCTSNode
from app.engines.whitebox.minimax import AlphaBetaEngine


class MoveValueEvaluator:
    name = "move-value"

    def __init__(self, values: dict[str, float]):
        self.values = values

    def evaluate(self, board: chess.Board) -> float:
        return self.values.get(board.peek().uci(), 0.0)


def test_alphabeta_white_candidates_prefer_larger_white_score():
    board = chess.Board("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1")
    evaluator = MoveValueEvaluator({"e2e3": -5.0, "e2e4": 2.0})

    result = AlphaBetaEngine(depth=1, use_move_ordering=False, evaluator=evaluator).search(board)

    assert result["best_move"] == "e2e4"
    assert result["evaluation"] == 2.0
    assert result["candidates"][0]["move"] == "e4"
    assert result["candidates"][0]["evaluation"] == 2.0


def test_alphabeta_black_candidates_prefer_smaller_white_score():
    board = chess.Board("4k3/4p3/8/8/8/8/8/4K3 b - - 0 1")
    evaluator = MoveValueEvaluator({"e7e6": 5.0, "e7e5": -2.0})

    result = AlphaBetaEngine(depth=1, use_move_ordering=False, evaluator=evaluator).search(board)

    assert result["best_move"] == "e7e5"
    assert result["evaluation"] == -2.0
    assert result["candidates"][0]["move"] == "e5"
    assert result["candidates"][0]["evaluation"] == -2.0


def test_mcts_backpropagates_in_white_perspective_without_flipping():
    engine = MCTSEngine()
    root = MCTSNode(state=chess.Board().fen())
    child = MCTSNode(state=chess.Board().fen(), parent=root, move=chess.Move.from_uci("e2e4"))

    engine._backpropagate(child, 1.0)

    assert root.wins == 1.0
    assert child.wins == 1.0
    assert engine._white_evaluation(child) == 1.0


def test_mcts_root_ranking_uses_side_to_move_with_white_scores():
    engine = MCTSEngine()
    better_for_white = MCTSNode(state=chess.Board().fen())
    better_for_black = MCTSNode(state=chess.Board().fen())
    better_for_white.visits = better_for_black.visits = 10
    better_for_white.wins = 8.0
    better_for_black.wins = 2.0

    white_ranking = engine._rank_children_for_turn([better_for_black, better_for_white], chess.WHITE)
    black_ranking = engine._rank_children_for_turn([better_for_black, better_for_white], chess.BLACK)

    assert white_ranking[0] is better_for_white
    assert black_ranking[0] is better_for_black


def test_mcts_uses_heuristic_reward_for_non_terminal_rollout_cutoffs():
    board = chess.Board("k7/8/8/8/8/8/4Q3/4K3 w - - 0 1")
    engine = MCTSEngine(iterations=1, max_rollout_depth=0)

    result = engine.search(board)

    assert result["evaluation"] > 0.0
    assert result["candidates"][0]["evaluation"] > 0.0
