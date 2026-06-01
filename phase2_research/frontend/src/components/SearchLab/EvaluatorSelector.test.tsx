import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import EvaluatorSelector from "./EvaluatorSelector";

describe("EvaluatorSelector", () => {
  it("renders evaluator choices with teaching description", () => {
    render(<EvaluatorSelector value="material" onChange={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /子力评估/i, pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /位置表评估/i, pressed: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /综合启发式/i, pressed: false }),
    ).toBeInTheDocument();
    expect(screen.getByText("只统计双方棋子的基础价值。")).toBeInTheDocument();
  });

  it("emits heuristic when clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<EvaluatorSelector value="material" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /综合启发式/i }));

    expect(onChange).toHaveBeenCalledWith("heuristic");
  });
});
