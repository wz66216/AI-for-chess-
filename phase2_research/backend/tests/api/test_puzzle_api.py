from app.api.puzzle import prepare_lichess_puzzle, uci_solution_to_san


def test_uci_solution_to_san_converts_legal_line():
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

    assert uci_solution_to_san(fen, ["e2e4", "e7e5"]) == ["e4", "e5"]


def test_uci_solution_to_san_preserves_invalid_fallback():
    fen = "8/8/8/8/8/8/8/K6k w - - 0 1"

    assert uci_solution_to_san(fen, ["e2e4"]) == ["e2e4"]


def test_prepare_lichess_puzzle_applies_setup_move_and_trims_solution():
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

    playable_fen, solution = prepare_lichess_puzzle(
        fen,
        ["e2e4", "e7e5", "g1f3"],
    )

    assert playable_fen == (
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    )
    assert solution == ["e5", "Nf3"]
