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
  playerPosition?: string,
  authToken?: string
): Promise<{ ok: boolean; data?: string; error?: string; backend?: string }> {
  let res: Response;
  try {
    // Use same-origin proxy to avoid CORS issues (Safari)
    res = await fetch(`/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
      },
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

// Fetch consumer credit balance (requires auth)
export async function fetchCredits(authToken: string): Promise<{ credits: number; freeRemaining: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/consumer/credits`, {
      headers: { "Authorization": `Bearer ${authToken}` },
    });
    const json = await res.json();
    if (json.ok) return { credits: json.credits, freeRemaining: json.freeRemaining };
    return null;
  } catch {
    return null;
  }
}

// Create Stripe checkout session (requires auth)
export async function createCheckout(authToken: string, packId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const res = await fetch(`/api/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({ packId }),
    });
    const json = await res.json();
    if (json.ok && json.url) return { ok: true, url: json.url };
    return { ok: false, error: json?.error?.message || "Checkout failed" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Checkout error" };
  }
}
