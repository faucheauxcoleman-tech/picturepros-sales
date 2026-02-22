const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface SalesSettings {
  freePortraits: number;
  pricing: { id: string; name: string; portraits: number; price: number; featured: boolean }[];
  enabledSports: string[];
  printPricing: { size: string; price: number }[];
}

export async function fetchSettings(): Promise<SalesSettings | null> {
  try {
    const res = await fetch(`${API_BASE}/api/consumer/settings`);
    const json = await res.json();
    return json.ok && json.data ? json.data : null;
  } catch {
    return null;
  }
}

export async function generatePortrait(
  photoBase64: string,
  sport: string,
  playerName?: string,
  playerNumber?: string,
  playerPosition?: string
): Promise<{ ok: boolean; data?: string; error?: string; backend?: string }> {
  let res: Response;
  try {
    // Use same-origin proxy to avoid CORS issues (Safari)
    res = await fetch(`/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoBase64, sport, playerName, playerNumber, playerPosition }),
    });
  } catch (e) {
    return { ok: false, error: `Network error: ${e instanceof Error ? e.message : 'Failed to reach server'}` };
  }

  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: `Server returned invalid response (${res.status})` };
  }

  if (!res.ok) {
    const errMsg = (json?.error as Record<string, unknown>)?.message || json?.message || `Server error ${res.status}`;
    return { ok: false, error: String(errMsg) };
  }

  return { ok: true, data: json.data as string, backend: json.backend as string };
}
