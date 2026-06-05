import asyncio
import json

from app.schemas.analysis import AnalysisDepth, AudienceLevel, ValidationStatus
from app.services.game_review_agent import GameReviewAgent


class FakeLLM:
    def __init__(self, output: str):
        self.output = output
        self.calls: list[str] = []

    async def complete_json(self, prompt: str, system_prompt: str | None = None) -> str:
        self.calls.append(prompt)
        return self.output


def sample_game_analysis():
    return {
        "headers": {"White": "Alice", "Black": "Bob", "Result": "1-0"},
        "global_accuracy": {"white": 82.4, "black": 71.2},
        "judgments": {
            "white": {"Best": 1, "Excellent": 0, "Good": 1, "Inaccuracy": 0, "Mistake": 0, "Blunder": 0, "Book": 0},
            "black": {"Best": 0, "Excellent": 0, "Good": 1, "Inaccuracy": 0, "Mistake": 1, "Blunder": 0, "Book": 0},
        },
        "moves": [
            {
                "move_number": 1,
                "color": "white",
                "san": "e4",
                "uci": "e2e4",
                "fen": "fen1",
                "eval_cp": 20,
                "win_percent": 52.0,
                "player_win_percent": 52.0,
                "win_diff": 0.1,
                "accuracy": 99.0,
                "judgment": "Good",
            },
            {
                "move_number": 1,
                "color": "black",
                "san": "Qh4",
                "uci": "d8h4",
                "fen": "fen2",
                "eval_cp": 180,
                "win_percent": 68.0,
                "player_win_percent": 32.0,
                "win_diff": 18.0,
                "accuracy": 35.0,
                "judgment": "Mistake",
            },
        ],
    }


def run_review(output: str):
    return asyncio.run(
        GameReviewAgent(FakeLLM(output)).review(
            sample_game_analysis(),
            AudienceLevel.INTERMEDIATE,
            AnalysisDepth.STANDARD,
        )
    )


def test_game_review_agent_returns_structured_review():
    output = json.dumps(
        {
            "overall_summary": "白方整体更稳定。",
            "white_summary": "白方失误较少。",
            "black_summary": "黑方在 Qh4 出现问题。",
            "turning_points": [
                {
                    "move_index": 1,
                    "move_number": 1,
                    "color": "black",
                    "san": "Qh4",
                    "judgment": "Mistake",
                    "eval_cp": 180,
                    "win_diff": 18.0,
                    "why": "黑方过早出后导致节奏落后。",
                }
            ],
            "critical_moment": None,
            "training_plan": ["复盘出后时机。"],
            "summary_markdown": "白方整体更稳定。",
        },
        ensure_ascii=False,
    )

    result = run_review(output)

    assert result.validation.status == ValidationStatus.OK
    assert result.review.critical_moment.san == "Qh4"
    assert result.review.training_plan == ["复盘出后时机。"]


def test_game_review_agent_normalizes_schema_drift():
    output = json.dumps(
        {
            "summary": "白方更稳定。",
            "white": "白方控制局面。",
            "black": "黑方需要减少失误。",
            "key_moments": [
                {
                    "move_index": 1,
                    "move_number": 1,
                    "color": "black",
                    "san": "Qh4",
                    "judgment": "Mistake",
                    "eval_cp": 180,
                    "win_diff": 18.0,
                    "reason": "过早出后。",
                }
            ],
            "training_tips": "先检查关键转折点。",
        },
        ensure_ascii=False,
    )

    result = run_review(output)

    assert result.validation.status == ValidationStatus.OK
    assert result.review.turning_points[0].why == "过早出后。"
    assert result.review.training_plan == ["先检查关键转折点。"]


def test_game_review_agent_falls_back_on_invalid_json():
    result = run_review("not-json")

    assert result.validation.status == ValidationStatus.FALLBACK
    assert result.review.turning_points[0].san == "Qh4"
