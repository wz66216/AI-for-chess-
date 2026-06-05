from app.schemas.analysis import (
    AnalysisValidation,
    EngineEvaluation,
    PositionAnalysisResponse,
    PositionFacts,
    StructuredAnalysis,
    ValidationStatus,
)


class GroundingValidator:
    def validate(
        self,
        analysis: StructuredAnalysis,
        facts: PositionFacts,
        engine_eval: EngineEvaluation,
    ) -> AnalysisValidation:
        warnings: list[str] = []
        engine_candidates = set(facts.engine_candidate_moves)
        engine_pv = set(facts.engine_pv_moves)

        for candidate in analysis.candidate_moves:
            if candidate.move not in engine_candidates:
                warnings.append(
                    f"candidate move {candidate.move} is not in engine candidates"
                )
            for pv_move in candidate.pv:
                if pv_move not in engine_pv:
                    warnings.append(f"pv move {pv_move} is not in engine PV")

        summary_text = analysis.position_summary.lower()
        if facts.is_mate and "mate" not in summary_text and "杀" not in summary_text:
            warnings.append("mate fact is missing from position summary")

        return AnalysisValidation(
            status=ValidationStatus.OK if not warnings else ValidationStatus.FALLBACK,
            warnings=warnings,
        )

    def fallback(
        self,
        facts: PositionFacts,
        engine_eval: EngineEvaluation,
        warnings: list[str],
        fen: str = "",
        played_move: str | None = None,
    ) -> PositionAnalysisResponse:
        candidate_moves = [
            {
                "move": line.best_move,
                "rank": index + 1,
                "score": line.score,
                "idea": "Engine candidate line.",
                "pv": line.pv,
            }
            for index, line in enumerate(engine_eval.lines)
        ]
        first = engine_eval.lines[0] if engine_eval.lines else None
        position_summary = (
            f"引擎一选是 {first.best_move}，评分 {first.score:+.2f}。"
            if first
            else "当前没有可用的引擎候选招法。"
        )

        return PositionAnalysisResponse(
            fen=fen,
            played_move=played_move,
            engine_eval=engine_eval,
            facts=facts,
            analysis={
                "position_summary": position_summary,
                "candidate_moves": candidate_moves,
                "tactical_themes": [],
                "plans": {"white": [], "black": []},
                "move_commentary": {
                    "played_move": facts.played_move_san,
                    "quality": "unknown",
                    "comment": "模型解释不可用，已返回保守的引擎事实。",
                },
                "training_tip": "优先比较引擎候选招法和主要变例。",
                "summary_markdown": "模型解释不可用，以下为基于 Stockfish 的保守事实摘要。",
            },
            validation={
                "status": ValidationStatus.FALLBACK,
                "warnings": warnings,
            },
        )
