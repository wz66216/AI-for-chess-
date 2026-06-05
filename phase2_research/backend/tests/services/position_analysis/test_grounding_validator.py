from app.schemas.analysis import (
    EngineEvaluation,
    MoveCommentary,
    PositionFacts,
    PVLine,
    ScoreSummary,
    StructuredAnalysis,
    ValidationStatus,
)
from app.services.position_analysis.grounding_validator import GroundingValidator


def facts() -> PositionFacts:
    return PositionFacts(
        side_to_move="white",
        played_move_san="e4",
        is_check=False,
        is_mate=False,
        is_stalemate=False,
        score_summary=ScoreSummary.WHITE_BETTER,
        legal_moves_san=["e4", "Nf3"],
        legal_moves_uci=["e2e4", "g1f3"],
        engine_candidate_moves=["e4", "Nf3"],
        engine_pv_moves=["e4", "e5", "Nf3", "d5"],
    )


def engine_eval() -> EngineEvaluation:
    return EngineEvaluation(
        lines=[
            PVLine(score=0.4, is_mate=False, best_move="e4", pv=["e4", "e5"]),
            PVLine(score=0.2, is_mate=False, best_move="Nf3", pv=["Nf3", "d5"]),
        ]
    )


def valid_analysis() -> StructuredAnalysis:
    return StructuredAnalysis(
        position_summary="White has a small initiative.",
        candidate_moves=[
            {
                "move": "e4",
                "rank": 1,
                "score": 0.4,
                "idea": "Claim the center.",
                "pv": ["e4", "e5"],
            },
            {
                "move": "Nf3",
                "rank": 2,
                "score": 0.2,
                "idea": "Develop a knight.",
                "pv": ["Nf3", "d5"],
            },
        ],
        tactical_themes=["center"],
        plans={"white": ["Develop quickly."], "black": ["Challenge the center."]},
        move_commentary=MoveCommentary(
            played_move="e4",
            quality="best",
            comment="This follows the engine's first choice.",
        ),
        training_tip="Check forcing moves before quiet development.",
        summary_markdown="White should play actively.",
    )


def test_validator_accepts_grounded_analysis():
    result = GroundingValidator().validate(valid_analysis(), facts(), engine_eval())

    assert result.status == ValidationStatus.OK
    assert result.warnings == []


def test_validator_rejects_candidate_not_from_engine_lines():
    analysis = valid_analysis()
    analysis.candidate_moves[0].move = "Qh5"

    result = GroundingValidator().validate(analysis, facts(), engine_eval())

    assert result.status == ValidationStatus.FALLBACK
    assert "candidate move Qh5 is not in engine candidates" in result.warnings


def test_fallback_uses_engine_facts_only():
    fallback = GroundingValidator().fallback(facts(), engine_eval(), ["bad json"])

    assert fallback.validation.status == ValidationStatus.FALLBACK
    assert fallback.validation.warnings == ["bad json"]
    assert fallback.analysis.candidate_moves[0].move == "e4"
    assert "模型解释不可用" in fallback.analysis.summary_markdown
