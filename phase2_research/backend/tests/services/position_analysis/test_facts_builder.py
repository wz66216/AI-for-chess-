import pytest

from app.schemas.analysis import EngineEvaluation, PVLine, ScoreSummary
from app.services.position_analysis.facts_builder import PositionFactsBuilder


def engine_eval_with_line(
    score: float = 0.4,
    is_mate: bool = False,
) -> EngineEvaluation:
    return EngineEvaluation(
        lines=[
            PVLine(
                score=score,
                is_mate=is_mate,
                mate_score=1 if is_mate else None,
                best_move="e4",
                pv=["e4", "e5", "Nf3"],
            )
        ]
    )


def test_builds_side_to_move_and_legal_moves():
    facts = PositionFactsBuilder().build(
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        engine_eval=engine_eval_with_line(),
    )

    assert facts.side_to_move == "white"
    assert "e4" in facts.legal_moves_san
    assert "e2e4" in facts.legal_moves_uci
    assert facts.score_summary == ScoreSummary.WHITE_BETTER


def test_converts_played_move_uci_to_san():
    facts = PositionFactsBuilder().build(
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        played_move="e2e4",
        engine_eval=engine_eval_with_line(),
    )

    assert facts.played_move_san == "e4"


def test_mate_score_summary_has_priority():
    facts = PositionFactsBuilder().build(
        fen="rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR b KQkq - 1 2",
        engine_eval=engine_eval_with_line(score=-100.0, is_mate=True),
    )

    assert facts.score_summary == ScoreSummary.MATE


def test_rejects_illegal_played_move():
    with pytest.raises(ValueError, match="played_move is not legal"):
        PositionFactsBuilder().build(
            fen="8/8/8/8/8/8/8/K6k w - - 0 1",
            played_move="e2e4",
            engine_eval=engine_eval_with_line(),
        )
