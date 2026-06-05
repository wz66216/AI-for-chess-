# Position Analysis Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, validated `PositionAnalysisAgent` that powers move analysis now and pure position analysis soon, returning structured coach output plus markdown.

**Architecture:** Add focused backend schemas and a `services/position_analysis/` package for facts, prompts, validation, fallback, and orchestration. Keep `LLMService` as the transport layer, preserve `/api/v1/analyze-move` compatibility, add `/api/v1/analyze-position`, then lightly update the analysis page to send audience/depth preferences and render structured cards when present.

**Tech Stack:** FastAPI, Pydantic, python-chess, OpenAI-compatible async chat completions, React, TypeScript, Vitest, pytest.

**Commit Policy:** The user asked not to commit until the local website is fully changed. Each task ends with a local verification checkpoint instead of a git commit. Do not commit during plan execution unless the user explicitly asks.

---

## File Structure

Backend files:

- Create `phase2_research/backend/app/services/position_analysis/__init__.py`
  - Exports the agent and helper classes.
- Create `phase2_research/backend/app/services/position_analysis/facts_builder.py`
  - Converts FEN, played moves, and `EngineEvaluation` into hard chess facts.
- Create `phase2_research/backend/app/services/position_analysis/grounding_validator.py`
  - Validates model JSON against facts and can build a deterministic fallback.
- Create `phase2_research/backend/app/services/position_analysis/prompts.py`
  - Builds draft and repair prompts.
- Create `phase2_research/backend/app/services/position_analysis/agent.py`
  - Orchestrates draft, validation, repair, and fallback.
- Modify `phase2_research/backend/app/schemas/analysis.py`
  - Adds request/response Pydantic models and extends `AnalyzeMoveResponse` compatibly.
- Modify `phase2_research/backend/app/services/llm_service.py`
  - Adds a generic JSON chat method while keeping `explain_move()`.
- Modify `phase2_research/backend/app/api/analysis.py`
  - Adds `/analyze-position` and routes `/analyze-move` through the new agent when enabled.
- Modify `phase2_research/backend/app/core/config.py`
  - Adds `ENABLE_POSITION_ANALYSIS_AGENT`.
- Create backend tests under `phase2_research/backend/tests/services/position_analysis/`.
- Add API tests to `phase2_research/backend/tests/api/test_position_analysis_api.py`.

Frontend files:

- Modify `phase2_research/frontend/src/components/Chessboard/ChessGame.tsx`
  - Adds audience/depth controls and structured result display.
- Modify or create frontend API/types files as needed:
  - `phase2_research/frontend/src/types/analysis.ts`
  - `phase2_research/frontend/src/api/analysis.ts`
- Add tests under `phase2_research/frontend/src/components/Chessboard/`.

---

### Task 1: Add Backend Analysis Schemas

**Files:**
- Modify: `phase2_research/backend/app/schemas/analysis.py`

- [ ] **Step 1: Add failing schema tests**

Create `phase2_research/backend/tests/services/position_analysis/test_analysis_schemas.py`:

```python
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
        PositionAnalysisRequest(
            fen="8/8/8/8/8/8/8/K6k w - - 0 1",
            analysis_mode="move",
        )

    assert "played_move is required for move mode" in str(raised.value)


def test_structured_analysis_accepts_required_sections():
    analysis = StructuredAnalysis(
        position_summary="White is better because the king is safer.",
        candidate_moves=[],
        tactical_themes=["king_safety"],
        plans={"white": ["Improve the king."], "black": ["Create counterplay."]},
        move_commentary={
            "played_move": None,
            "quality": "unknown",
            "comment": "No move was supplied.",
        },
        training_tip="Compare checks before quiet moves.",
        summary_markdown="### Summary\nWhite is better.",
    )

    assert analysis.move_commentary.quality == "unknown"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd C:\Users\15096\Desktop\ChessExplain\phase2_research\backend
python -m pytest tests/services/position_analysis/test_analysis_schemas.py -q
```

Expected: FAIL because `AnalysisDepth`, `AnalysisMode`, `AudienceLevel`,
`PositionAnalysisRequest`, and `StructuredAnalysis` do not exist.

- [ ] **Step 3: Add schema models**

Append these imports and models to `phase2_research/backend/app/schemas/analysis.py`.
Keep the existing models intact.

```python
from enum import Enum
from pydantic import BaseModel, Field, model_validator
from typing import Literal


class AnalysisMode(str, Enum):
    POSITION = "position"
    MOVE = "move"
    REVIEW = "review"


class AudienceLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class AnalysisDepth(str, Enum):
    QUICK = "quick"
    STANDARD = "standard"
    DEEP = "deep"


class ScoreSummary(str, Enum):
    WHITE_BETTER = "white_better"
    BLACK_BETTER = "black_better"
    EQUAL = "equal"
    MATE = "mate"


class ValidationStatus(str, Enum):
    OK = "ok"
    REPAIRED = "repaired"
    FALLBACK = "fallback"


class MoveQuality(str, Enum):
    BEST = "best"
    EXCELLENT = "excellent"
    GOOD = "good"
    INACCURACY = "inaccuracy"
    MISTAKE = "mistake"
    BLUNDER = "blunder"
    UNKNOWN = "unknown"


class PositionAnalysisRequest(BaseModel):
    fen: str
    played_move: Optional[str] = None
    analysis_mode: AnalysisMode = AnalysisMode.POSITION
    audience_level: AudienceLevel = AudienceLevel.INTERMEDIATE
    analysis_depth: AnalysisDepth = AnalysisDepth.STANDARD

    @model_validator(mode="after")
    def validate_mode_and_move(self) -> "PositionAnalysisRequest":
        if self.analysis_mode == AnalysisMode.MOVE and not self.played_move:
            raise ValueError("played_move is required for move mode")
        return self


class PositionFacts(BaseModel):
    side_to_move: Literal["white", "black"]
    played_move_san: Optional[str] = None
    is_check: bool = False
    is_mate: bool = False
    is_stalemate: bool = False
    score_summary: ScoreSummary
    legal_moves_san: list[str] = Field(default_factory=list)
    legal_moves_uci: list[str] = Field(default_factory=list)
    engine_candidate_moves: list[str] = Field(default_factory=list)
    engine_pv_moves: list[str] = Field(default_factory=list)


class CandidateMoveAnalysis(BaseModel):
    move: str
    rank: int
    score: float
    idea: str
    pv: list[str] = Field(default_factory=list)


class MoveCommentary(BaseModel):
    played_move: Optional[str] = None
    quality: MoveQuality = MoveQuality.UNKNOWN
    comment: str


class StructuredAnalysis(BaseModel):
    position_summary: str
    candidate_moves: list[CandidateMoveAnalysis] = Field(default_factory=list)
    tactical_themes: list[str] = Field(default_factory=list)
    plans: dict[Literal["white", "black"], list[str]]
    move_commentary: MoveCommentary
    training_tip: str
    summary_markdown: str


class AnalysisValidation(BaseModel):
    status: ValidationStatus = ValidationStatus.OK
    warnings: list[str] = Field(default_factory=list)


class PositionAnalysisResponse(BaseModel):
    fen: str
    played_move: Optional[str] = None
    engine_eval: EngineEvaluation
    facts: PositionFacts
    analysis: StructuredAnalysis
    validation: AnalysisValidation
```

Then extend the existing `AnalyzeMoveResponse` model by adding optional fields:

```python
class AnalyzeMoveResponse(BaseModel):
    fen: str
    move: str
    engine_eval: EngineEvaluation
    explanation: str
    analysis: Optional[StructuredAnalysis] = None
    facts: Optional[PositionFacts] = None
    validation: Optional[AnalysisValidation] = None
```

- [ ] **Step 4: Run schema tests**

Run:

```powershell
python -m pytest tests/services/position_analysis/test_analysis_schemas.py -q
```

Expected: PASS.

- [ ] **Step 5: Local verification checkpoint**

Run:

```powershell
python -m pytest tests/services/position_analysis/test_analysis_schemas.py -q
git status --short
```

Expected: schema tests pass and modified files are visible in git status.

---

### Task 2: Add Position Facts Builder

**Files:**
- Create: `phase2_research/backend/app/services/position_analysis/__init__.py`
- Create: `phase2_research/backend/app/services/position_analysis/facts_builder.py`
- Test: `phase2_research/backend/tests/services/position_analysis/test_facts_builder.py`

- [ ] **Step 1: Write facts builder tests**

Create `phase2_research/backend/tests/services/position_analysis/test_facts_builder.py`:

```python
import pytest

from app.schemas.analysis import EngineEvaluation, PVLine, ScoreSummary
from app.services.position_analysis.facts_builder import PositionFactsBuilder


def engine_eval_with_line(score: float = 0.4, is_mate: bool = False) -> EngineEvaluation:
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
python -m pytest tests/services/position_analysis/test_facts_builder.py -q
```

Expected: FAIL because `PositionFactsBuilder` does not exist.

- [ ] **Step 3: Create package exports**

Create `phase2_research/backend/app/services/position_analysis/__init__.py`:

```python
from app.services.position_analysis.facts_builder import PositionFactsBuilder

__all__ = ["PositionFactsBuilder"]
```

- [ ] **Step 4: Implement facts builder**

Create `phase2_research/backend/app/services/position_analysis/facts_builder.py`:

```python
import chess

from app.schemas.analysis import EngineEvaluation, PositionFacts, ScoreSummary


class PositionFactsBuilder:
    def build(
        self,
        fen: str,
        engine_eval: EngineEvaluation,
        played_move: str | None = None,
    ) -> PositionFacts:
        board = chess.Board(fen)
        legal_moves_san: list[str] = []
        legal_moves_uci: list[str] = []

        for move in board.legal_moves:
            legal_moves_uci.append(move.uci())
            legal_moves_san.append(board.san(move))

        played_move_san = self._played_move_san(board, played_move)
        top_line = engine_eval.lines[0] if engine_eval.lines else None
        score_summary = self._score_summary(engine_eval)
        candidate_moves = [line.best_move for line in engine_eval.lines]
        pv_moves = [
            move
            for line in engine_eval.lines
            for move in line.pv
        ]

        return PositionFacts(
            side_to_move="white" if board.turn == chess.WHITE else "black",
            played_move_san=played_move_san,
            is_check=board.is_check(),
            is_mate=bool(top_line and top_line.is_mate) or board.is_checkmate(),
            is_stalemate=board.is_stalemate(),
            score_summary=score_summary,
            legal_moves_san=legal_moves_san,
            legal_moves_uci=legal_moves_uci,
            engine_candidate_moves=candidate_moves,
            engine_pv_moves=pv_moves,
        )

    def _played_move_san(self, board: chess.Board, played_move: str | None) -> str | None:
        if not played_move:
            return None

        move = self._parse_move(board, played_move)
        if move not in board.legal_moves:
            raise ValueError("played_move is not legal in the supplied FEN")
        return board.san(move)

    def _parse_move(self, board: chess.Board, played_move: str) -> chess.Move:
        try:
            return chess.Move.from_uci(played_move)
        except ValueError:
            try:
                return board.parse_san(played_move)
            except ValueError as exc:
                raise ValueError("played_move is not legal in the supplied FEN") from exc

    def _score_summary(self, engine_eval: EngineEvaluation) -> ScoreSummary:
        if not engine_eval.lines:
            return ScoreSummary.EQUAL

        top = engine_eval.lines[0]
        if top.is_mate:
            return ScoreSummary.MATE
        if top.score > 0.35:
            return ScoreSummary.WHITE_BETTER
        if top.score < -0.35:
            return ScoreSummary.BLACK_BETTER
        return ScoreSummary.EQUAL
```

- [ ] **Step 5: Run facts tests**

Run:

```powershell
python -m pytest tests/services/position_analysis/test_facts_builder.py -q
```

Expected: PASS.

- [ ] **Step 6: Local verification checkpoint**

Run:

```powershell
python -m pytest tests/services/position_analysis/test_analysis_schemas.py tests/services/position_analysis/test_facts_builder.py -q
```

Expected: PASS.

---

### Task 3: Add Grounding Validator and Fallback

**Files:**
- Create: `phase2_research/backend/app/services/position_analysis/grounding_validator.py`
- Test: `phase2_research/backend/tests/services/position_analysis/test_grounding_validator.py`

- [ ] **Step 1: Write validator tests**

Create `phase2_research/backend/tests/services/position_analysis/test_grounding_validator.py`:

```python
from app.schemas.analysis import (
    AnalysisValidation,
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
        engine_pv_moves=["e4", "e5", "Nf3"],
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
            {"move": "e4", "rank": 1, "score": 0.4, "idea": "Claim the center.", "pv": ["e4", "e5"]},
            {"move": "Nf3", "rank": 2, "score": 0.2, "idea": "Develop a knight.", "pv": ["Nf3", "d5"]},
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
python -m pytest tests/services/position_analysis/test_grounding_validator.py -q
```

Expected: FAIL because `GroundingValidator` does not exist.

- [ ] **Step 3: Implement validator**

Create `phase2_research/backend/app/services/position_analysis/grounding_validator.py`:

```python
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

        for candidate in analysis.candidate_moves:
            if candidate.move not in engine_candidates:
                warnings.append(
                    f"candidate move {candidate.move} is not in engine candidates"
                )
            for pv_move in candidate.pv:
                if pv_move not in facts.engine_pv_moves:
                    warnings.append(f"pv move {pv_move} is not in engine PV")

        if facts.is_mate and "mate" not in analysis.position_summary.lower() and "杀" not in analysis.position_summary:
            warnings.append("mate fact is missing from position summary")

        status = ValidationStatus.OK if not warnings else ValidationStatus.FALLBACK
        return AnalysisValidation(status=status, warnings=warnings)

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
        if first:
            position_summary = f"引擎一选是 {first.best_move}，评分 {first.score:+.2f}。"
        else:
            position_summary = "当前没有可用的引擎候选招法。"

        analysis = StructuredAnalysis(
            position_summary=position_summary,
            candidate_moves=candidate_moves,
            tactical_themes=[],
            plans={"white": [], "black": []},
            move_commentary={
                "played_move": facts.played_move_san,
                "quality": "unknown",
                "comment": "模型解释不可用，已返回保守的引擎事实。",
            },
            training_tip="优先比较引擎候选招法和主要变例。",
            summary_markdown="模型解释不可用，以下为基于 Stockfish 的保守事实摘要。",
        )
        return PositionAnalysisResponse(
            fen=fen,
            played_move=played_move,
            engine_eval=engine_eval,
            facts=facts,
            analysis=analysis,
            validation=AnalysisValidation(
                status=ValidationStatus.FALLBACK,
                warnings=warnings,
            ),
        )
```

- [ ] **Step 4: Run validator tests**

Run:

```powershell
python -m pytest tests/services/position_analysis/test_grounding_validator.py -q
```

Expected: PASS.

- [ ] **Step 5: Local verification checkpoint**

Run:

```powershell
python -m pytest tests/services/position_analysis -q
```

Expected: PASS.

---

### Task 4: Add Prompt Builders and Generic LLM JSON Call

**Files:**
- Create: `phase2_research/backend/app/services/position_analysis/prompts.py`
- Modify: `phase2_research/backend/app/services/llm_service.py`
- Test: `phase2_research/backend/tests/services/position_analysis/test_prompts.py`

- [ ] **Step 1: Write prompt tests**

Create `phase2_research/backend/tests/services/position_analysis/test_prompts.py`:

```python
from app.schemas.analysis import AnalysisDepth, AnalysisMode, AudienceLevel
from app.services.position_analysis.prompts import build_draft_prompt, build_repair_prompt


def test_draft_prompt_contains_grounding_rules():
    prompt = build_draft_prompt(
        facts_json='{"side_to_move":"white"}',
        engine_json='{"lines":[]}',
        analysis_mode=AnalysisMode.MOVE,
        audience_level=AudienceLevel.INTERMEDIATE,
        analysis_depth=AnalysisDepth.STANDARD,
    )

    assert "JSON" in prompt
    assert "SAN" in prompt
    assert "do not invent" in prompt
    assert "white-centric" in prompt


def test_repair_prompt_contains_warnings_and_original_output():
    prompt = build_repair_prompt(
        facts_json='{"side_to_move":"white"}',
        engine_json='{"lines":[]}',
        original_output='{"bad": true}',
        warnings=["candidate move Qh5 is not in engine candidates"],
    )

    assert "candidate move Qh5 is not in engine candidates" in prompt
    assert '{"bad": true}' in prompt
```

- [ ] **Step 2: Run prompt tests to verify they fail**

Run:

```powershell
python -m pytest tests/services/position_analysis/test_prompts.py -q
```

Expected: FAIL because `prompts.py` does not exist.

- [ ] **Step 3: Implement prompt builders**

Create `phase2_research/backend/app/services/position_analysis/prompts.py`:

```python
from app.schemas.analysis import AnalysisDepth, AnalysisMode, AudienceLevel


def build_draft_prompt(
    facts_json: str,
    engine_json: str,
    analysis_mode: AnalysisMode,
    audience_level: AudienceLevel,
    analysis_depth: AnalysisDepth,
) -> str:
    return f"""
You are a chess coach agent. Return only valid JSON matching the requested schema.

Analysis mode: {analysis_mode.value}
Audience level: {audience_level.value}
Analysis depth: {analysis_depth.value}

Hard facts:
{facts_json}

Engine evaluation:
{engine_json}

Rules:
- Use SAN for all user-facing moves.
- Use the white-centric score contract: positive is better for White, negative is better for Black.
- Mate facts override ordinary centipawn descriptions.
- Do not invent candidate moves.
- Do not invent PV lines.
- Candidate moves must come from engine evaluation lines.
- Keep beginner output simple, intermediate output balanced, and advanced output more PV-focused.
- Return JSON with keys: position_summary, candidate_moves, tactical_themes, plans, move_commentary, training_tip, summary_markdown.
""".strip()


def build_repair_prompt(
    facts_json: str,
    engine_json: str,
    original_output: str,
    warnings: list[str],
) -> str:
    warnings_text = "\n".join(f"- {warning}" for warning in warnings)
    return f"""
Repair the JSON chess analysis. Return only corrected JSON.

Hard facts:
{facts_json}

Engine evaluation:
{engine_json}

Validation warnings:
{warnings_text}

Original output:
{original_output}
""".strip()
```

- [ ] **Step 4: Add generic JSON call to LLMService**

Modify `phase2_research/backend/app/services/llm_service.py`. Add this method
inside `LLMService`:

```python
    async def complete_json(self, prompt: str, system_prompt: str | None = None) -> str:
        if not self.client.api_key:
            raise RuntimeError("DeepSeek API Key is not configured")

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                    or "You are a precise chess analysis agent. Return only valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        content = response.choices[0].message.content
        if not content:
            raise RuntimeError("LLM returned empty content")
        return content
```

Keep `explain_move()` unchanged for fallback compatibility.

- [ ] **Step 5: Run prompt tests**

Run:

```powershell
python -m pytest tests/services/position_analysis/test_prompts.py -q
```

Expected: PASS.

---

### Task 5: Implement PositionAnalysisAgent

**Files:**
- Create: `phase2_research/backend/app/services/position_analysis/agent.py`
- Modify: `phase2_research/backend/app/services/position_analysis/__init__.py`
- Test: `phase2_research/backend/tests/services/position_analysis/test_agent.py`

- [ ] **Step 1: Write agent tests with fake LLM**

Create `phase2_research/backend/tests/services/position_analysis/test_agent.py`:

```python
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
                {"move": "e4", "rank": 1, "score": 0.4, "idea": "Claim the center.", "pv": ["e4", "e5"]}
            ],
            "tactical_themes": ["center"],
            "plans": {"white": ["Develop quickly."], "black": ["Challenge the center."]},
            "move_commentary": {"played_move": "e4", "quality": "best", "comment": "The move is strong."},
            "training_tip": "Compare forcing moves first.",
            "summary_markdown": "White is slightly better.",
        }
    )


async def test_agent_returns_valid_structured_analysis():
    agent = PositionAnalysisAgent(llm_service=FakeLLM([valid_json()]))

    result = await agent.analyze(
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        engine_eval=engine_eval(),
        played_move="e2e4",
        analysis_mode=AnalysisMode.MOVE,
        audience_level=AudienceLevel.INTERMEDIATE,
        analysis_depth=AnalysisDepth.STANDARD,
    )

    assert result.validation.status == ValidationStatus.OK
    assert result.analysis.position_summary == "White has a small initiative."
    assert result.facts.played_move_san == "e4"


async def test_agent_repairs_invalid_candidate_once():
    bad = valid_json().replace('"e4"', '"Qh5"', 1)
    agent = PositionAnalysisAgent(llm_service=FakeLLM([bad, valid_json()]))

    result = await agent.analyze(
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        engine_eval=engine_eval(),
        played_move="e2e4",
        analysis_mode=AnalysisMode.MOVE,
        audience_level=AudienceLevel.INTERMEDIATE,
        analysis_depth=AnalysisDepth.STANDARD,
    )

    assert result.validation.status == ValidationStatus.REPAIRED
    assert len(agent.llm_service.calls) == 2


async def test_agent_falls_back_when_json_is_invalid_twice():
    agent = PositionAnalysisAgent(llm_service=FakeLLM(["not-json", "still-not-json"]))

    result = await agent.analyze(
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        engine_eval=engine_eval(),
        played_move="e2e4",
        analysis_mode=AnalysisMode.MOVE,
        audience_level=AudienceLevel.INTERMEDIATE,
        analysis_depth=AnalysisDepth.STANDARD,
    )

    assert result.validation.status == ValidationStatus.FALLBACK
    assert "模型解释不可用" in result.analysis.summary_markdown
```

- [ ] **Step 2: Ensure async tests are supported**

If these async tests are not collected correctly, convert each test body to:

```python
import asyncio


def test_agent_returns_valid_structured_analysis():
    result = asyncio.run(run_case())
```

Use the direct `async def` form first because the repository already uses async
testing patterns through `asyncio.run()` in API tests.

- [ ] **Step 3: Run agent tests to verify they fail**

Run:

```powershell
python -m pytest tests/services/position_analysis/test_agent.py -q
```

Expected: FAIL because `PositionAnalysisAgent` does not exist.

- [ ] **Step 4: Implement agent**

Create `phase2_research/backend/app/services/position_analysis/agent.py`:

```python
import json
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
        llm_service: LLMService | None = None,
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

        draft_prompt = build_draft_prompt(
            facts_json=facts_json,
            engine_json=engine_json,
            analysis_mode=analysis_mode,
            audience_level=audience_level,
            analysis_depth=analysis_depth,
        )

        draft_text = await self._safe_complete(draft_prompt)
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
        facts,
        engine_eval,
        fen: str,
        played_move: str | None,
        original_output: str,
        warnings: list[str],
    ) -> PositionAnalysisResponse:
        repair_prompt = build_repair_prompt(
            facts_json=facts.model_dump_json(),
            engine_json=engine_eval.model_dump_json(),
            original_output=original_output,
            warnings=warnings,
        )
        repair_text = await self._safe_complete(repair_prompt)
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
            data = json.loads(text)
            return StructuredAnalysis.model_validate(data)
        except (json.JSONDecodeError, ValidationError, TypeError):
            return None
```

- [ ] **Step 5: Update package export**

Modify `phase2_research/backend/app/services/position_analysis/__init__.py`:

```python
from app.services.position_analysis.agent import PositionAnalysisAgent
from app.services.position_analysis.facts_builder import PositionFactsBuilder
from app.services.position_analysis.grounding_validator import GroundingValidator

__all__ = ["GroundingValidator", "PositionAnalysisAgent", "PositionFactsBuilder"]
```

- [ ] **Step 6: Run agent tests**

Run:

```powershell
python -m pytest tests/services/position_analysis/test_agent.py -q
```

Expected: PASS. If pytest warns that async tests are skipped, convert them to
`asyncio.run()` wrappers before proceeding.

- [ ] **Step 7: Local verification checkpoint**

Run:

```powershell
python -m pytest tests/services/position_analysis -q
```

Expected: PASS.

---

### Task 6: Wire Backend API and Config

**Files:**
- Modify: `phase2_research/backend/app/core/config.py`
- Modify: `phase2_research/backend/app/api/analysis.py`
- Test: `phase2_research/backend/tests/api/test_position_analysis_api.py`

- [ ] **Step 1: Write API tests**

Create `phase2_research/backend/tests/api/test_position_analysis_api.py`:

```python
from fastapi.testclient import TestClient

from app.api import analysis
from app.main import app
from app.schemas.analysis import EngineEvaluation, PVLine


client = TestClient(app)


class FakeEngine:
    async def analyze_position(self, fen: str, move: str | None = None) -> EngineEvaluation:
        return EngineEvaluation(
            lines=[
                PVLine(score=0.4, is_mate=False, best_move="e4", pv=["e4", "e5"]),
            ]
        )


class FakeAgent:
    async def analyze(self, fen, engine_eval, played_move, analysis_mode, audience_level, analysis_depth):
        from app.schemas.analysis import (
            AnalysisValidation,
            PositionAnalysisResponse,
            PositionFacts,
            ScoreSummary,
            StructuredAnalysis,
        )

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
                    {"move": "e4", "rank": 1, "score": 0.4, "idea": "Claim the center.", "pv": ["e4", "e5"]}
                ],
                tactical_themes=["center"],
                plans={"white": ["Develop."], "black": ["Challenge the center."]},
                move_commentary={"played_move": "e4" if played_move else None, "quality": "best", "comment": "Strong."},
                training_tip="Compare forcing moves.",
                summary_markdown="White is slightly better.",
            ),
            validation=AnalysisValidation(status="ok", warnings=[]),
        )


def test_analyze_position_returns_structured_payload(monkeypatch):
    monkeypatch.setattr(analysis, "get_engine_service", lambda: FakeEngine())
    monkeypatch.setattr(analysis, "get_position_analysis_agent", lambda: FakeAgent())

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


def test_analyze_move_keeps_old_explanation_field(monkeypatch):
    monkeypatch.setattr(analysis, "get_engine_service", lambda: FakeEngine())
    monkeypatch.setattr(analysis, "get_position_analysis_agent", lambda: FakeAgent())

    response = client.post(
        "/api/v1/analyze-move",
        json={
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "move": "e2e4",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["explanation"] == "White is slightly better."
    assert payload["analysis"]["position_summary"] == "White has a small initiative."
```

- [ ] **Step 2: Run API tests to verify they fail**

Run:

```powershell
python -m pytest tests/api/test_position_analysis_api.py -q
```

Expected: FAIL because `/analyze-position` and `get_position_analysis_agent`
do not exist.

- [ ] **Step 3: Add config flag**

Modify `phase2_research/backend/app/core/config.py`. Add this field to
`Settings`:

```python
    ENABLE_POSITION_ANALYSIS_AGENT: bool = True
```

- [ ] **Step 4: Wire dependencies and endpoint**

Modify `phase2_research/backend/app/api/analysis.py`:

```python
from app.core.config import settings
from app.schemas.analysis import (
    AnalysisDepth,
    AnalysisMode,
    AudienceLevel,
    PositionAnalysisRequest,
    PositionAnalysisResponse,
)
from app.services.position_analysis import PositionAnalysisAgent
```

Add dependency:

```python
def get_position_analysis_agent():
    return PositionAnalysisAgent()
```

Add endpoint:

```python
@router.post("/analyze-position", response_model=PositionAnalysisResponse)
async def analyze_position(
    request: PositionAnalysisRequest,
    engine_service: EngineService = Depends(get_engine_service),
    agent: PositionAnalysisAgent = Depends(get_position_analysis_agent),
):
    if not settings.ENABLE_POSITION_ANALYSIS_AGENT:
        raise HTTPException(status_code=503, detail="Position analysis agent is disabled")
    try:
        engine_eval = await engine_service.analyze_position(
            request.fen,
            request.played_move,
        )
        return await agent.analyze(
            fen=request.fen,
            engine_eval=engine_eval,
            played_move=request.played_move,
            analysis_mode=request.analysis_mode,
            audience_level=request.audience_level,
            analysis_depth=request.analysis_depth,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

Update `/analyze-move` to use the agent when enabled:

```python
@router.post("/analyze-move", response_model=AnalyzeMoveResponse)
async def analyze_move(
    request: AnalyzeMoveRequest,
    engine_service: EngineService = Depends(get_engine_service),
    llm_service: LLMService = Depends(get_llm_service),
    agent: PositionAnalysisAgent = Depends(get_position_analysis_agent),
):
    try:
        engine_eval = await engine_service.analyze_position(request.fen, request.move)

        if settings.ENABLE_POSITION_ANALYSIS_AGENT:
            agent_result = await agent.analyze(
                fen=request.fen,
                engine_eval=engine_eval,
                played_move=request.move,
                analysis_mode=AnalysisMode.MOVE,
                audience_level=AudienceLevel.INTERMEDIATE,
                analysis_depth=AnalysisDepth.STANDARD,
            )
            return AnalyzeMoveResponse(
                fen=request.fen,
                move=request.move,
                engine_eval=engine_eval,
                explanation=agent_result.analysis.summary_markdown,
                analysis=agent_result.analysis,
                facts=agent_result.facts,
                validation=agent_result.validation,
            )

        explanation = await llm_service.explain_move(request.fen, request.move, engine_eval)
        return AnalyzeMoveResponse(
            fen=request.fen,
            move=request.move,
            engine_eval=engine_eval,
            explanation=explanation,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 5: Run API tests**

Run:

```powershell
python -m pytest tests/api/test_position_analysis_api.py -q
```

Expected: PASS.

- [ ] **Step 6: Run backend test suite**

Run:

```powershell
python -m pytest -q
```

Expected: PASS.

---

### Task 7: Add Frontend Types and API Client

**Files:**
- Create or Modify: `phase2_research/frontend/src/types/analysis.ts`
- Create or Modify: `phase2_research/frontend/src/api/analysis.ts`
- Test: `phase2_research/frontend/src/api/analysis.test.ts`

- [ ] **Step 1: Write API client test**

Create `phase2_research/frontend/src/api/analysis.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";

import { analyzeMove } from "./analysis";

describe("analysis api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends audience level and analysis depth to analyze-move", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        fen: "fen",
        move: "e2e4",
        engine_eval: { lines: [] },
        explanation: "summary",
      }),
    } as Response);

    await analyzeMove({
      fen: "fen",
      move: "e2e4",
      audience_level: "beginner",
      analysis_depth: "quick",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/analyze-move"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fen: "fen",
          move: "e2e4",
          audience_level: "beginner",
          analysis_depth: "quick",
        }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd C:\Users\15096\Desktop\ChessExplain\phase2_research\frontend
npm test -- --run src/api/analysis.test.ts
```

Expected: FAIL because `src/api/analysis.ts` does not expose this helper.

- [ ] **Step 3: Add frontend analysis types**

Create or update `phase2_research/frontend/src/types/analysis.ts`:

```typescript
export type AudienceLevel = "beginner" | "intermediate" | "advanced";
export type AnalysisDepth = "quick" | "standard" | "deep";
export type AnalysisMode = "position" | "move" | "review";
export type ValidationStatus = "ok" | "repaired" | "fallback";

export type PVLine = {
  score: number;
  is_mate: boolean;
  mate_score?: number | null;
  best_move: string;
  pv: string[];
};

export type EngineEvaluation = {
  lines: PVLine[];
};

export type PositionFacts = {
  side_to_move: "white" | "black";
  played_move_san?: string | null;
  is_check: boolean;
  is_mate: boolean;
  is_stalemate?: boolean;
  score_summary: "white_better" | "black_better" | "equal" | "mate";
};

export type CandidateMoveAnalysis = {
  move: string;
  rank: number;
  score: number;
  idea: string;
  pv: string[];
};

export type StructuredAnalysis = {
  position_summary: string;
  candidate_moves: CandidateMoveAnalysis[];
  tactical_themes: string[];
  plans: {
    white: string[];
    black: string[];
  };
  move_commentary: {
    played_move?: string | null;
    quality: "best" | "excellent" | "good" | "inaccuracy" | "mistake" | "blunder" | "unknown";
    comment: string;
  };
  training_tip: string;
  summary_markdown: string;
};

export type AnalysisValidation = {
  status: ValidationStatus;
  warnings: string[];
};

export type AnalyzeMoveResponse = {
  fen: string;
  move: string;
  engine_eval: EngineEvaluation;
  explanation: string;
  analysis?: StructuredAnalysis | null;
  facts?: PositionFacts | null;
  validation?: AnalysisValidation | null;
};
```

- [ ] **Step 4: Add API helper**

Create or update `phase2_research/frontend/src/api/analysis.ts`:

```typescript
import { API_BASE } from "./config";
import type {
  AnalysisDepth,
  AnalyzeMoveResponse,
  AudienceLevel,
} from "../types/analysis";

type AnalyzeMoveRequest = {
  fen: string;
  move: string;
  audience_level: AudienceLevel;
  analysis_depth: AnalysisDepth;
};

export async function analyzeMove(
  payload: AnalyzeMoveRequest,
): Promise<AnalyzeMoveResponse> {
  const response = await fetch(`${API_BASE}/api/v1/analyze-move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Analyze move failed (${response.status})`);
  }

  return (await response.json()) as AnalyzeMoveResponse;
}
```

- [ ] **Step 5: Run API client test**

Run:

```powershell
npm test -- --run src/api/analysis.test.ts
```

Expected: PASS.

---

### Task 8: Update Analysis Page Controls and Rendering

**Files:**
- Modify: `phase2_research/frontend/src/components/Chessboard/ChessGame.tsx`
- Test: `phase2_research/frontend/src/components/Chessboard/ChessGame.test.tsx` or existing relevant Chessboard tests

- [ ] **Step 1: Identify current inline axios analyze call**

Open `ChessGame.tsx` and find:

```typescript
const response = await axios.post<AnalysisResponse>(`${API_BASE}/api/v1/analyze-move`, {
```

Replace this call in the implementation step with the new `analyzeMove()`
helper from `src/api/analysis.ts`.

- [ ] **Step 2: Add frontend state**

In `ChessGame.tsx`, import the types and helper:

```typescript
import { analyzeMove as requestMoveAnalysis } from "../../api/analysis";
import type { AnalysisDepth, AudienceLevel } from "../../types/analysis";
```

Add state near existing analysis state:

```typescript
const [audienceLevel, setAudienceLevel] =
  useState<AudienceLevel>("intermediate");
const [analysisDepth, setAnalysisDepth] =
  useState<AnalysisDepth>("standard");
```

- [ ] **Step 3: Send controls in analyzeMove function**

Replace the axios call inside `async function analyzeMove(fen: string, uciMove: string)` with:

```typescript
const response = await requestMoveAnalysis({
  fen,
  move: uciMove,
  audience_level: audienceLevel,
  analysis_depth: analysisDepth,
});
setAnalysis(response);
```

Remove the now-unused `axios` import only if no other code in `ChessGame.tsx`
uses it.

- [ ] **Step 4: Add compact controls near coach area**

Near the "战术复盘教练" heading, add:

```tsx
<div className="flex flex-wrap gap-2 text-xs">
  <label className="flex items-center gap-1 text-slate-600">
    解释水平
    <select
      className="rounded border border-slate-300 bg-white px-2 py-1"
      value={audienceLevel}
      onChange={(event) => setAudienceLevel(event.target.value as AudienceLevel)}
    >
      <option value="beginner">初学者</option>
      <option value="intermediate">中级</option>
      <option value="advanced">高级</option>
    </select>
  </label>
  <label className="flex items-center gap-1 text-slate-600">
    分析深度
    <select
      className="rounded border border-slate-300 bg-white px-2 py-1"
      value={analysisDepth}
      onChange={(event) => setAnalysisDepth(event.target.value as AnalysisDepth)}
    >
      <option value="quick">快速</option>
      <option value="standard">标准</option>
      <option value="deep">深入</option>
    </select>
  </label>
</div>
```

- [ ] **Step 5: Add structured result rendering**

Inside the coach output area, before the old markdown explanation fallback, add:

```tsx
{analysis?.validation?.status === "fallback" ? (
  <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
    语言解释处于保守模式，以下内容主要基于引擎事实。
  </div>
) : null}

{analysis?.analysis ? (
  <div className="space-y-3">
    <section className="rounded border border-slate-200 bg-white px-3 py-2">
      <h4 className="text-sm font-semibold text-slate-800">局面总评</h4>
      <p className="mt-1 text-sm text-slate-600">
        {analysis.analysis.position_summary}
      </p>
    </section>
    <section className="rounded border border-slate-200 bg-white px-3 py-2">
      <h4 className="text-sm font-semibold text-slate-800">候选招法</h4>
      <div className="mt-2 space-y-2">
        {analysis.analysis.candidate_moves.map((candidate) => (
          <div key={`${candidate.rank}-${candidate.move}`} className="text-sm">
            <div className="font-mono font-semibold text-slate-800">
              {candidate.rank}. {candidate.move} ({candidate.score >= 0 ? "+" : ""}
              {candidate.score.toFixed(2)})
            </div>
            <div className="text-slate-600">{candidate.idea}</div>
            {candidate.pv.length > 0 ? (
              <div className="text-xs text-slate-500">
                {candidate.pv.join(" → ")}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
    <section className="rounded border border-slate-200 bg-white px-3 py-2">
      <h4 className="text-sm font-semibold text-slate-800">训练建议</h4>
      <p className="mt-1 text-sm text-slate-600">
        {analysis.analysis.training_tip}
      </p>
    </section>
  </div>
) : (
  <ReactMarkdown remarkPlugins={[remarkGfm]}>
    {analysis.explanation}
  </ReactMarkdown>
)}
```

If `ReactMarkdown` is already used in that block, keep the existing import and
only wrap the fallback around the current markdown rendering.

- [ ] **Step 6: Add or update frontend test**

If `ChessGame.test.tsx` does not exist, create
`phase2_research/frontend/src/components/Chessboard/ChessGame.agent.test.tsx`
with a light mock around the API helper and React Chessboard. Use this test:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-chessboard", () => ({
  Chessboard: () => <div>board</div>,
}));

vi.mock("../../api/analysis", () => ({
  analyzeMove: vi.fn(),
}));

import { analyzeMove } from "../../api/analysis";
import ChessGame from "./ChessGame";

describe("ChessGame agent controls", () => {
  it("renders audience and depth controls", () => {
    render(<ChessGame />);

    expect(screen.getByLabelText("解释水平")).toBeInTheDocument();
    expect(screen.getByLabelText("分析深度")).toBeInTheDocument();
  });
});
```

If existing ChessGame tests require more setup, put the controls in a small child
component `AnalysisAgentControls.tsx` and test that component directly.

- [ ] **Step 7: Run frontend targeted tests**

Run:

```powershell
npm test -- --run src/api/analysis.test.ts src/components/Chessboard/ChessGame.agent.test.tsx
```

Expected: PASS.

---

### Task 9: Full Verification and Local Site Check

**Files:**
- No source files unless failures reveal a defect.

- [ ] **Step 1: Run backend full suite**

Run:

```powershell
cd C:\Users\15096\Desktop\ChessExplain\phase2_research\backend
python -m pytest
```

Expected: PASS.

- [ ] **Step 2: Run frontend full suite**

Run:

```powershell
cd C:\Users\15096\Desktop\ChessExplain\phase2_research\frontend
npm test
```

Expected: PASS.

- [ ] **Step 3: Run frontend lint, type-check, build**

Run:

```powershell
npm run lint
npm run type-check
npm run build
```

Expected: all commands pass.

- [ ] **Step 4: Restart local backend if needed**

If the backend is not running:

```powershell
cd C:\Users\15096\Desktop\ChessExplain\phase2_research\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

If the backend is already running without reload, restart it after code changes.

- [ ] **Step 5: Open local analysis page**

Open:

```text
http://127.0.0.1:5173/analyze
```

Expected:

- analysis page loads;
- explanation level and depth controls are visible;
- moving a piece still triggers analysis;
- old markdown fallback still displays if structured analysis is missing;
- fallback notice displays when `validation.status` is `fallback`.

- [ ] **Step 6: Local verification checkpoint**

Run:

```powershell
git status --short
```

Expected: implementation files are modified and uncommitted, matching the
user's request to defer git commits.

---

## Self-Review Notes

- Spec coverage:
  - backend agent package: Tasks 2-5;
  - new schemas and API: Tasks 1 and 6;
  - rule validation and fallback: Task 3;
  - generic LLM JSON call and prompts: Task 4;
  - frontend controls and structured display: Tasks 7-8;
  - verification: Task 9.
- Scope:
  - PGN full-review agent, Search Lab LLM explanation, long-term user profile,
    and training recommendations are excluded from implementation.
- Type consistency:
  - `analysis_mode`, `audience_level`, and `analysis_depth` use snake_case in
    API payloads and TypeScript request types.
  - Pydantic models use enum values matching the spec.
  - Old `AnalyzeMoveResponse.explanation` remains present.
