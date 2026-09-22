const base = process.env.BOT_DEPLOY_API_URL || "https://api.xdigitex.space/api";
async function request(path: string, init?: RequestInit) {
  const key = process.env.BOT_DEPLOY_API_KEY;
  if (!key) throw new Error("Bot deployment API is not configured");
  const res = await fetch(`${base}${path}`, { ...init, headers: { "X-API-Key": key, "Content-Type": "application/json", ...init?.headers } });
  if (!res.ok) throw new Error(`Deployment service error (${res.status})`);
  return res.json();
}
export const deployApi = {
  catalogue: () => request("/external/bots", { next: { revalidate: 300 } } as RequestInit),
  deploy: (body: unknown) => request("/external/deploy", { method: "POST", body: JSON.stringify(body) }),
  status: (jobId: string) => request(`/external/status/${encodeURIComponent(jobId)}`, { cache: "no-store" }),
  action: (action: string, app: string, body?: unknown) => request(`/external/${action}/${encodeURIComponent(app)}`, { method: action === "config" ? "PATCH" : action === "delete" ? "DELETE" : "POST", body: body ? JSON.stringify(body) : undefined }),
  check: (app: string) => request(`/external/check/${encodeURIComponent(app)}`, { cache: "no-store" }),
  logs: (app: string, lines = 200) => request(`/logs/${encodeURIComponent(app)}?lines=${lines}`, { cache: "no-store" }),
  config: (app: string) => request(`/external/config/${encodeURIComponent(app)}`, { cache: "no-store" }),
};
