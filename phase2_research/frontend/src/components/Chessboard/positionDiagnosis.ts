export interface EngineLineForDiagnosis {
  score: number;
  is_mate: boolean;
  mate_score: number | null;
  best_move: string;
  pv: string[];
}

export interface PositionDiagnosis {
  sideLabel: string;
  severityLabel: string;
  scoreLabel: string;
  summary: string;
  plan: string;
  risk: string;
  tone: "white" | "black" | "balanced" | "mate";
}

function formatScore(score: number) {
  return `${score > 0 ? "+" : ""}${score.toFixed(2)}`;
}

function pvPreview(line: EngineLineForDiagnosis) {
  return line.pv.length > 1 ? line.pv.slice(0, 4).join(" ") : line.best_move;
}

export function diagnosePosition(line: EngineLineForDiagnosis): PositionDiagnosis {
  if (line.is_mate) {
    const mateScore = line.mate_score ?? 0;
    const sideLabel = mateScore >= 0 ? "白方有杀棋" : "黑方有杀棋";
    const moves = Math.abs(mateScore);
    return {
      sideLabel,
      severityLabel: "强制杀棋",
      scoreLabel: `M${line.mate_score ?? "?"}`,
      summary: `${sideLabel}，引擎认为局面已经进入强制路线。`,
      plan: `优先检查 ${line.best_move} 以及后续 ${pvPreview(line)}。`,
      risk: moves > 0 ? `关键是不要偏离 ${moves} 步杀的主线。` : "需要立即核对将杀路线。",
      tone: "mate",
    };
  }

  const abs = Math.abs(line.score);
  const sideLabel =
    abs < 0.2 ? "局面接近均势" : line.score > 0 ? "白方更好" : "黑方更好";
  const tone =
    abs < 0.2 ? "balanced" : line.score > 0 ? "white" : "black";

  let severityLabel = "细微优势";
  if (abs < 0.2) severityLabel = "均势";
  else if (abs >= 3) severityLabel = "决定性优势";
  else if (abs >= 1.5) severityLabel = "明显优势";
  else if (abs >= 0.6) severityLabel = "小优势";

  const summary =
    tone === "balanced"
      ? "双方机会接近，重点是保持结构和不要制造战术弱点。"
      : `${sideLabel}，优势等级为${severityLabel}。`;

  const plan =
    tone === "balanced"
      ? `引擎首选 ${line.best_move}，可按 ${pvPreview(line)} 继续保持均衡。`
      : `首选 ${line.best_move}，主线 ${pvPreview(line)} 展示了扩大或巩固优势的方向。`;

  const risk =
    abs >= 1.5
      ? "优势方要优先避免战术反击，劣势方应寻找换子、将军或活跃子力的机会。"
      : "局面仍有弹性，一步缓手就可能让优势消失。";

  return {
    sideLabel,
    severityLabel,
    scoreLabel: formatScore(line.score),
    summary,
    plan,
    risk,
    tone,
  };
}
