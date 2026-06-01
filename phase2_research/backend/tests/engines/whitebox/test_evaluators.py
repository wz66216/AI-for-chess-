import chess

from app.engines.whitebox.evaluators import (
    MaterialEvaluator,
    HeuristicEvaluator,
    PstEvaluator,
    available_evaluator_names,
    build_evaluator,
)


def test_available_evaluator_names_and_builder_mapping():
    assert available_evaluator_names() == ("material", "pst", "heuristic")
    assert build_evaluator("material").name == "material"
    assert build_evaluator("pst").name == "pst"
    assert build_evaluator("heuristic").name == "heuristic"


def test_material_evaluator_returns_zero_for_start_position():
    board = chess.Board()

    assert MaterialEvaluator().evaluate(board) == 0.0


def test_material_evaluator_rewards_extra_white_queen():
    board = chess.Board("4k3/8/8/8/8/8/8/Q3K3 w - - 0 1")

    assert MaterialEvaluator().evaluate(board) == 900.0


def test_material_evaluator_handles_checkmate_and_draw_states():
    mate_board = chess.Board("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1")
    draw_board = chess.Board("8/8/8/8/8/8/2k5/3K4 w - - 0 1")
    evaluator = MaterialEvaluator()

    assert evaluator.evaluate(mate_board) == 99999.0
    assert evaluator.evaluate(draw_board) == 0.0


def test_pst_evaluator_preserves_terminal_semantics():
    mate_board = chess.Board("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1")
    draw_board = chess.Board("8/8/8/8/8/8/2k5/3K4 w - - 0 1")
    evaluator = PstEvaluator()

    assert evaluator.evaluate(mate_board) == 99999.0
    assert evaluator.evaluate(draw_board) == 0.0


def test_heuristic_evaluator_preserves_terminal_semantics():
    mate_board = chess.Board("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1")
    draw_board = chess.Board("8/8/8/8/8/8/2k5/3K4 w - - 0 1")
    evaluator = HeuristicEvaluator()

    assert evaluator.evaluate(mate_board) == 99999.0
    assert evaluator.evaluate(draw_board) == 0.0


def test_pst_evaluator_prefers_central_knight_over_corner_knight():
    central = chess.Board("4k3/8/8/8/3N4/8/8/P3K3 w - - 0 1")
    corner = chess.Board("4k3/8/8/8/8/8/8/N3K2P w - - 0 1")

    assert build_evaluator("pst").evaluate(central) > build_evaluator("pst").evaluate(corner)


def test_heuristic_evaluator_prefers_castled_development_over_start_position():
    active_board = chess.Board("rnbq1rk1/pppp1ppp/5n2/4p3/3PP3/5N2/PPP2PPP/RNBQ1RK1 w - - 0 6")
    passive_board = chess.Board("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")

    assert build_evaluator("heuristic").evaluate(active_board) > build_evaluator("heuristic").evaluate(passive_board)
