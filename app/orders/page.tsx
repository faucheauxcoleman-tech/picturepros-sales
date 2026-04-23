"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { fetchOrders, proxyImageUrl, type OrderItem } from "@/lib/api";
import SignInModal from "@/components/SignInModal";

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignIn, setShowSignIn] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const items = await fetchOrders(token);
      setOrders(items.map(o => ({ ...o, imageUrl: o.imageUrl ? proxyImageUrl(o.imageUrl) : null })));
    } catch (e) {
      console.error("[orders] error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadOrders();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, loadOrders]);

  useEffect(() => {
    if (user && showSignIn) setShowSignIn(false);
  }, [user, showSignIn]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatAddress = (addr: Record<string, string>) => {
    const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} onSuccess={() => setShowSignIn(false)} />

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
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">My Orders</h1>
            <p className="text-sm text-slate-400 mt-1">Your purchase and print order history</p>
          </div>
          {orders.length > 0 && (
            <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full font-bold">{orders.length} orders</span>
          )}
        </div>

        {/* Not signed in */}
        {!authLoading && !user && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <svg className="w-16 h-16 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-slate-400 text-sm">Sign in to view your orders</p>
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
        {!loading && user && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <svg className="w-16 h-16 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <p className="text-slate-400 text-sm">No orders yet</p>
            <Link
              href="/create"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-black uppercase tracking-wider transition"
            >
              Create a Portrait
            </Link>
          </div>
        )}

        {/* Orders list */}
        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Image thumbnail for print orders */}
                  {order.type === "print" && order.imageUrl && (
                    <div className="w-16 h-20 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-slate-800">
                      <img src={order.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Icon for credit orders */}
                  {order.type === "credits" && (
                    <div className="w-16 h-20 rounded-xl border border-slate-700 shrink-0 bg-slate-800 flex items-center justify-center">
                      <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                      </svg>
                    </div>
                  )}

                  {/* Order details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        order.type === "print"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      }`}>
                        {order.type === "print" ? "Print Order" : "Credits"}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        order.status === "paid"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}>
                        {order.status === "paid" ? "Paid" : order.status}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-white mt-1.5 truncate">
                      {order.itemSummary || (order.type === "print" ? "Print Order" : "Credit Purchase")}
                    </p>

                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">{formatDate(order.createdAt)}</span>
                      {order.shipping && (
                        <span className="text-xs text-slate-600">
                          → {order.shipping.name}{order.shipping.address ? `, ${formatAddress(order.shipping.address)}` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-white">${order.amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
