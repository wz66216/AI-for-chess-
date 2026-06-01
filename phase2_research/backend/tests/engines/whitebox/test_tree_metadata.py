import random

import chess

from app.engines.whitebox.minimax import AlphaBetaEngine
from app.engines.whitebox.mcts import MCTSEngine


def _first_real_child(tree: dict) -> dict:
    for child in tree.get("children", []):
        if not child.get("is_pruned"):
            return child
    raise AssertionError("expected at least one non-pruned child")


def test_alphabeta_tree_nodes_include_fen_and_move_path_metadata():
    board = chess.Board()

    result = AlphaBetaEngine(depth=1).search(board)
    root = result["tree"]

    assert root["metadata"]["fen"] == board.fen()
    assert root["metadata"]["move_path"] == []

    child = _first_real_child(root)
    child_board = chess.Board(child["metadata"]["fen"])

    assert child["metadata"]["move_path"] == [child["name"]]
    assert child_board.is_valid()


def test_mcts_tree_nodes_include_fen_and_move_path_metadata():
    random.seed(0)
    board = chess.Board()

    result = MCTSEngine(iterations=5).search(board)
    root = result["tree"]

    assert root["metadata"]["fen"] == board.fen()
    assert root["metadata"]["move_path"] == []

    child = _first_real_child(root)
    child_board = chess.Board(child["metadata"]["fen"])

    assert child["metadata"]["move_path"] == [child["name"]]
    assert child_board.is_valid()
