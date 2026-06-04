import { useEffect, useState } from "react";

import { API_BASE } from "../api/config";
import { fetchHealth, type HealthPayload } from "../api/health";

type LoadState = "idle" | "loading" | "success" | "error";

function StatusBadge({ status }: { status: string }) {
  const healthy = status.toLowerCase() === "healthy";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
        healthy
          ? "bg-emerald-100 text-emerald-700"
          : "bg-rose-100 text-rose-700"
      }`}
    >
      {status}
    </span>
  );
}

function CheckRow({ name, value }: { name: string; value: string }) {
  const ok = value.toLowerCase() === "ok";
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
      <span className="font-medium text-slate-800">{name}</span>
      <span className={ok ? "text-emerald-700" : "text-rose-700"}>{value}</span>
    </div>
  );
}

export default function HealthPage() {
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState("");

  const runCheck = async (signal?: AbortSignal) => {
    setState("loading");
    setError("");
    try {
      const next = await fetchHealth(signal);
      setPayload(next);
      setState("success");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setPayload(null);
      setError(caught instanceof Error ? caught.message : "Health check failed");
      setState("error");
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void runCheck(controller.signal);
    return () => controller.abort();
  }, []);

  const checks = Object.entries(payload?.checks ?? {});

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
          Deployment Health
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          部署自检
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          用当前前端配置请求后端 `/health`，快速判断 Cloudflare Pages、Railway
          和本地 API 是否串联正常。
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">API Base</div>
          <div className="mt-1 break-all font-mono text-sm text-slate-900">
            {API_BASE}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">请求状态</div>
          <div className="mt-2">
            {state === "success" && payload ? (
              <StatusBadge status={payload.status} />
            ) : state === "loading" ? (
              <span className="text-slate-600">正在检查...</span>
            ) : state === "error" ? (
              <span className="text-rose-700">检查失败</span>
            ) : (
              <span className="text-slate-600">等待检查</span>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {payload ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">服务</div>
            <div className="mt-1 font-semibold text-slate-900">
              {payload.service ?? "-"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">版本</div>
            <div className="mt-1 font-semibold text-slate-900">
              {payload.version ?? "-"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">API 前缀</div>
            <div className="mt-1 font-mono font-semibold text-slate-900">
              {payload.api_prefix ?? "-"}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">后端检查项</h3>
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={() => void runCheck()}
          >
            重新检查
          </button>
        </div>
        {checks.length ? (
          <div className="space-y-2">
            {checks.map(([name, value]) => (
              <CheckRow key={name} name={name} value={value} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">暂无检查项。</p>
        )}
      </div>
    </section>
  );
}
