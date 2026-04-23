"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { fetchGallery, deleteGalleryItem, createPrintCheckout, fetchSettings, proxyImageUrl, type GalleryItem, type SalesSettings } from "@/lib/api";
import SignInModal from "@/components/SignInModal";

export default function GalleryPage() {
  const { user, loading: authLoading } = useAuth();
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignIn, setShowSignIn] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [printCart, setPrintCart] = useState<Record<string, number>>({});
  const [printCheckoutLoading, setPrintCheckoutLoading] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SalesSettings | null>(null);

  useEffect(() => { fetchSettings().then(s => { if (s) setSettings(s); }); }, []);

  const handleDelete = async (item: GalleryItem) => {
    if (!user || !confirm('Delete this portrait? This cannot be undone.')) return;
    setDeleting(item.id);
    try {
      const token = await user.getIdToken();
      const result = await deleteGalleryItem(token, item.id);
      if (result.ok) {
        setGallery((prev) => prev.filter((g) => g.id !== item.id));
        setSelectedItem(null);
      } else {
        alert(result.error || 'Failed to delete');
      }
    } catch (e) {
      console.error('[delete] error:', e);
      alert('Failed to delete portrait');
    } finally {
      setDeleting(null);
    }
  };

  const loadGallery = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const items = await fetchGallery(token);
      setGallery(items.map(i => ({ ...i, imageUrl: proxyImageUrl(i.imageUrl) })));
    } catch (e) {
      console.error("[gallery] error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadGallery();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, loadGallery]);

  // Auto-close sign-in modal
  useEffect(() => {
    if (user && showSignIn) setShowSignIn(false);
  }, [user, showSignIn]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} onSuccess={() => setShowSignIn(false)} />

      {/* Selected portrait lightbox */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedItem(null)} />
          <div className="relative max-w-lg w-full flex flex-col items-center gap-4">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute -top-10 right-0 text-slate-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
              <img src={selectedItem.imageUrl} alt={selectedItem.playerName || "Portrait"} className="w-full h-auto" />
            </div>
            <div className="flex flex-col items-center gap-2">
              {selectedItem.playerName && (
                <p className="text-sm font-bold">
                  {selectedItem.playerName}
                  {selectedItem.playerNumber && <span className="text-slate-400"> #{selectedItem.playerNumber}</span>}
                </p>
              )}
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                {selectedItem.sport} · {selectedItem.mode === "portrait" ? "Portrait" : "Action Portrait"}
                {selectedItem.createdAt && <> · {new Date(selectedItem.createdAt).toLocaleDateString()}</>}
              </p>
              {/* Print ordering */}
              <div className="w-full max-w-sm mt-3 space-y-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold text-center">Order a Print</p>
                {(settings?.printPricing || [
                  { size: '12x12', price: 29.99, desc: 'Perfect for desks & shelves' },
                  { size: '24x24', price: 49.99, desc: 'Ideal wall size', popular: true },
                  { size: '36x36', price: 89.99, desc: 'Statement piece' },
                ]).map(pp => ({ id: `print-${pp.size}`, name: pp.size.replace('x', '\u00D7') + '\u2033', desc: pp.desc || '', price: pp.price, popular: pp.popular || false })).map((p) => {
                  const inCart = (printCart[p.id] || 0) > 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPrintCart((prev) => {
                        const next = { ...prev };
                        if (next[p.id]) { delete next[p.id]; } else { next[p.id] = 1; }
                        return next;
                      })}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition cursor-pointer ${
                        inCart ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          inCart ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'
                        }`}>
                          {inCart && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                        </span>
                        <span className="text-xs font-bold">{p.name}</span>
                        {p.popular && <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-bold">POPULAR</span>}
                        <span className="text-[10px] text-slate-500">{p.desc}</span>
                      </div>
                      <span className="text-xs font-black text-indigo-400">${p.price}</span>
                    </button>
                  );
                })}
                {Object.keys(printCart).length > 0 && (
                  <button
                    disabled={printCheckoutLoading}
                    onClick={async () => {
                      if (!user) return;
                      setPrintCheckoutLoading(true);
                      setPrintError(null);
                      try {
                        const products = (settings?.printPricing || [
                          { size: '12x12', price: 29.99 }, { size: '24x24', price: 49.99 }, { size: '36x36', price: 89.99 },
                        ]).map(pp => ({ id: `print-${pp.size}`, name: `${pp.size} Print`, price: pp.price, qty: 1 }));
                        const items = products.filter(p => printCart[p.id]).map(p => ({ id: p.id, name: p.name, price: p.price, qty: printCart[p.id] }));
                        const token = await user.getIdToken();
                        const res = await createPrintCheckout(token, items, selectedItem.imageUrl);
                        if (res.ok && res.url) {
                          window.location.href = res.url;
                        } else {
                          setPrintError(res.error || 'Checkout failed');
                        }
                      } catch (e) {
                        setPrintError(e instanceof Error ? e.message : 'Checkout error');
                      } finally {
                        setPrintCheckoutLoading(false);
                      }
                    }}
                    className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 font-black text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {printCheckoutLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                        </svg>
                        Checkout — ${Object.entries(printCart).reduce((total, [id, qty]) => {
                          const prices: Record<string, number> = Object.fromEntries((settings?.printPricing || [
                            { size: '12x12', price: 29.99 }, { size: '24x24', price: 49.99 }, { size: '36x36', price: 89.99 },
                          ]).map(pp => [`print-${pp.size}`, pp.price]));
                          return total + (prices[id] || 0) * (qty as number);
                        }, 0).toFixed(2)}
                      </>
                    )}
                  </button>
                )}
                {printError && <p className="text-xs text-red-400 text-center">{printError}</p>}
              </div>

              <div className="flex gap-3 mt-3">
                <Link
                  href={`/create?sport=${selectedItem.sport}`}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition flex items-center gap-1.5"
                >
                  Create Another
                </Link>
                <button
                  onClick={() => handleDelete(selectedItem)}
                  disabled={deleting === selectedItem.id}
                  className="px-5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-xs font-bold text-red-400 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting === selectedItem.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <nav className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0">
            <span className="text-xl font-black tracking-tight">👑 Royal Paws</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/create" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-black uppercase tracking-wider transition">
              Create
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">My Portraits</h1>
            <p className="text-sm text-slate-400 mt-1">All your AI-generated sports portraits in one place</p>
          </div>
          {gallery.length > 0 && (
            <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full font-bold">{gallery.length} portraits</span>
          )}
        </div>

        {/* Not signed in */}
        {!authLoading && !user && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <svg className="w-16 h-16 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-slate-400 text-sm">Sign in to view your saved portraits</p>
            <button
              onClick={() => setShowSignIn(true)}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-black uppercase tracking-wider transition cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && user && (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && user && gallery.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <svg className="w-16 h-16 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            <p className="text-slate-400 text-sm">No portraits yet</p>
            <Link
              href="/create"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-black uppercase tracking-wider transition"
            >
              Create Your First Portrait
            </Link>
          </div>
        )}

        {/* Gallery grid */}
        {!loading && gallery.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {gallery.map((item) => (
              <button
                key={item.id}
                onClick={() => { setSelectedItem(item); setPrintCart({}); setPrintError(null); }}
                className="group relative rounded-2xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer aspect-[3/4] bg-slate-900"
              >
                <img
                  src={item.imageUrl}
                  alt={item.playerName || "Portrait"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-xs font-bold text-white truncate">{item.playerName || "Portrait"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.playerNumber && <span className="text-[10px] text-slate-300">#{item.playerNumber}</span>}
                      <span className="text-[10px] text-slate-400 capitalize">{item.sport}</span>
                      <span className="text-[10px] text-slate-500">{item.mode === "portrait" ? "Portrait" : "Card"}</span>
                    </div>
                    {item.createdAt && (
                      <p className="text-[9px] text-slate-500 mt-1">{new Date(item.createdAt).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
