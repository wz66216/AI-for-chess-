import { describe, expect, it } from "vitest";

import { diagnosePosition } from "./positionDiagnosis";

describe("diagnosePosition", () => {
  it("describes balanced positions", () => {
    const diagnosis = diagnosePosition({
      score: 0.08,
      is_mate: false,
      mate_score: null,
      best_move: "Nf3",
      pv: ["Nf3", "Nf6"],
    });

    expect(diagnosis.tone).toBe("balanced");
    expect(diagnosis.sideLabel).toBe("局面接近均势");
    expect(diagnosis.severityLabel).toBe("均势");
    expect(diagnosis.scoreLabel).toBe("+0.08");
  });

  it("describes white advantages", () => {
    const diagnosis = diagnosePosition({
      score: 1.2,
      is_mate: false,
      mate_score: null,
      best_move: "Qh5",
      pv: ["Qh5", "Nc6", "Bc4"],
    });

    expect(diagnosis.tone).toBe("white");
    expect(diagnosis.sideLabel).toBe("白方更好");
    expect(diagnosis.severityLabel).toBe("小优势");
    expect(diagnosis.plan).toContain("Qh5");
  });

  it("describes black advantages", () => {
    const diagnosis = diagnosePosition({
      score: -2.1,
      is_mate: false,
      mate_score: null,
      best_move: "Qxd4",
      pv: ["Qxd4", "Nxd4"],
    });

    expect(diagnosis.tone).toBe("black");
    expect(diagnosis.sideLabel).toBe("黑方更好");
    expect(diagnosis.severityLabel).toBe("明显优势");
    expect(diagnosis.scoreLabel).toBe("-2.10");
  });

  it("describes forced mate", () => {
    const diagnosis = diagnosePosition({
      score: 0,
      is_mate: true,
      mate_score: -3,
      best_move: "Qh4+",
      pv: ["Qh4+", "Kf1", "Qf2#"],
    });

    expect(diagnosis.tone).toBe("mate");
    expect(diagnosis.sideLabel).toBe("黑方有杀棋");
    expect(diagnosis.severityLabel).toBe("强制杀棋");
    expect(diagnosis.scoreLabel).toBe("M-3");
    expect(diagnosis.risk).toContain("3 步杀");
  });
});
