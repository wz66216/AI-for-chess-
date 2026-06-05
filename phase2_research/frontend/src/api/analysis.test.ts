import { afterEach, describe, expect, it, vi } from "vitest";

import { analyzeMove, reviewGame } from "./analysis";

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

  it("sends pgn and controls to review-game", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        game_analysis: {},
        review: {
          overall_summary: "整盘总结",
          white_summary: "白方总结",
          black_summary: "黑方总结",
          turning_points: [],
          critical_moment: null,
          training_plan: [],
          summary_markdown: "整盘总结",
        },
        validation: { status: "ok", warnings: [] },
      }),
    } as Response);

    await reviewGame({
      pgn: "1. e4 e5",
      audience_level: "advanced",
      analysis_depth: "deep",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/review-game"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pgn: "1. e4 e5",
          audience_level: "advanced",
          analysis_depth: "deep",
        }),
      }),
    );
  });
});
