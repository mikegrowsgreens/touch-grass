// Trail cam source resolution — cats direct from cataas (keyless), other
// themes via the /api/gif Giphy proxy, cats as the universal fallback.

import type { ParkConfig } from "./config";

export function cataasUrl(now = Date.now()): string {
  return "https://cataas.com/cat/gif?width=640&ts=" + now;
}

export async function resolveCamUrl(theme: ParkConfig["theme"]): Promise<string> {
  if (theme.preset === "cats") return cataasUrl();
  try {
    const params = new URLSearchParams({ theme: theme.preset });
    if (theme.preset === "custom" && theme.terms?.length) {
      params.set("terms", theme.terms.join(","));
    }
    const res = await fetch(`/api/gif?${params}`);
    if (!res.ok) throw new Error(String(res.status));
    const { url } = (await res.json()) as { url?: string };
    if (!url) throw new Error("no url");
    return url;
  } catch {
    return cataasUrl(); // resident mousers cover every ranger shortage
  }
}
