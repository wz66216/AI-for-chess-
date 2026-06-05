import pytest
from pydantic import ValidationError

from app.schemas.analysis import (
    AnalysisDepth,
    AnalysisMode,
    AudienceLevel,
    PositionAnalysisRequest,
    StructuredAnalysis,
)


def test_position_analysis_request_defaults_to_position_standard_intermediate():
    request = PositionAnalysisRequest(
        fen="8/8/8/8/8/8/8/K6k w - - 0 1",
    )

    assert request.analysis_mode == AnalysisMode.POSITION
    assert request.audience_level == AudienceLevel.INTERMEDIATE
    assert request.analysis_depth == AnalysisDepth.STANDARD
    assert request.played_move is None


def test_move_mode_requires_played_move():
    with pytest.raises(ValidationError) as raised:
        PositionAnalysisRequest.model_validate(
            {
                "fen": "8/8/8/8/8/8/8/K6k w - - 0 1",
                "analysis_mode": "move",
            }
        )

    assert "played_move is required for move mode" in str(raised.value)


def test_structured_analysis_accepts_required_sections():
    analysis = StructuredAnalysis.model_validate(
        {
            "position_summary": "White is better because the king is safer.",
            "candidate_moves": [],
            "tactical_themes": ["king_safety"],
            "plans": {"white": ["Improve the king."], "black": ["Create counterplay."]},
            "move_commentary": {
                "played_move": None,
                "quality": "unknown",
                "comment": "No move was supplied.",
            },
            "training_tip": "Compare checks before quiet moves.",
            "summary_markdown": "### Summary\nWhite is better.",
        }
    )

    assert analysis.move_commentary.quality == "unknown"
