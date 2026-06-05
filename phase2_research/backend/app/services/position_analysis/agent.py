import json
from typing import Any

from pydantic import ValidationError

from app.schemas.analysis import (
    AnalysisDepth,
    AnalysisMode,
    AudienceLevel,
    EngineEvaluation,
    PositionAnalysisResponse,
    StructuredAnalysis,
    ValidationStatus,
)
from app.services.llm_service import LLMService
from app.services.position_analysis.facts_builder import PositionFactsBuilder
from app.services.position_analysis.grounding_validator import GroundingValidator
from app.services.position_analysis.prompts import build_draft_prompt, build_repair_prompt


class PositionAnalysisAgent:
    def __init__(
        self,
        llm_service: LLMService | Any | None = None,
        facts_builder: PositionFactsBuilder | None = None,
        validator: GroundingValidator | None = None,
    ):
        self.llm_service = llm_service or LLMService()
        self.facts_builder = facts_builder or PositionFactsBuilder()
        self.validator = validator or GroundingValidator()

    async def analyze(
        self,
        fen: str,
        engine_eval: EngineEvaluation,
        played_move: str | None,
        analysis_mode: AnalysisMode,
        audience_level: AudienceLevel,
        analysis_depth: AnalysisDepth,
    ) -> PositionAnalysisResponse:
        try:
            facts = self.facts_builder.build(
                fen=fen,
                played_move=played_move,
                engine_eval=engine_eval,
            )
        except ValueError as exc:
            facts = self.facts_builder.build(fen=fen, engine_eval=engine_eval)
            return self.validator.fallback(
                facts=facts,
                engine_eval=engine_eval,
                warnings=[str(exc)],
                fen=fen,
                played_move=played_move,
            )

        facts_json = facts.model_dump_json()
        engine_json = engine_eval.model_dump_json()
        draft_text = await self._safe_complete(
            build_draft_prompt(
                facts_json=facts_json,
                engine_json=engine_json,
                analysis_mode=analysis_mode,
                audience_level=audience_level,
                analysis_depth=analysis_depth,
            )
        )
        analysis = self._parse_analysis(draft_text)
        if analysis is None:
            return await self._repair_or_fallback(
                facts=facts,
                engine_eval=engine_eval,
                fen=fen,
                played_move=played_move,
                original_output=draft_text,
                warnings=["LLM output was not valid structured analysis JSON"],
            )

        validation = self.validator.validate(analysis, facts, engine_eval)
        if validation.status == ValidationStatus.OK:
            return PositionAnalysisResponse(
                fen=fen,
                played_move=played_move,
                engine_eval=engine_eval,
                facts=facts,
                analysis=analysis,
                validation=validation,
            )

        return await self._repair_or_fallback(
            facts=facts,
            engine_eval=engine_eval,
            fen=fen,
            played_move=played_move,
            original_output=draft_text,
            warnings=validation.warnings,
        )

    async def _repair_or_fallback(
        self,
        facts: Any,
        engine_eval: EngineEvaluation,
        fen: str,
        played_move: str | None,
        original_output: str,
        warnings: list[str],
    ) -> PositionAnalysisResponse:
        repair_text = await self._safe_complete(
            build_repair_prompt(
                facts_json=facts.model_dump_json(),
                engine_json=engine_eval.model_dump_json(),
                original_output=original_output,
                warnings=warnings,
            )
        )
        repaired = self._parse_analysis(repair_text)
        if repaired is None:
            return self.validator.fallback(facts, engine_eval, warnings, fen, played_move)

        validation = self.validator.validate(repaired, facts, engine_eval)
        if validation.status != ValidationStatus.OK:
            return self.validator.fallback(
                facts,
                engine_eval,
                validation.warnings,
                fen,
                played_move,
            )

        validation.status = ValidationStatus.REPAIRED
        return PositionAnalysisResponse(
            fen=fen,
            played_move=played_move,
            engine_eval=engine_eval,
            facts=facts,
            analysis=repaired,
            validation=validation,
        )

    async def _safe_complete(self, prompt: str) -> str:
        try:
            return await self.llm_service.complete_json(prompt)
        except Exception as exc:
            return json.dumps({"error": str(exc)})

    def _parse_analysis(self, text: str) -> StructuredAnalysis | None:
        try:
            return StructuredAnalysis.model_validate_json(text)
        except (ValidationError, ValueError, TypeError):
            pass

        try:
            payload = self._load_json_object(text)
            normalized = self._normalize_payload(payload)
            return StructuredAnalysis.model_validate(normalized)
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
            raise ValueError("analysis JSON must be an object")
        return payload

    def _normalize_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        normalized = dict(payload)

        candidate_moves = normalized.get("candidate_moves")
        if isinstance(candidate_moves, list):
            normalized_candidates: list[Any] = []
            for index, candidate in enumerate(candidate_moves, start=1):
                if not isinstance(candidate, dict):
                    normalized_candidates.append(candidate)
                    continue
                normalized_candidate = dict(candidate)
                if "idea" not in normalized_candidate:
                    for idea_key in ("description", "reason", "rationale", "comment"):
                        if idea_key in normalized_candidate:
                            normalized_candidate["idea"] = normalized_candidate[idea_key]
                            break
                normalized_candidate.setdefault("rank", index)
                normalized_candidate.setdefault("pv", [])
                normalized_candidates.append(normalized_candidate)
            normalized["candidate_moves"] = normalized_candidates

        plans = normalized.get("plans")
        if isinstance(plans, dict):
            normalized_plans = dict(plans)
            if "white" not in normalized_plans and "for_white" in normalized_plans:
                normalized_plans["white"] = normalized_plans.pop("for_white")
            if "black" not in normalized_plans and "for_black" in normalized_plans:
                normalized_plans["black"] = normalized_plans.pop("for_black")
            for color in ("white", "black"):
                value = normalized_plans.get(color)
                if isinstance(value, str):
                    normalized_plans[color] = [value]
            normalized["plans"] = normalized_plans
        else:
            normalized["plans"] = {
                "white": self._coerce_list(
                    normalized.get("white_plan") or normalized.get("plan_for_white")
                ),
                "black": self._coerce_list(
                    normalized.get("black_plan") or normalized.get("plan_for_black")
                ),
            }

        move_commentary = normalized.get("move_commentary")
        if not isinstance(move_commentary, dict):
            move_commentary = {}
        else:
            move_commentary = dict(move_commentary)
        if "comment" not in move_commentary:
            for comment_key in ("description", "reason", "summary"):
                if comment_key in move_commentary:
                    move_commentary["comment"] = move_commentary[comment_key]
                    break
        move_commentary.setdefault("comment", normalized.get("position_summary", ""))
        move_commentary["quality"] = self._normalize_quality(
            move_commentary.get("quality") or move_commentary.get("move_quality")
        )
        normalized["move_commentary"] = move_commentary

        normalized.setdefault("tactical_themes", [])
        normalized.setdefault("training_tip", "")
        normalized.setdefault(
            "summary_markdown",
            normalized.get("summary") or normalized.get("position_summary") or "",
        )

        return normalized

    def _coerce_list(self, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item) for item in value]
        return [str(value)]

    def _normalize_quality(self, value: Any) -> str:
        quality = str(value or "unknown").strip().lower()
        quality_map = {
            "最佳": "best",
            "最佳着法": "best",
            "最佳招法": "best",
            "best move": "best",
            "极佳": "excellent",
            "优秀": "excellent",
            "excellent move": "excellent",
            "好棋": "good",
            "合理": "good",
            "不错": "good",
            "good move": "good",
            "缓着": "inaccuracy",
            "轻微失误": "inaccuracy",
            "inaccurate": "inaccuracy",
            "失误": "mistake",
            "错误": "mistake",
            "mistake move": "mistake",
            "漏着": "blunder",
            "大漏": "blunder",
            "blunder move": "blunder",
            "未知": "unknown",
        }
        return quality_map.get(quality, quality)
