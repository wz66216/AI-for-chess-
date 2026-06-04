import { API_BASE } from "./config";

export interface HealthPayload {
  status: string;
  service?: string;
  version?: string;
  api_prefix?: string;
  checks?: Record<string, string>;
}

const HEALTH_URL = `${API_BASE}/health`;

export async function fetchHealth(signal?: AbortSignal): Promise<HealthPayload> {
  const response = await fetch(HEALTH_URL, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json() as Promise<HealthPayload>;
}

export { HEALTH_URL };
