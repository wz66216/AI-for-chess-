import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import App from "../App";
import { fetchHealth } from "../api/health";

vi.mock("../api/health", () => ({
  fetchHealth: vi.fn().mockResolvedValue({
    status: "healthy",
    service: "ChessExplain API",
    version: "1.0.0",
    api_prefix: "/api/v1",
    checks: { api: "ok", whitebox: "ok" },
  }),
}));

describe("App routes", () => {
  it("renders the Search Lab shell at /search-lab", async () => {
    render(
      <MemoryRouter initialEntries={["/search-lab"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "搜索实验室" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Search Lab")).toBeInTheDocument();
    expect(screen.getByText("局面设定工作台")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /确认并开始计算/i }),
    ).toBeInTheDocument();
  });

  it("renders the Health page at /health", async () => {
    render(
      <MemoryRouter initialEntries={["/health"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "部署自检" })).toBeInTheDocument();
    expect(screen.getByText("Deployment Health")).toBeInTheDocument();
    expect(fetchHealth).toHaveBeenCalled();
  });
});
