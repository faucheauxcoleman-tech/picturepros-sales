// Meta Pixel event helpers
// fbq is loaded globally via the script in layout.tsx

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq(...args);
  }
}

/** User completed sign-up / sign-in */
export function trackLead() {
  fbq("track", "Lead");
}

/** User viewed the generated portrait result */
export function trackViewContent(sport: string, mode: string) {
  fbq("track", "ViewContent", {
    content_category: sport,
    content_type: mode,
  });
}

/** User clicked Order Prints / landed on order page */
export function trackAddToCart(value: number, currency = "USD") {
  fbq("track", "AddToCart", { value, currency });
}

/** User completed a credit purchase */
export function trackPurchase(value: number, currency = "USD") {
  fbq("track", "Purchase", { value, currency });
}

/** User started the portrait creation flow */
export function trackInitiateCheckout() {
  fbq("track", "InitiateCheckout");
}
