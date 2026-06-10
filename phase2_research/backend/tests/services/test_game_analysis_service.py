import asyncio
import chess
import chess.engine

from app.services import game_analysis_service
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


def test_analyze_full_game_uses_stockfish_discovery(monkeypatch):
    captured_paths = []

    class FakeEngine:
        def analyse(self, board, limit):
            return {
                "score": chess.engine.PovScore(chess.engine.Cp(0), chess.WHITE),
            }

        def quit(self):
            pass

    def fake_popen_uci(path):
        captured_paths.append(path)
        return FakeEngine()

    monkeypatch.setattr(game_analysis_service, "_find_stockfish", lambda: "/usr/games/stockfish")
    monkeypatch.setattr(chess.engine.SimpleEngine, "popen_uci", fake_popen_uci)

    result = asyncio.run(analyze_full_game("1. e4 *"))

    assert captured_paths == ["/usr/games/stockfish"]
    assert result["moves"][0]["san"] == "e4"
