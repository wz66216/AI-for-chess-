import json
from typing import Any

from pydantic import ValidationError

from app.schemas.analysis import (
    AnalysisDepth,
    AnalysisValidation,
    AudienceLevel,
    GameReviewAnalysis,
    GameReviewMoment,
    GameReviewResponse,
    ValidationStatus,
)
from app.services.llm_service import LLMService


SEVERE_JUDGMENT_RANK = {
    "Blunder": 5,
    "Mistake": 4,
    "Inaccuracy": 3,
    "Good": 2,
    "Excellent": 1,
    "Best": 0,
    "Book": 0,
}


class GameReviewAgent:
    def __init__(self, llm_service: LLMService | Any | None = None):
        self.llm_service = llm_service or LLMService()

    async def review(
        self,
        game_analysis: dict[str, Any],
        audience_level: AudienceLevel,
        analysis_depth: AnalysisDepth,
    ) -> GameReviewResponse:
        facts = self._build_review_facts(game_analysis)
        prompt = self._build_prompt(facts, audience_level, analysis_depth)
        raw_text = await self._safe_complete(prompt)
        review = self._parse_review(raw_text)
        validation = AnalysisValidation(status=ValidationStatus.OK, warnings=[])

        if review is None:
            review = self._fallback_review(facts)
            validation = AnalysisValidation(
                status=ValidationStatus.FALLBACK,
                warnings=["LLM output was not valid game review JSON"],
            )

        return GameReviewResponse(
            game_analysis=game_analysis,
            review=review,
            validation=validation,
        )

    def _build_review_facts(self, game_analysis: dict[str, Any]) -> dict[str, Any]:
        moves = list(game_analysis.get("moves", []))
        selected = self._select_turning_points(moves)
        return {
            "headers": game_analysis.get("headers", {}),
            "global_accuracy": game_analysis.get("global_accuracy", {}),
            "judgments": game_analysis.get("judgments", {}),
            "move_count": len(moves),
            "turning_point_candidates": selected,
        }

    def _select_turning_points(self, moves: list[dict[str, Any]]) -> list[dict[str, Any]]:
        indexed_moves = [
            {
                "move_index": index,
                "move_number": move.get("move_number", (index // 2) + 1),
                "color": move.get("color", "white"),
                "san": move.get("san", ""),
                "judgment": move.get("judgment", ""),
                "eval_cp": move.get("eval_cp", 0),
                "win_diff": move.get("win_diff", 0.0),
                "accuracy": move.get("accuracy", 0.0),
            }
            for index, move in enumerate(moves)
        ]
        severe = [
            move
            for move in indexed_moves
            if SEVERE_JUDGMENT_RANK.get(str(move["judgment"]), 0) >= 3
        ]
        ranked = sorted(
            severe or indexed_moves,
            key=lambda move: (
                SEVERE_JUDGMENT_RANK.get(str(move["judgment"]), 0),
                abs(float(move.get("win_diff", 0.0))),
            ),
            reverse=True,
        )
        return ranked[:6]

    def _build_prompt(
        self,
        facts: dict[str, Any],
        audience_level: AudienceLevel,
        analysis_depth: AnalysisDepth,
    ) -> str:
        return f"""
你是 ChessExplain 的整盘复盘教练。请基于 Stockfish 已计算出的事实做中文复盘。
只返回合法 JSON，不要使用 Markdown 代码块，不要输出 JSON 之外的文字。

讲解对象水平: {audience_level.value}
复盘深度: {analysis_depth.value}

整盘事实:
{json.dumps(facts, ensure_ascii=False)}

规则:
- 所有解释文字必须用中文。
- JSON 字段名必须保持英文。
- 不要编造棋谱中不存在的招法。
- turning_points 只能来自 turning_point_candidates。
- eval_cp 是白方视角，正数白方好，负数黑方好。
- 用“关键转折点”解释胜率/评价变化，不要逐手流水账。

必须返回的 JSON 形状:
{{
  "overall_summary": "整盘中文总评",
  "white_summary": "白方表现总结",
  "black_summary": "黑方表现总结",
  "turning_points": [
    {{
      "move_index": 0,
      "move_number": 1,
      "color": "white",
      "san": "e4",
      "judgment": "Good",
      "eval_cp": 20,
      "win_diff": 0.0,
      "why": "为什么这是转折点"
    }}
  ],
  "critical_moment": null,
  "training_plan": ["训练建议一", "训练建议二"],
  "summary_markdown": "中文 Markdown 复盘"
}}
""".strip()

    async def _safe_complete(self, prompt: str) -> str:
        try:
            return await self.llm_service.complete_json(prompt)
        except Exception as exc:
            return json.dumps({"error": str(exc)})

    def _parse_review(self, text: str) -> GameReviewAnalysis | None:
        try:
            payload = self._load_json_object(text)
            normalized = self._normalize_payload(payload)
            return GameReviewAnalysis.model_validate(normalized)
        except (ValidationError, ValueError, TypeError, json.JSONDecodeError):
            return None

    def _load_json_object(self, text: str) -> dict[str, Any]:
        stripped = text.strip()
        if stripped.startswith("```"):
            lines = stripped.splitlines()
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            stripped = "\n".join(lines).strip()

        try:
            payload = json.loads(stripped)
        except json.JSONDecodeError:
            start = stripped.find("{")
            end = stripped.rfind("}")
            if start == -1 or end == -1 or end <= start:
                raise
            payload = json.loads(stripped[start : end + 1])

        if not isinstance(payload, dict):
            raise ValueError("game review JSON must be an object")
        return payload

    def _normalize_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        normalized = dict(payload)
        normalized.setdefault("overall_summary", normalized.get("summary", ""))
        normalized.setdefault("white_summary", normalized.get("white", ""))
        normalized.setdefault("black_summary", normalized.get("black", ""))
        normalized.setdefault("turning_points", normalized.get("key_moments", []))
        normalized.setdefault("training_plan", normalized.get("training_tips", []))
        normalized.setdefault(
            "summary_markdown",
            normalized.get("markdown") or normalized.get("overall_summary") or "",
        )

        if isinstance(normalized["training_plan"], str):
            normalized["training_plan"] = [normalized["training_plan"]]

        normalized["turning_points"] = [
            self._normalize_moment(moment)
            for moment in normalized.get("turning_points", [])
            if isinstance(moment, dict)
        ]

        critical = normalized.get("critical_moment")
        if isinstance(critical, dict):
            normalized["critical_moment"] = self._normalize_moment(critical)
        elif normalized["turning_points"]:
            normalized["critical_moment"] = normalized["turning_points"][0]
        else:
            normalized["critical_moment"] = None

        return normalized

    def _normalize_moment(self, moment: dict[str, Any]) -> dict[str, Any]:
        normalized = dict(moment)
        normalized.setdefault("move_index", 0)
        normalized.setdefault("move_number", 1)
        normalized.setdefault("color", "white")
        normalized.setdefault("san", "")
        normalized.setdefault("judgment", "")
        normalized.setdefault("eval_cp", 0)
        normalized.setdefault("win_diff", 0.0)
        normalized.setdefault("why", normalized.get("reason", ""))
        return normalized

    def _fallback_review(self, facts: dict[str, Any]) -> GameReviewAnalysis:
        moments = [
            GameReviewMoment(
                move_index=moment.get("move_index", 0),
                move_number=moment.get("move_number", 1),
                color=moment.get("color", "white"),
                san=moment.get("san", ""),
                judgment=moment.get("judgment", ""),
                eval_cp=moment.get("eval_cp", 0),
                win_diff=moment.get("win_diff", 0.0),
                why="这是引擎标记出的主要评价波动点，建议从这里开始复盘。",
            )
            for moment in facts.get("turning_point_candidates", [])
        ]
        accuracy = facts.get("global_accuracy", {})
        white_acc = accuracy.get("white", 0)
        black_acc = accuracy.get("black", 0)
        summary = f"模型整盘复盘不可用。引擎显示白方准确度 {white_acc}%，黑方准确度 {black_acc}%。"
        return GameReviewAnalysis(
            overall_summary=summary,
            white_summary=f"白方准确度 {white_acc}%，重点检查低准确率或评价明显下降的招法。",
            black_summary=f"黑方准确度 {black_acc}%，重点检查低准确率或评价明显下降的招法。",
            turning_points=moments,
            critical_moment=moments[0] if moments else None,
            training_plan=["先复盘漏着和失误，再比较关键转折点前后的引擎评价。"],
            summary_markdown=summary,
        )
