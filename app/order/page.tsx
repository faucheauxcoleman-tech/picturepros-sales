"use client";

import React, { useState, useRef, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { createPrintCheckout, fetchSettings, proxyImageUrl, type SalesSettings } from "@/lib/api";
import { trackAddToCart, trackInitiateCheckout } from "@/lib/pixel";
import SignInModal from "@/components/SignInModal";

const DEFAULT_PRINTS = [
  { size: '12x12', price: 29.99, desc: 'Perfect for desks, shelves, and small spaces. Premium matte finish.', popular: false },
  { size: '24x24', price: 49.99, desc: 'Ideal size for bedrooms and man caves. Museum-quality paper.', popular: true },
  { size: '36x36', price: 89.99, desc: 'Statement piece. Gallery-ready, vivid colors that pop.', popular: false },
];

function OrderPageInner() {
  const params = useSearchParams();
  const { user } = useAuth();
  // Read image from sessionStorage (avoids massive base64 in URL)
  const [imageUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('order_image');
      if (stored) return proxyImageUrl(stored);
    }
    return proxyImageUrl(params.get("image") || "");
  });
  const mode = params.get("mode") || "card";
  const playerName = params.get("name") || "";
  const playerNumber = params.get("number") || "";

  const [settings, setSettings] = useState<SalesSettings | null>(null);
  useEffect(() => { fetchSettings().then(s => { if (s) setSettings(s); }); }, []);
  const products = (settings?.printPricing || DEFAULT_PRINTS).map(pp => ({ id: `print-${pp.size}`, name: `${pp.size.replace('x', '\u00D7')}\u2033 Print`, desc: pp.desc || '', price: pp.price, popular: pp.popular || false, qty: 1 }));
  const [cart, setCartRaw] = useState<Record<string, number>>({});
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const checkoutAbort = useRef<AbortController | null>(null);

  // Reset checkout state whenever cart changes
  const setCart: typeof setCartRaw = useCallback((update) => {
    if (checkoutAbort.current) { checkoutAbort.current.abort(); checkoutAbort.current = null; }
    setCheckoutLoading(false);
    setCheckoutError(null);
    setCartRaw(update);
  }, []);
  const [showSignIn, setShowSignIn] = useState(false);
  const successParam = params.get("success");

  const totalItems = Object.values(cart).reduce((s, q) => s + q, 0);
  const totalPrice = products.reduce((s, p) => s + (cart[p.id] || 0) * p.price, 0);

  const handleCheckout = async () => {
    if (!user) { setShowSignIn(true); return; }
    setCheckoutLoading(true);
    setCheckoutError(null);
    const abort = new AbortController();
    checkoutAbort.current = abort;
    try {
      const token = await user.getIdToken();
      const cartItems = products
        .filter(p => (cart[p.id] || 0) > 0)
        .map(p => ({ id: p.id, name: p.name, price: p.price, qty: cart[p.id] }));
      trackInitiateCheckout();
      const result = await createPrintCheckout(token, cartItems, imageUrl);
      if (abort.signal.aborted) return;
      if (result.ok && result.url) {
        window.location.href = result.url;
      } else {
        setCheckoutError(result.error || "Failed to start checkout");
        setCheckoutLoading(false);
      }
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Checkout error");
      setCheckoutLoading(false);
    }
  };

  if (successParam) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black">Order Confirmed!</h1>
          <p className="text-sm text-slate-400 mt-2">Your prints are being prepared and will ship soon.</p>
          <p className="text-xs text-slate-500 mt-1">You&apos;ll receive a confirmation email with tracking info.</p>
        </div>
        <div className="flex gap-3 mt-4">
          <Link href="/create" className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-black uppercase tracking-wider transition">
            Create Another
          </Link>
          <Link href="/gallery" className="px-6 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-sm font-bold text-slate-300 transition">
            My Portraits
          </Link>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">No image selected</p>
        <Link href="/create" className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-black uppercase tracking-wider transition">
          Create a Portrait
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} onSuccess={() => setShowSignIn(false)} />

      {/* Header */}
      <nav className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0">
            <span className="text-xl font-black tracking-tight">👑 Royal Paws</span>
          </Link>
          <Link href="/create" className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Studio
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Page title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
Order Prints
          </h1>
          <p className="text-sm text-slate-400 mt-2">Premium quality, shipped directly to your door</p>
        </div>

        {/* Main layout: image left, products right */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">

          {/* Left: Portrait preview */}
          <div className="w-full lg:w-1/2 flex flex-col items-center lg:sticky lg:top-24">
            <div className={`relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/30 ${mode === "card" ? "max-w-xs" : "max-w-sm"} w-full`}>
              <img src={imageUrl} alt={playerName || "Portrait"} className="w-full h-auto" />
            </div>
            {playerName && (
              <div className="mt-4 text-center">
                <p className="text-sm font-bold text-white">
                  {playerName}
                  {playerNumber && <span className="text-slate-400 ml-1">#{playerNumber}</span>}
                </p>
              </div>
            )}
            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span>Secure checkout</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                <span>Free shipping</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                <span>Premium quality</span>
              </div>
            </div>
          </div>

          {/* Right: Product options + checkout */}
          <div className="w-full lg:w-1/2">
            <div className="space-y-4">
              {products.map((p) => {
                const qty = cart[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    className={`relative rounded-2xl border p-5 transition-all ${
                      qty > 0
                        ? "border-indigo-500/60 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                        : "border-slate-700/50 bg-slate-900/60 hover:border-slate-600"
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-2.5 left-5 px-3 py-0.5 bg-indigo-500 rounded-full text-[9px] font-black uppercase tracking-wider text-white">
                        Most Popular
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-3">
                          <h3 className="text-lg font-black text-white">{p.name}</h3>
                          <span className="text-lg font-black text-indigo-400">${p.price.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{p.desc}</p>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-1.5 shrink-0 mt-1">
                        {qty > 0 ? (
                          <>
                            <button
                              onClick={() => setCart((c) => {
                                const next = { ...c };
                                if (next[p.id] <= 1) delete next[p.id];
                                else next[p.id]--;
                                return next;
                              })}
                              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition cursor-pointer"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-sm font-black text-white">{qty}</span>
                            <button
                              onClick={() => setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }))}
                              className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer"
                            >
                              +
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setCart((c) => ({ ...c, [p.id]: 1 })); trackAddToCart(p.price); }}
                            className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-300 transition cursor-pointer"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Free shipping banner */}
            <div className="mt-6 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <div>
                <p className="text-xs font-bold text-emerald-400">Free Shipping on All Orders</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Delivered in 5-7 business days</p>
              </div>
            </div>

            {/* Checkout summary */}
            {totalItems > 0 && (
              <div className="mt-6 p-5 rounded-2xl bg-slate-900 border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Order Summary</p>
                    <p className="text-sm text-slate-500 mt-0.5">{totalItems} {totalItems === 1 ? "item" : "items"}</p>
                  </div>
                  <p className="text-2xl font-black text-white">${totalPrice.toFixed(2)}</p>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite] hover:shadow-lg hover:shadow-indigo-500/25 font-black text-sm uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkoutLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121 0 2.09-.773 2.348-1.87l1.614-6.87H6.1m1.4 8.742a3 3 0 11-6 0 3 3 0 016 0zm12 0a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  {checkoutLoading ? "Processing..." : `Checkout — $${totalPrice.toFixed(2)}`}
                </button>
                {checkoutError && <p className="text-xs text-red-400 text-center mt-2">{checkoutError}</p>}
                <p className="text-[10px] text-slate-600 text-center mt-3">Secure payment powered by Stripe</p>
              </div>
            )}

            {/* Empty cart nudge */}
            {totalItems === 0 && (
              <div className="mt-6 text-center py-4">
                <p className="text-xs text-slate-600">Select a product above to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <OrderPageInner />
    </Suspense>
  );
}
