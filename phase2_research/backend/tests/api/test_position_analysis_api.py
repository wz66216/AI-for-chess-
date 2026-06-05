from fastapi.testclient import TestClient

from app.api import analysis
from app.main import app
from app.schemas.analysis import (
    AnalysisValidation,
    EngineEvaluation,
    PositionAnalysisResponse,
    PositionFacts,
    PVLine,
    ScoreSummary,
    StructuredAnalysis,
)


client = TestClient(app)


class FakeEngine:
    async def analyze_position(
        self,
        fen: str,
        move: str | None = None,
    ) -> EngineEvaluation:
        return EngineEvaluation(
            lines=[
                PVLine(score=0.4, is_mate=False, best_move="e4", pv=["e4", "e5"]),
            ]
        )


class FakeAgent:
    async def analyze(
        self,
        fen,
        engine_eval,
        played_move,
        analysis_mode,
        audience_level,
        analysis_depth,
    ):
        return PositionAnalysisResponse(
            fen=fen,
            played_move=played_move,
            engine_eval=engine_eval,
            facts=PositionFacts(
                side_to_move="white",
                played_move_san="e4" if played_move else None,
                is_check=False,
                is_mate=False,
                is_stalemate=False,
                score_summary=ScoreSummary.WHITE_BETTER,
                legal_moves_san=["e4"],
                legal_moves_uci=["e2e4"],
                engine_candidate_moves=["e4"],
                engine_pv_moves=["e4", "e5"],
            ),
            analysis=StructuredAnalysis(
                position_summary="White has a small initiative.",
                candidate_moves=[
                    {
                        "move": "e4",
                        "rank": 1,
                        "score": 0.4,
                        "idea": "Claim the center.",
                        "pv": ["e4", "e5"],
                    }
                ],
                tactical_themes=["center"],
                plans={"white": ["Develop."], "black": ["Challenge the center."]},
                move_commentary={
                    "played_move": "e4" if played_move else None,
                    "quality": "best",
                    "comment": "Strong.",
                },
                training_tip="Compare forcing moves.",
                summary_markdown="White is slightly better.",
            ),
            validation=AnalysisValidation(status="ok", warnings=[]),
        )


def setup_function():
    app.dependency_overrides[analysis.get_engine_service] = lambda: FakeEngine()
    app.dependency_overrides[analysis.get_position_analysis_agent] = lambda: FakeAgent()


def teardown_function():
    app.dependency_overrides.clear()


def test_analyze_position_returns_structured_payload():
    response = client.post(
        "/api/v1/analyze-position",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "analysis_mode": "position",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["analysis"]["position_summary"] == "White has a small initiative."
    assert payload["validation"]["status"] == "ok"


def test_analyze_move_keeps_old_explanation_field():
    response = client.post(
        "/api/v1/analyze-move",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "move": "e2e4",
            "audience_level": "beginner",
            "analysis_depth": "quick",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["explanation"] == "White is slightly better."
    assert payload["analysis"]["position_summary"] == "White has a small initiative."
    assert payload["facts"]["played_move_san"] == "e4"
