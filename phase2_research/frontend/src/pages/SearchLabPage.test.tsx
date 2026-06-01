import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import App from "../App";

describe("SearchLabPage route", () => {
  it("renders the Search Lab shell at /search-lab", () => {
    render(
      <MemoryRouter initialEntries={["/search-lab"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /搜索实验室|Search Lab/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("局面设定工作台")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /确认并开始计算/i }),
    ).toBeInTheDocument();
  });
});
