import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchHealth, HEALTH_URL } from "./health";

describe("health API helper", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the backend health endpoint", async () => {
    const responseBody = {
      status: "healthy",
      service: "ChessExplain API",
      version: "1.0.0",
      api_prefix: "/api/v1",
      checks: { api: "ok", whitebox: "ok" },
    };
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    } as Response);

    await expect(fetchHealth()).resolves.toEqual(responseBody);
    expect(fetchMock).toHaveBeenCalledWith(HEALTH_URL, {
      headers: { Accept: "application/json" },
      signal: undefined,
    });
  });

  it("throws when the health endpoint fails", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({ ok: false, status: 503 } as Response);

    await expect(fetchHealth()).rejects.toThrow("Health check failed: 503");
  });
});
