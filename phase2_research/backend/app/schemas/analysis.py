from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class PVLine(BaseModel):
    score: float
    is_mate: bool
    mate_score: int | None = None
    best_move: str
    pv: list[str]


class EngineEvaluation(BaseModel):
    lines: list[PVLine]


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


class AnalyzeMoveRequest(BaseModel):
    fen: str
    move: str
    audience_level: AudienceLevel = AudienceLevel.INTERMEDIATE
    analysis_depth: AnalysisDepth = AnalysisDepth.STANDARD


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
    played_move: str | None = None
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
    played_move_san: str | None = None
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
    played_move: str | None = None
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
    played_move: str | None = None
    engine_eval: EngineEvaluation
    facts: PositionFacts
    analysis: StructuredAnalysis
    validation: AnalysisValidation


class AnalyzeMoveResponse(BaseModel):
    fen: str
    move: str
    engine_eval: EngineEvaluation
    explanation: str
    analysis: StructuredAnalysis | None = None
    facts: PositionFacts | None = None
    validation: AnalysisValidation | None = None


class GameReviewRequest(BaseModel):
    pgn: str
    audience_level: AudienceLevel = AudienceLevel.INTERMEDIATE
    analysis_depth: AnalysisDepth = AnalysisDepth.STANDARD


class GameReviewMoment(BaseModel):
    move_index: int
    move_number: int
    color: Literal["white", "black"]
    san: str
    judgment: str
    eval_cp: int
    win_diff: float
    why: str


class GameReviewAnalysis(BaseModel):
    overall_summary: str
    white_summary: str
    black_summary: str
    turning_points: list[GameReviewMoment] = Field(default_factory=list)
    critical_moment: GameReviewMoment | None = None
    training_plan: list[str] = Field(default_factory=list)
    summary_markdown: str


class GameReviewResponse(BaseModel):
    game_analysis: dict
    review: GameReviewAnalysis
    validation: AnalysisValidation
