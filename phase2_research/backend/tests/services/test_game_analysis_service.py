import asyncio
import chess

from app.services.game_analysis_service import analyze_full_game, board_to_white_cp


def test_board_to_white_cp_handles_terminal_checkmate_for_black_mate():
    board = chess.Board()
    for san in ["f3", "e5", "g4", "Qh4#"]:
        board.push_san(san)

    assert board.is_checkmate()
    assert board.turn == chess.WHITE
    assert board_to_white_cp(board) == -10000


def test_fools_mate_checkmating_move_is_not_marked_as_blunder():
    pgn = """
[Event "Bad Moves Test"]
[Site "Local"]
[Date "2026.06.04"]
[Round "-"]
[White "Test White"]
[Black "Test Black"]
[Result "0-1"]

1. f3 e5 2. g4 Qh4# 0-1
"""

    result = asyncio.run(analyze_full_game(pgn))
    qh4 = result["moves"][-1]

    assert qh4["san"] == "Qh4#"
    assert qh4["color"] == "black"
    assert qh4["eval_cp"] == -10000
    assert qh4["judgment"] == "Best"
    assert qh4["accuracy"] == 100.0
