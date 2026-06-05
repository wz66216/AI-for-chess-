import { API_BASE } from "./config";
import type {
  AnalysisDepth,
  AnalyzeMoveResponse,
  AudienceLevel,
  GameReviewResponse,
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

type ReviewGameRequest = {
  pgn: string;
  audience_level: AudienceLevel;
  analysis_depth: AnalysisDepth;
};

export async function reviewGame(
  payload: ReviewGameRequest,
): Promise<GameReviewResponse> {
  const response = await fetch(`${API_BASE}/api/v1/review-game`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Review game failed (${response.status})`);
  }

  return (await response.json()) as GameReviewResponse;
}
