import chess
import chess.engine


def test_stockfish_scores_are_reported_from_white_perspective(monkeypatch):
    from app.services import engine_service

    captured_board_turns = []

    class FakeEngine:
        def analyse(self, board, limit, multipv):
            captured_board_turns.append(board.turn)
            score = chess.engine.PovScore(chess.engine.Cp(123), chess.BLACK)
            return [{"score": score, "pv": []}]

        def quit(self):
            pass

    monkeypatch.setattr(
        chess.engine.SimpleEngine,
        "popen_uci",
        lambda _path: FakeEngine(),
    )
    monkeypatch.setattr(engine_service, "_find_stockfish", lambda: "stockfish")

    service = engine_service.EngineService()
    result = service._analyze_sync("8/8/8/8/8/8/8/4K2k b - - 0 1")

    assert captured_board_turns == [chess.BLACK]
    assert result.lines[0].score == -1.23


def test_stockfish_mate_scores_are_reported_from_white_perspective(monkeypatch):
    from app.services import engine_service

    class FakeEngine:
        def analyse(self, board, limit, multipv):
            score = chess.engine.PovScore(chess.engine.Mate(2), chess.BLACK)
            return [{"score": score, "pv": []}]

        def quit(self):
            pass

    monkeypatch.setattr(
        chess.engine.SimpleEngine,
        "popen_uci",
        lambda _path: FakeEngine(),
    )
    monkeypatch.setattr(engine_service, "_find_stockfish", lambda: "stockfish")

    service = engine_service.EngineService()
    result = service._analyze_sync("8/8/8/8/8/8/8/4K2k b - - 0 1")

    assert result.lines[0].is_mate is True
    assert result.lines[0].mate_score == -2
    assert result.lines[0].score == -10000.0
