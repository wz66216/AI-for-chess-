import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HealthPage from "./HealthPage";
import { fetchHealth } from "../api/health";

vi.mock("../api/health", () => ({
  fetchHealth: vi.fn(),
}));

const healthyPayload = {
  status: "healthy",
  service: "ChessExplain API",
  version: "1.0.0",
  api_prefix: "/api/v1",
  checks: { api: "ok", whitebox: "ok" },
};

describe("HealthPage", () => {
  beforeEach(() => {
    vi.mocked(fetchHealth).mockReset();
  });

  it("renders backend health details", async () => {
    vi.mocked(fetchHealth).mockResolvedValue(healthyPayload);

    render(<HealthPage />);

    expect(screen.getByText("部署自检")).toBeInTheDocument();
    expect(await screen.findByText("healthy")).toBeInTheDocument();
    expect(screen.getByText("ChessExplain API")).toBeInTheDocument();
    expect(screen.getByText("/api/v1")).toBeInTheDocument();
    expect(screen.getByText("api")).toBeInTheDocument();
    expect(screen.getByText("whitebox")).toBeInTheDocument();
  });

  it("can rerun the health check", async () => {
    vi.mocked(fetchHealth)
      .mockResolvedValueOnce(healthyPayload)
      .mockResolvedValueOnce({
        ...healthyPayload,
        checks: { api: "ok", whitebox: "ok", opening_book: "ok" },
      });

    render(<HealthPage />);

    await screen.findByText("healthy");
    await userEvent.click(screen.getByRole("button", { name: "重新检查" }));

    expect(await screen.findByText("opening_book")).toBeInTheDocument();
    expect(fetchHealth).toHaveBeenCalledTimes(2);
  });

  it("shows an error when the health request fails", async () => {
    vi.mocked(fetchHealth).mockRejectedValue(new Error("Health check failed: 503"));

    render(<HealthPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Health check failed: 503",
      );
    });
  });
});
