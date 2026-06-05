import asyncio
import json

from app.schemas.analysis import (
    AnalysisDepth,
    AnalysisMode,
    AudienceLevel,
    EngineEvaluation,
    PVLine,
    ValidationStatus,
)
from app.services.position_analysis.agent import PositionAnalysisAgent


class FakeLLM:
    def __init__(self, outputs: list[str]):
        self.outputs = outputs
        self.calls: list[str] = []

    async def complete_json(self, prompt: str, system_prompt: str | None = None) -> str:
        self.calls.append(prompt)
        return self.outputs.pop(0)


def engine_eval() -> EngineEvaluation:
    return EngineEvaluation(
        lines=[
            PVLine(score=0.4, is_mate=False, best_move="e4", pv=["e4", "e5"]),
            PVLine(score=0.2, is_mate=False, best_move="Nf3", pv=["Nf3", "d5"]),
        ]
    )


def valid_json() -> str:
    return json.dumps(
        {
            "position_summary": "White has a small initiative.",
            "candidate_moves": [
                {
                    "move": "e4",
                    "rank": 1,
                    "score": 0.4,
                    "idea": "Claim the center.",
                    "pv": ["e4", "e5"],
                }
            ],
            "tactical_themes": ["center"],
            "plans": {
                "white": ["Develop quickly."],
                "black": ["Challenge the center."],
            },
            "move_commentary": {
                "played_move": "e4",
                "quality": "best",
                "comment": "The move is strong.",
            },
            "training_tip": "Compare forcing moves first.",
            "summary_markdown": "White is slightly better.",
        }
    )


def run_agent(llm: FakeLLM):
    return asyncio.run(
        PositionAnalysisAgent(llm_service=llm).analyze(
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            engine_eval=engine_eval(),
            played_move="e2e4",
            analysis_mode=AnalysisMode.MOVE,
            audience_level=AudienceLevel.INTERMEDIATE,
            analysis_depth=AnalysisDepth.STANDARD,
        )
    )


def test_agent_returns_valid_structured_analysis():
    result = run_agent(FakeLLM([valid_json()]))

    assert result.validation.status == ValidationStatus.OK
    assert result.analysis.position_summary == "White has a small initiative."
    assert result.facts.played_move_san == "e4"


def test_agent_repairs_invalid_candidate_once():
    bad = valid_json().replace('"e4"', '"Qh5"', 1)
    llm = FakeLLM([bad, valid_json()])

    result = run_agent(llm)

    assert result.validation.status == ValidationStatus.REPAIRED
    assert len(llm.calls) == 2


def test_agent_normalizes_common_llm_schema_drift():
    drifted = {
        "position_summary": "White has a small initiative.",
        "candidate_moves": [
            {
                "move": "e4",
                "score": 0.4,
                "description": "Claim the center.",
                "pv": ["e4", "e5"],
            }
        ],
        "tactical_themes": ["center"],
        "plans": {
            "for_white": "Develop quickly.",
            "for_black": "Challenge the center.",
        },
        "move_commentary": {
            "played_move": "e4",
            "quality": "best",
            "comment": "The move is strong.",
        },
        "training_tip": "Compare forcing moves first.",
        "summary_markdown": "White is slightly better.",
    }

    result = run_agent(FakeLLM([json.dumps(drifted)]))

    assert result.validation.status == ValidationStatus.OK
    assert result.analysis.candidate_moves[0].rank == 1
    assert result.analysis.candidate_moves[0].idea == "Claim the center."
    assert result.analysis.plans["white"] == ["Develop quickly."]


def test_agent_normalizes_chinese_quality_and_comment_aliases():
    drifted = {
        "position_summary": "白方稍好。",
        "candidate_moves": [
            {
                "move": "e4",
                "score": 0.4,
                "reason": "抢占中心。",
                "pv": ["e4", "e5"],
            }
        ],
        "plans": {
            "for_white": "快速出子。",
            "for_black": "反击中心。",
        },
        "move_commentary": {
            "played_move": "e4",
            "quality": "好棋",
            "description": "这步棋合理。",
        },
        "summary": "白方保持主动。",
    }

    result = run_agent(FakeLLM([json.dumps(drifted, ensure_ascii=False)]))

    assert result.validation.status == ValidationStatus.OK
    assert result.analysis.move_commentary.quality == "good"
    assert result.analysis.move_commentary.comment == "这步棋合理。"
    assert result.analysis.training_tip == ""


def test_agent_falls_back_when_json_is_invalid_twice():
    result = run_agent(FakeLLM(["not-json", "still-not-json"]))

    assert result.validation.status == ValidationStatus.FALLBACK
    assert "模型解释不可用" in result.analysis.summary_markdown
