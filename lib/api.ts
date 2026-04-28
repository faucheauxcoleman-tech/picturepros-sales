const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://studio.picturepros.ai";

// Convert direct GCS URLs to proxy-friendly /img/ paths
export function proxyImageUrl(url: string): string {
  if (!url) return url;
  const gcsPrefix = "https://storage.googleapis.com/colemans-ai-database.firebasestorage.app/";
  if (url.startsWith(gcsPrefix)) return `/img/${url.slice(gcsPrefix.length)}`;
  return url;
}

// Session tracking
export async function trackSession(action: 'start' | 'end', sessionId: string, token: string, durationMs?: number) {
  try {
    await fetch(`${API_BASE}/api/consumer/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action, sessionId, durationMs, page: typeof window !== 'undefined' ? window.location.pathname : '/' }),
    });
  } catch { /* silent */ }
}

export interface SalesSettings {
  freePortraits: number;
  pricing: { id: string; name: string; portraits: number; price: number; featured: boolean }[];
  enabledSports: string[];
  printPricing: { size: string; price: number; otoPct?: number; desc?: string; popular?: boolean }[];
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
  style: string,
  petName?: string,
  playerNumber?: string,
  playerPosition?: string,
  authToken?: string,
  mode?: string,
  sessionId?: string
): Promise<{ ok: boolean; data?: string; savedImageUrl?: string; genId?: string; sessionId?: string; error?: string; backend?: string }> {
  let res: Response;
  try {
    // Use same-origin proxy to avoid CORS issues (Safari)
    res = await fetch(`/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        photoBase64,
        sport: style,
        playerName: petName,
        brand: 'royal-paws',
        mode: mode || 'portrait',
        ...(sessionId ? { sessionId } : {}),
      }),
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

  return {
    ok: true,
    data: json.data as string,
    savedImageUrl: json.savedImageUrl as string | undefined,
    genId: json.genId as string | undefined,
    sessionId: json.sessionId as string | undefined,
    backend: json.backend as string,
  };
}

// Anonymous lead capture — links email to anonymous generations by sessionId
export async function claimGeneration(
  sessionId: string,
  email: string,
  source: string = 'royal-paws-homepage'
): Promise<{ ok: boolean; linked?: number; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/consumer/claim-generation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, email, source }),
    });
    const json = await res.json();
    if (json.ok) return { ok: true, linked: json.linked };
    return { ok: false, error: json?.error?.message || 'Claim failed' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Claim error' };
  }
}

// Fetch consumer credit balance (requires auth)
export async function fetchCredits(authToken: string): Promise<{ credits: number; bonusCredits: number; freeRemaining: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/consumer/credits`, {
      headers: { "Authorization": `Bearer ${authToken}` },
    });
    const json = await res.json();
    if (json.ok) return { credits: json.credits, bonusCredits: json.bonusCredits || 0, freeRemaining: json.freeRemaining };
    return null;
  } catch {
    return null;
  }
}

// Verify & fulfill purchase after Stripe redirect (fallback if webhook missed)
export async function verifyPurchase(authToken: string): Promise<{ ok: boolean; fulfilled: boolean; credits: number; freeRemaining: number; purchaseValue: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/consumer/verify-purchase`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" },
    });
    const json = await res.json();
    if (json.ok) return { ok: true, fulfilled: json.fulfilled, credits: json.credits, freeRemaining: json.freeRemaining, purchaseValue: json.purchaseValue || 0 };
    return null;
  } catch {
    return null;
  }
}

// Fetch user's saved portrait gallery (requires auth)
export interface GalleryItem {
  id: string;
  sport: string;
  mode: string;
  playerName: string;
  playerNumber: string;
  imageUrl: string;
  createdAt: string | null;
}

export async function fetchGallery(authToken: string): Promise<GalleryItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/consumer/gallery`, {
      headers: { "Authorization": `Bearer ${authToken}` },
    });
    const json = await res.json();
    if (json.ok && json.items) return json.items;
    return [];
  } catch {
    return [];
  }
}

// Fetch user's order history (requires auth)
export interface OrderItem {
  id: string;
  type: 'print' | 'credits';
  amount: number;
  currency: string;
  status: string;
  itemSummary: string;
  imageUrl: string | null;
  createdAt: string;
  shipping: { name: string; address: Record<string, string> } | null;
}

export async function fetchOrders(authToken: string): Promise<OrderItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/consumer/orders`, {
      headers: { "Authorization": `Bearer ${authToken}` },
    });
    const json = await res.json();
    if (json.ok && json.orders) return json.orders;
    return [];
  } catch {
    return [];
  }
}

// Delete a portrait from user's gallery (requires auth)
export async function deleteGalleryItem(authToken: string, itemId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/consumer/gallery/${itemId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${authToken}` },
    });
    const json = await res.json();
    return json.ok ? { ok: true } : { ok: false, error: json?.error?.message || "Delete failed" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Delete error" };
  }
}

// Create Stripe checkout session for print orders.
// Pass authToken for logged-in users, OR sessionId+email for anonymous guest checkout.
export async function createPrintCheckout(
  authTokenOrNull: string | null,
  items: { id: string; name: string; price: number; qty: number }[],
  imageUrl: string,
  guest?: { sessionId: string; email: string }
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authTokenOrNull) headers["Authorization"] = `Bearer ${authTokenOrNull}`;
    const body: Record<string, unknown> = { items, imageUrl, brand: 'royal-paws' };
    if (guest && !authTokenOrNull) {
      body.sessionId = guest.sessionId;
      body.email = guest.email;
    }
    const res = await fetch(`${API_BASE}/api/consumer/print-checkout`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.ok && json.url) return { ok: true, url: json.url };
    return { ok: false, error: json?.error?.message || "Checkout failed" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Checkout error" };
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
