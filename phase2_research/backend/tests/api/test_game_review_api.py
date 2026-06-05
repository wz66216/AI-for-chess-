from fastapi.testclient import TestClient

from app.api import analysis
from app.main import app
from app.schemas.analysis import (
    AnalysisValidation,
    GameReviewAnalysis,
    GameReviewMoment,
    GameReviewResponse,
)


client = TestClient(app)


class FakeReviewAgent:
    async def review(self, game_analysis, audience_level, analysis_depth):
        return GameReviewResponse(
            game_analysis=game_analysis,
            review=GameReviewAnalysis(
                overall_summary="白方整体更稳定。",
                white_summary="白方少犯错。",
                black_summary="黑方有一次明显失误。",
                turning_points=[
                    GameReviewMoment(
                        move_index=1,
                        move_number=1,
                        color="black",
                        san="Qh4",
                        judgment="Mistake",
                        eval_cp=180,
                        win_diff=18.0,
                        why="黑方过早出后。",
                    )
                ],
                critical_moment=None,
                training_plan=["复盘出后时机。"],
                summary_markdown="白方整体更稳定。",
            ),
            validation=AnalysisValidation(status="ok", warnings=[]),
        )


async def fake_analyze_full_game(pgn: str):
    return {
        "headers": {"White": "Alice", "Black": "Bob"},
        "global_accuracy": {"white": 82.4, "black": 71.2},
        "judgments": {"white": {}, "black": {}},
        "moves": [],
    }


def setup_function():
    app.dependency_overrides[analysis.get_game_review_agent] = lambda: FakeReviewAgent()


def teardown_function():
    app.dependency_overrides.clear()


def test_review_game_returns_ai_review(monkeypatch):
    monkeypatch.setattr(analysis, "analyze_full_game", fake_analyze_full_game)

    response = client.post(
        "/api/v1/review-game",
        json={
            "pgn": "1. e4 e5 2. Nf3 Nc6",
            "audience_level": "intermediate",
            "analysis_depth": "standard",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["validation"]["status"] == "ok"
    assert payload["review"]["overall_summary"] == "白方整体更稳定。"
    assert payload["game_analysis"]["global_accuracy"]["white"] == 82.4
