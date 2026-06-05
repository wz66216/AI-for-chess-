export type AudienceLevel = "beginner" | "intermediate" | "advanced";
export type AnalysisDepth = "quick" | "standard" | "deep";
export type AnalysisMode = "position" | "move" | "review";
export type ValidationStatus = "ok" | "repaired" | "fallback";

export type PVLine = {
  score: number;
  is_mate: boolean;
  mate_score: number | null;
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
    quality:
      | "best"
      | "excellent"
      | "good"
      | "inaccuracy"
      | "mistake"
      | "blunder"
      | "unknown";
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

export type GameReviewMoment = {
  move_index: number;
  move_number: number;
  color: "white" | "black";
  san: string;
  judgment: string;
  eval_cp: number;
  win_diff: number;
  why: string;
};

export type GameReviewAnalysis = {
  overall_summary: string;
  white_summary: string;
  black_summary: string;
  turning_points: GameReviewMoment[];
  critical_moment?: GameReviewMoment | null;
  training_plan: string[];
  summary_markdown: string;
};

export type GameReviewResponse = {
  game_analysis: unknown;
  review: GameReviewAnalysis;
  validation: AnalysisValidation;
};
