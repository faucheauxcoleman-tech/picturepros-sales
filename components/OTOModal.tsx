"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

const OTO_DISCOUNT_DEFAULT = 0.40; // 40% off fallback
const OTO_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface PrintOption {
  size: string;
  price: number;
  otoPct?: number; // per-size OTO discount percentage (0-99)
  desc?: string;
  popular?: boolean;
}

interface OTOModalProps {
  open: boolean;
  onClose: () => void;
  onExpired: () => void;
  imageUrl: string;
  petName: string;
  styleName: string;
  printPricing: PrintOption[];
  onCheckout: (items: { id: string; name: string; price: number; qty: number }[], imageUrl: string) => void;
  checkoutLoading: boolean;
  headline?: string;
}

function formatTime(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function OTOModal({
  open,
  onClose,
  onExpired,
  imageUrl,
  petName,
  styleName,
  printPricing,
  onCheckout,
  checkoutLoading,
  headline,
}: OTOModalProps) {
  const [timeLeft, setTimeLeft] = useState(OTO_DURATION_MS);
  const [cart, setCart] = useState<Record<string, number>>({});
  const startRef = useRef(Date.now());
  const expiredRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Countdown timer
  useEffect(() => {
    if (!open) return;
    startRef.current = Date.now();
    expiredRef.current = false;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = OTO_DURATION_MS - elapsed;
      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpired();
        }
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [open, onExpired]);

  // Draw canvas mockup: single large print hanging in a realistic room
  const drawMockup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 700, H = 480;
    canvas.width = W;
    canvas.height = H;

    // ── Wall: warm matte paint ──
    const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
    wallGrad.addColorStop(0, "#e8e0d4");
    wallGrad.addColorStop(0.5, "#ddd4c6");
    wallGrad.addColorStop(1, "#cec3b2");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    // Warm top-left ambient light
    const amb = ctx.createRadialGradient(W * 0.3, H * 0.1, 10, W * 0.4, H * 0.35, W * 0.7);
    amb.addColorStop(0, "rgba(255,248,230,0.25)");
    amb.addColorStop(0.6, "rgba(255,248,230,0.04)");
    amb.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = amb;
    ctx.fillRect(0, 0, W, H);

    // Fine wall texture
    const wallData = ctx.getImageData(0, 0, W, H);
    const wd = wallData.data;
    for (let i = 0; i < wd.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      wd[i] = Math.min(255, Math.max(0, wd[i] + n));
      wd[i + 1] = Math.min(255, Math.max(0, wd[i + 1] + n));
      wd[i + 2] = Math.min(255, Math.max(0, wd[i + 2] + n));
    }
    ctx.putImageData(wallData, 0, 0);

    // ── Furniture surface (credenza/shelf) at bottom ──
    const furnitureY = H * 0.78;
    const furnitureH = H - furnitureY;
    // Dark walnut wood surface
    const woodGrad = ctx.createLinearGradient(0, furnitureY, 0, H);
    woodGrad.addColorStop(0, "#3d2b1f");
    woodGrad.addColorStop(0.15, "#4a3328");
    woodGrad.addColorStop(0.5, "#3a2920");
    woodGrad.addColorStop(1, "#2e1f16");
    ctx.fillStyle = woodGrad;
    ctx.fillRect(0, furnitureY, W, furnitureH);
    // Top edge highlight
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, furnitureY, W, 2);
    // Subtle wood grain lines
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    for (let y = furnitureY + 8; y < H; y += 6) {
      ctx.fillRect(0, y, W, 1);
    }

    // ── Decorative items on the shelf ──
    // Small plant on the left
    const plantX = W * 0.12, plantBaseY = furnitureY;
    // Pot
    ctx.fillStyle = "#c47a4a";
    ctx.fillRect(plantX - 14, plantBaseY - 28, 28, 28);
    ctx.fillStyle = "#b06838";
    ctx.fillRect(plantX - 16, plantBaseY - 30, 32, 4);
    // Leaves (simple green circles)
    ctx.fillStyle = "#5a8a4a";
    ctx.beginPath(); ctx.arc(plantX, plantBaseY - 42, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4d7a3e";
    ctx.beginPath(); ctx.arc(plantX - 10, plantBaseY - 48, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6b9a58";
    ctx.beginPath(); ctx.arc(plantX + 10, plantBaseY - 46, 11, 0, Math.PI * 2); ctx.fill();

    // Books on the right
    const bookX = W * 0.82;
    const books = [
      { w: 18, h: 36, color: "#8b4a3a" },
      { w: 14, h: 32, color: "#3a5a7a" },
      { w: 16, h: 38, color: "#5a6a4a" },
      { w: 12, h: 30, color: "#9a7a5a" },
    ];
    let bx = bookX;
    books.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, plantBaseY - b.h, b.w, b.h);
      // Spine highlight
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(bx + 1, plantBaseY - b.h, 2, b.h);
      bx += b.w + 2;
    });

    // ── The main framed print (centered on wall) ──
    const printSide = Math.round(H * 0.52);
    const printX = Math.round((W - printSide) / 2);
    const printY = Math.round(furnitureY * 0.12);

    // Shadow behind frame
    for (let s = 6; s >= 1; s--) {
      ctx.fillStyle = `rgba(0,0,0,${0.018 * s})`;
      const off = s * 4;
      ctx.fillRect(printX - off / 2 + 3, printY - off / 2 + 4 + s, printSide + off, printSide + off);
    }

    // Frame — dark wood frame
    const frameW = 10;
    // Outer frame
    ctx.fillStyle = "#2a1f15";
    ctx.fillRect(printX - frameW, printY - frameW, printSide + frameW * 2, printSide + frameW * 2);
    // Inner frame bevel
    ctx.fillStyle = "#3d2c1e";
    ctx.fillRect(printX - frameW + 3, printY - frameW + 3, printSide + frameW * 2 - 6, printSide + frameW * 2 - 6);
    // Frame highlight (top-left edge)
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(printX - frameW, printY - frameW, printSide + frameW * 2, 2);
    ctx.fillRect(printX - frameW, printY - frameW, 2, printSide + frameW * 2);

    // White mat border
    const matW = 6;
    ctx.fillStyle = "#faf8f4";
    ctx.fillRect(printX - matW, printY - matW, printSide + matW * 2, printSide + matW * 2);

    // Image area
    ctx.fillStyle = "#f5f0ea";
    ctx.fillRect(printX, printY, printSide, printSide);

    // Load and draw portrait
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      ctx.drawImage(img, printX, printY, printSide, printSide);

      // Subtle glass reflection
      const gloss = ctx.createLinearGradient(printX, printY, printX + printSide * 0.6, printY + printSide * 0.6);
      gloss.addColorStop(0, "rgba(255,255,255,0.07)");
      gloss.addColorStop(0.4, "rgba(255,255,255,0)");
      ctx.fillStyle = gloss;
      ctx.fillRect(printX, printY, printSide, printSide);

      // Spotlight on the print from above
      const spot = ctx.createRadialGradient(W / 2, printY - 30, 20, W / 2, printY + printSide * 0.4, printSide * 0.7);
      spot.addColorStop(0, "rgba(255,250,235,0.12)");
      spot.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = spot;
      ctx.fillRect(0, 0, W, H);

      // Vignette for atmosphere
      const vig = ctx.createRadialGradient(W / 2, H * 0.4, H * 0.3, W / 2, H * 0.4, W * 0.62);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.12)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);
    };
    img.src = imageUrl;
  }, [imageUrl, printPricing]);

  useEffect(() => {
    if (open) drawMockup();
  }, [open, drawMockup]);

  // Free download handler — applies watermark before download
  const handleFreeDownload = () => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const cx = c.getContext("2d");
      if (!cx) return;
      cx.drawImage(img, 0, 0);
      cx.save();
      cx.translate(c.width / 2, c.height / 2);
      cx.rotate(-Math.PI / 4);
      cx.font = `bold ${Math.max(24, Math.floor(c.width / 14))}px sans-serif`;
      cx.fillStyle = "rgba(255,255,255,0.55)";
      cx.textAlign = "center";
      cx.textBaseline = "middle";
      const text = "SAMPLE";
      const gap = Math.max(100, Math.floor(c.width / 5));
      const span = Math.max(c.width, c.height) * 1.5;
      for (let y = -span; y < span; y += gap) {
        for (let x = -span; x < span; x += gap * 1.8) {
          cx.fillText(text, x, y);
        }
      }
      cx.restore();
      const link = document.createElement("a");
      link.href = c.toDataURL("image/jpeg", 0.92);
      link.download = `${petName || "portrait"}-digital.jpg`;
      link.click();
    };
    img.onerror = () => {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `${petName || "portrait"}-digital.jpg`;
      link.click();
    };
    img.src = imageUrl;
  };

  const discountedProducts = printPricing.map((pp) => {
    const original = pp.price;
    const pct = (pp.otoPct != null ? pp.otoPct : OTO_DISCOUNT_DEFAULT * 100) / 100;
    const discounted = Math.round(original * (1 - pct) * 100) / 100;
    return {
      id: `print-${pp.size}`,
      size: pp.size,
      name: `${pp.size.replace("x", "\u00D7")}\u2033 Print`,
      original,
      price: discounted,
      desc: pp.desc || "",
      popular: pp.popular || false,
    };
  });

  const cartTotal = discountedProducts.reduce(
    (sum, p) => sum + (cart[p.id] || 0) * p.price,
    0
  );

  const handleCheckout = () => {
    const items = discountedProducts
      .filter((p) => cart[p.id])
      .map((p) => ({ id: p.id, name: p.name, price: p.price, qty: cart[p.id] }));
    if (items.length === 0) return;
    onCheckout(items, imageUrl);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 my-8 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/50 rounded-3xl shadow-2xl shadow-indigo-500/10 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-500">
        {/* Timer bar at top */}
        <div className="relative h-1 bg-slate-800">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-1000"
            style={{ width: `${(timeLeft / OTO_DURATION_MS) * 100}%` }}
          />
        </div>


        <div className="p-6 sm:p-8">
          {/* Timer badge */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-black text-red-400 uppercase tracking-wider">
                Offer expires in: {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          {/* Canvas mockup visualization */}
          <div className="flex justify-center mb-5">
            <div className="rounded-2xl overflow-hidden border border-slate-700/50 shadow-lg">
              <canvas
                ref={canvasRef}
                className="w-full max-w-[460px] h-auto"
                style={{ aspectRatio: "700/480" }}
              />
            </div>
          </div>

          {/* Impulse pitch copy */}
          <div className="text-center mb-5">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {headline || `Doesn't ${petName || "your pet"} deserve to be hung in the actual living room? 👑🐾`}
            </h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Your free digital portrait is below! But for the next{" "}
              <span className="text-amber-400 font-bold">{Math.ceil(timeLeft / 60000)} minutes</span>, get this
              masterpiece
              {petName ? ` (${petName} as ${styleName})` : ""} on a high-end{" "}
              <span className="text-white font-bold">Gallery Print</span> for{" "}
              <span className="text-emerald-400 font-black">{Math.round((printPricing[0]?.otoPct ?? OTO_DISCOUNT_DEFAULT * 100))}% OFF</span>.
            </p>
          </div>

          {/* Free download button */}
          <button
            onClick={handleFreeDownload}
            className="w-full mb-5 px-6 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-sm transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Free Digital Portrait
          </button>

          {/* Discount label */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              🔥 Limited Time — {Math.round((printPricing[0]?.otoPct ?? OTO_DISCOUNT_DEFAULT * 100))}% Off Prints
            </span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Discounted pricing table */}
          <div className="space-y-2">
            {discountedProducts.map((p) => {
              const inCart = (cart[p.id] || 0) > 0;
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    setCart((prev) => {
                      const next = { ...prev };
                      if (next[p.id]) {
                        delete next[p.id];
                      } else {
                        next[p.id] = 1;
                      }
                      return next;
                    })
                  }
                  className={`group w-full flex items-center gap-4 p-3.5 rounded-2xl border transition-all text-left cursor-pointer relative overflow-hidden ${
                    inCart
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-slate-700 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900"
                  }`}
                >
                  {p.popular && !inCart && (
                    <span className="absolute top-0 left-4 px-2 py-0.5 bg-emerald-500 text-[8px] font-black uppercase tracking-wider rounded-b-lg text-white">
                      Most Popular
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-black text-white">{p.name}</span>
                      <span className="text-xs text-slate-500 line-through">${p.original.toFixed(2)}</span>
                      <span className="text-sm font-black text-emerald-400">
                        ${p.price.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md">
                        {Math.round((1 - p.price / p.original) * 100)}% OFF
                      </span>
                    </div>
                    {p.desc && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{p.desc}</p>
                    )}
                  </div>
                  <div
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                      inCart
                        ? "bg-emerald-600 text-white"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white"
                    }`}
                  >
                    {inCart ? "\u2713 Added" : "Add"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Checkout button */}
          {Object.keys(cart).length > 0 && (
            <button
              disabled={checkoutLoading}
              onClick={handleCheckout}
              className="mt-4 w-full px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite] hover:shadow-lg hover:shadow-indigo-500/30 font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              {checkoutLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                  Checkout — ${cartTotal.toFixed(2)}
                </>
              )}
            </button>
          )}

          {/* Free shipping badge */}
          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25m-2.25 0V6.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v3.75" />
            </svg>
            <div>
              <p className="text-xs font-bold text-emerald-400">Free Shipping on All Orders</p>
              <p className="text-[10px] text-slate-500">Delivered in 5-7 business days.</p>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Secure checkout
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Premium quality
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Satisfaction guaranteed
            </span>
          </div>

          {/* Decline button */}
          <button
            onClick={onClose}
            className="mt-4 w-full text-center text-[11px] text-slate-500 hover:text-slate-400 transition cursor-pointer py-2"
          >
            No thanks, I’ll pass on this limited-time discount and pay full price if I order later.
          </button>
        </div>
      </div>
    </div>
  );
}
