import clsx from "clsx";

import type { EvaluatorName } from "../../types/whitebox";

type Props = {
  value: EvaluatorName;
  onChange: (value: EvaluatorName) => void;
  disabled?: boolean;
};

const OPTIONS: Array<{
  value: EvaluatorName;
  title: string;
  description: string;
}> = [
  {
    value: "material",
    title: "子力评估",
    description: "只统计双方棋子的基础价值。",
  },
  {
    value: "pst",
    title: "位置表评估",
    description: "在子力价值上加入棋子位置加成。",
  },
  {
    value: "heuristic",
    title: "综合启发式",
    description: "综合考虑机动性、兵型与王安全。",
  },
];

export default function EvaluatorSelector({
  value,
  onChange,
  disabled,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-slate-500">      ② 选择评估器</div>
        <div className="text-lg font-semibold text-slate-900">局面评估方式</div>
        <p className="text-sm text-slate-600">评估器决定叶子节点如何打分。</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.title}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={clsx(
                "rounded-xl border p-4 text-left transition",
                selected
                  ? "border-blue-600 bg-blue-50 shadow-sm ring-2 ring-blue-200"
                  : "border-slate-200 bg-white",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <div className="font-semibold text-slate-900">{option.title}</div>
              <div className="mt-1 text-sm text-slate-600">
                {option.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
