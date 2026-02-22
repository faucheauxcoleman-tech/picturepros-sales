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
  const res = await fetch(`${API_BASE}/api/consumer/portrait`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoBase64, sport, playerName, playerNumber, playerPosition }),
  });

  const json = await res.json();

  if (!res.ok) {
    return { ok: false, error: json?.error?.message || `Server error ${res.status}` };
  }

  return { ok: true, data: json.data, backend: json.backend };
}
