"use client";

import React, { useState, useRef, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { generatePortrait, fetchSettings, fetchCredits, createCheckout, createPrintCheckout, verifyPurchase, fetchGallery, proxyImageUrl, type SalesSettings, type GalleryItem } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { signOut } from "@/lib/firebase";
import SignInModal from "@/components/SignInModal";
import AccountDropdown from "@/components/AccountDropdown";
import { trackLead, trackViewContent, trackPurchase } from "@/lib/pixel";
import OTOModal from "@/components/OTOModal";

// Compress image from File using Object URLs (Safari-safe, avoids huge data URLs in memory)
function compressFile(file: File, maxDim = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      // Always scale to fit within maxDim
      if (width > height) {
        if (width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
      } else {
        if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      const result = canvas.toDataURL('image/jpeg', quality);
      console.log(`[compress] ${file.size} bytes → ${result.length} chars (${width}x${height})`);
      resolve(result);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback: read as data URL directly
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    };
    img.src = url;
  });
}

const STYLE_OPTIONS = [
  { id: "royal-monarch", label: "Royal Monarch", emoji: "👑", bg: "from-amber-600/20 to-amber-900/30", border: "border-amber-500/30", text: "text-amber-400" },
  { id: "military-general", label: "Military General", emoji: "⚔️", bg: "from-emerald-600/20 to-emerald-900/30", border: "border-emerald-500/30", text: "text-emerald-400" },
  { id: "renaissance-noble", label: "Renaissance Noble", emoji: "🏰", bg: "from-rose-600/20 to-rose-900/30", border: "border-rose-500/30", text: "text-rose-400" },
  { id: "wizard-sorcerer", label: "Wizard Sorcerer", emoji: "🧙", bg: "from-violet-600/20 to-violet-900/30", border: "border-violet-500/30", text: "text-violet-400" },
  { id: "astronaut-explorer", label: "Astronaut Explorer", emoji: "🚀", bg: "from-sky-600/20 to-sky-900/30", border: "border-sky-500/30", text: "text-sky-400" },
  { id: "flower-garden", label: "Flower Garden", emoji: "🌸", bg: "from-pink-600/20 to-pink-900/30", border: "border-pink-500/30", text: "text-pink-400" },
];

const DEFAULT_PRICING = [
  { id: "pack-3", name: "Starter", portraits: 3, price: 4.99, featured: false },
  { id: "pack-10", name: "Pro", portraits: 10, price: 12.99, featured: true },
];

type Step = "form" | "uploading" | "generating" | "result";

function ConfettiOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#6366f1', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
    const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; rotation: number; rotSpeed: number; opacity: number }[] = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2 - 100,
        vx: (Math.random() - 0.5) * 16,
        vy: Math.random() * -14 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.vy += 0.25;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;
        p.opacity -= 0.008;
        if (p.opacity <= 0) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (alive) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[300] pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}

function CreatePageInner() {
  const searchParams = useSearchParams();
  const sportParam = searchParams.get("sport");
  const buyParam = searchParams.get("buy");
  const purchasedParam = searchParams.get("purchased");
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("form");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(sportParam);
  const [dragOver, setDragOver] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [petName, setPetName] = useState("");
  const [freeRemaining, setFreeRemaining] = useState(0);
  const [paidCredits, setPaidCredits] = useState(0);
  const [settings, setSettings] = useState<SalesSettings | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [printCart, setPrintCart] = useState<Record<string, number>>({});
  const [printCheckoutLoading, setPrintCheckoutLoading] = useState(false);
  const [showOTO, setShowOTO] = useState(false);
  const [otoExpired, setOtoExpired] = useState(false);
  const otoStartRef = useRef<number>(0);
  const [otoTimeLeft, setOtoTimeLeft] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const purchaseVerified = useRef(false);

  // Load settings on mount
  useEffect(() => {
    fetchSettings().then((s) => {
      if (s) {
        setSettings(s);
        // Set free credits from settings for non-signed-in state
        if (!user) setFreeRemaining(s.freePortraits || 1);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load credits from server when user signs in
  const refreshCredits = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const data = await fetchCredits(token);
      if (data) {
        setFreeRemaining(data.freeRemaining);
        setPaidCredits(data.credits + (data.bonusCredits || 0));
      }
    } catch (e) {
      console.error('[refreshCredits] error:', e);
    }
  }, [user]);

  // Load user's saved portrait gallery
  const refreshGallery = useCallback(async () => {
    if (!user) return;
    setGalleryLoading(true);
    try {
      const token = await user.getIdToken();
      const items = await fetchGallery(token);
      setGallery(items.map(i => ({ ...i, imageUrl: proxyImageUrl(i.imageUrl) })));
    } catch (e) {
      console.error('[refreshGallery] error:', e);
    } finally {
      setGalleryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCredits();
    refreshGallery();
  }, [refreshCredits, refreshGallery]);

  // Auto-close sign-in modal when user signs in
  useEffect(() => {
    if (user && showSignIn) {
      setShowSignIn(false);
      trackLead();
    }
  }, [user, showSignIn]);

  // After Stripe redirect: verify & fulfill purchase, then show confetti
  useEffect(() => {
    if (!purchasedParam || !user || purchaseVerified.current) return;
    purchaseVerified.current = true;
    (async () => {
      try {
        const token = await user.getIdToken();
        const result = await verifyPurchase(token);
        if (result) {
          setFreeRemaining(result.freeRemaining);
          setPaidCredits(result.credits);
          setPurchaseMessage(`${result.credits} credits ready to use!`);
          trackPurchase(result.purchaseValue || 0);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4000);
          setTimeout(() => setPurchaseMessage(null), 5000);
        } else {
          // Webhook may have already handled it — just refresh
          await refreshCredits();
        }
      } catch {
        await refreshCredits();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasedParam, user]);

  // Auto-trigger checkout if user came from a paid pricing card (?buy=packId)
  const buyTriggered = useRef(false);
  useEffect(() => {
    if (!buyParam || buyTriggered.current) return;
    if (!user) { setShowSignIn(true); return; }
    buyTriggered.current = true;
    handleBuyCredits(buyParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyParam, user]);

  const totalCredits = freeRemaining + paidCredits;

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      setStep("uploading");
      setUploadProgress(0);
      // Animate progress bar while compressing
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + Math.random() * 18 + 8, 90));
      }, 120);
      const compressed = await compressFile(file, 1024, 0.7);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadedImage(compressed);
      // Brief pause at 100% before moving on
      await new Promise((r) => setTimeout(r, 400));
      setStep("form");
    } catch (err) {
      console.error('[handleFile] compression failed:', err);
      setError('Failed to process image. Please try a different photo.');
      setStep("form");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleTakePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    cameraInputRef.current?.click();
  };

  const handleGenerate = async () => {
    if (!uploadedImage || !selectedStyle || !petName.trim()) return;
    // Require sign-in before generating
    if (!user) {
      setShowSignIn(true);
      return;
    }
    if (totalCredits <= 0) return;
    setStep("generating");
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const token = await user.getIdToken();
      const result = await generatePortrait(
        uploadedImage,
        selectedStyle,
        petName.trim(),
        undefined,
        undefined,
        token,
        'portrait'
      );
      if (result.ok && result.data) {
        const composited = await compositePortrait(result.data);
        setGeneratedImages([composited]);
        setSavedImageUrl(result.savedImageUrl || null);
        // Refresh credits and gallery from server
        await refreshCredits();
        refreshGallery(); // fire & forget — don't block the result step
        trackViewContent(selectedStyle || '', 'portrait');
        otoStartRef.current = Date.now();
        setOtoTimeLeft(15 * 60 * 1000);
        setShowOTO(true);
        setOtoExpired(false);
        setStep("result");
      } else {
        setError(result.error || "Generation failed. Please try again.");
        setStep("form");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[generate] error:', msg);
      setError(`Something went wrong: ${msg}`);
      setStep("form");
    }
  };

  const handleBuyCredits = async (packId: string) => {
    if (!user) { setShowSignIn(true); return; }
    setCheckoutLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      console.log('[checkout] starting for pack:', packId);
      const result = await createCheckout(token, packId);
      console.log('[checkout] result:', result);
      if (result.ok && result.url) {
        window.location.href = result.url;
      } else {
        setError(result.error || 'Failed to start checkout');
        setCheckoutLoading(false);
      }
    } catch (e) {
      console.error('[checkout] error:', e);
      setError(e instanceof Error ? e.message : 'Checkout error');
      setCheckoutLoading(false);
    }
  };

  const canGenerate = !!uploadedImage && !!selectedStyle && !!petName.trim() && (user ? totalCredits > 0 : true);

  // Composite player info onto portrait via canvas
  // Pass through the AI-generated image as-is (the frame already contains name/number)
  const compositePortrait = useCallback((imgSrc: string): Promise<string> => {
    return Promise.resolve(imgSrc);
  }, []);

  // OTO countdown on result page (ticks every second while OTO is active but modal is closed)
  useEffect(() => {
    if (showOTO || otoExpired || otoStartRef.current === 0) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - otoStartRef.current;
      const remaining = 15 * 60 * 1000 - elapsed;
      if (remaining <= 0) {
        setOtoTimeLeft(0);
        setOtoExpired(true);
        clearInterval(interval);
      } else {
        setOtoTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [showOTO, otoExpired]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sign-in modal */}
      <SignInModal
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        onSuccess={() => {
          setShowSignIn(false);
          // Auto-trigger generation after sign-in
          setTimeout(() => handleGenerate(), 300);
        }}
      />

      {/* OTO Modal */}
      <OTOModal
        open={showOTO}
        onClose={() => setShowOTO(false)}
        onExpired={() => { setShowOTO(false); setOtoExpired(true); }}
        imageUrl={generatedImages[0] || ''}
        petName={petName}
        styleName={STYLE_OPTIONS.find(s => s.id === selectedStyle)?.label || selectedStyle || 'Portrait'}
        printPricing={settings?.printPricing || [
          { size: '12x12', price: 29.99, desc: 'Perfect for desks, shelves, and small spaces.', popular: false },
          { size: '24x24', price: 49.99, desc: 'Ideal for bedrooms and man caves.', popular: true },
          { size: '36x36', price: 89.99, desc: 'Statement piece. Gallery-ready.', popular: false },
        ]}
        onCheckout={async (items) => {
          if (!user) { setShowSignIn(true); return; }
          setPrintCheckoutLoading(true);
          setError(null);
          try {
            const token = await user.getIdToken();
            const checkoutImageUrl = savedImageUrl || generatedImages[0] || '';
            const res = await createPrintCheckout(token, items, checkoutImageUrl);
            if (res.ok && res.url) {
              window.location.href = res.url;
            } else {
              setError(res.error || 'Checkout failed');
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Checkout error');
          } finally {
            setPrintCheckoutLoading(false);
          }
        }}
        checkoutLoading={printCheckoutLoading}
      />

      {/* Confetti celebration */}
      {showConfetti && <ConfettiOverlay />}

      {/* Purchase success toast */}
      {purchaseMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-500">
          <div className="bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-xl rounded-2xl px-6 py-4 flex items-center gap-3 shadow-2xl shadow-emerald-500/10">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-black text-emerald-300">Payment Successful!</p>
              <p className="text-xs text-emerald-400/70 font-bold">{purchaseMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Buy Credits Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowBuyModal(false)} />
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center">
            <button
              onClick={() => setShowBuyModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-600/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-black tracking-tight">Buy Credits</h2>
            <p className="text-sm text-slate-400 mt-2">Choose a credit pack to continue creating portraits.</p>
            <div className="mt-6 space-y-3">
              {(settings?.pricing?.length ? settings.pricing : DEFAULT_PRICING).map((pack) => {
                const dollars = Math.floor(pack.price);
                const cents = Math.round((pack.price - dollars) * 100);
                const priceStr = `$${dollars}${cents > 0 ? `.${cents.toString().padStart(2, "0")}` : ""}`;
                return (
                  <button
                    key={pack.id}
                    onClick={() => { setShowBuyModal(false); handleBuyCredits(pack.id); }}
                    disabled={checkoutLoading}
                    className={`relative block w-full py-4 px-4 rounded-2xl font-bold text-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
                      pack.featured
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white border-2 border-indigo-400"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    }`}
                  >
                    {pack.featured && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-500 rounded-full text-[9px] font-black uppercase tracking-wider text-white">Best Value</span>
                    )}
                    <span className="text-lg font-black">{pack.portraits} credits</span>
                    <span className="block text-xs mt-0.5 opacity-75">{pack.name} — {priceStr}</span>
                  </button>
                );
              })}
            </div>
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
          </div>
        </div>
      )}

      {/* Header */}
      <nav className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0">
            <span className="text-xl font-black tracking-tight">👑 Royal Paws</span>
          </Link>
          <div className="shrink-0">
            {user ? (
              <AccountDropdown credits={totalCredits} onBuyCredits={() => setShowBuyModal(true)} />
            ) : (
              <button
                onClick={() => setShowSignIn(true)}
                className="text-xs sm:text-sm text-slate-400 hover:text-white transition whitespace-nowrap"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-10">
        {/* Single-page form */}
        {step === "form" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Create Your <span className="gradient-text">Pet Portrait</span>
              </h1>
              <p className="text-slate-400 mt-2 text-sm">Upload a photo of your pet, choose a style, and we&apos;ll create a stunning AI portrait.</p>
              {error && (
                <div className="mt-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-medium">
                  {error}
                </div>
              )}
            </div>

            {/* Style Selection */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Choose a Style *</label>
              <div className="grid grid-cols-3 gap-2">
                {STYLE_OPTIONS.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyle(style.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                      selectedStyle === style.id
                        ? `border-2 ${style.border} bg-gradient-to-b ${style.bg}`
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-600"
                    }`}
                  >
                    <span className="text-2xl">{style.emoji}</span>
                    <span className={`text-[9px] font-black uppercase tracking-wider ${selectedStyle === style.id ? style.text : "text-slate-500"}`}>{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Upload a Photo *</label>
              {!uploadedImage ? (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                      dragOver
                        ? "border-indigo-500 bg-indigo-500/5"
                        : "border-slate-800 hover:border-slate-600 bg-slate-900/30 hover:bg-slate-900/50"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { e.target.files?.[0] && handleFile(e.target.files[0]); e.target.value = ""; }}
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className={`p-3 rounded-xl transition-colors ${dragOver ? "bg-indigo-500/10" : "bg-slate-800"}`}>
                        <svg className={`w-8 h-8 transition-colors ${dragOver ? "text-indigo-400" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-slate-300">
                        <span className="text-indigo-400">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-600">JPG, PNG — photo in uniform for best results</p>
                    </div>
                  </div>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { e.target.files?.[0] && handleFile(e.target.files[0]); e.target.value = ""; }}
                  />
                  <button
                    onClick={handleTakePhoto}
                    className="w-full mt-3 px-4 py-3 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 font-bold text-xs text-slate-400 uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    Or take a photo now
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-4 p-3 rounded-2xl border border-slate-700 bg-slate-900/60">
                  <div className="w-20 h-24 rounded-xl overflow-hidden border border-slate-600 shrink-0">
                    <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Photo uploaded
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Tap change to use a different photo</p>
                  </div>
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-400 hover:text-white transition"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Pet Name */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Pet Name *</label>
              <input
                type="text"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="e.g. Buddy, Luna, Max"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition text-sm"
              />
            </div>

            {/* Generate button */}
            <div className="flex flex-col items-center gap-3 pt-2">
              {totalCredits > 0 || !user ? (
                <>
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className={`w-full px-10 py-4 rounded-full font-black text-base uppercase tracking-wider transition-all ${
                      canGenerate
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-0.5"
                        : "bg-slate-800 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    {freeRemaining > 0 ? "Generate Portrait — Free" : "Generate Portrait"}
                  </button>
                  <p className="text-xs text-slate-600">
                    {user ? (
                      freeRemaining > 0
                        ? `${freeRemaining} free portrait${freeRemaining !== 1 ? "s" : ""} remaining`
                        : `${paidCredits} credit${paidCredits !== 1 ? "s" : ""} remaining`
                    ) : (
                      "Sign in to generate — it's free"
                    )}
                  </p>
                </>
              ) : (
                <div className="text-center w-full">
                  <p className="text-sm font-bold text-slate-400 mb-3">You&apos;ve used your free portrait. Get more credits to continue!</p>
                  <button
                    onClick={() => setShowBuyModal(true)}
                    className="w-full px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full font-black text-sm uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Buy Credits
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Uploading progress */}
        {step === "uploading" && (
          <div className="animate-in fade-in duration-300 flex flex-col items-center justify-center py-20">
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-center gap-3 mb-6">
                <svg className="w-6 h-6 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm font-bold text-slate-300">Processing photo...</p>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 text-center mt-3">{Math.round(uploadProgress)}%</p>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === "generating" && (
          <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center py-16">
            {/* Skeleton portrait card */}
            <div className="relative w-52 sm:w-60 rounded-3xl bg-slate-900/80 border border-slate-700/50 overflow-hidden shadow-2xl shadow-indigo-500/10">
              {/* Shimmer overlay */}
              <div className="absolute inset-0 animate-shimmer z-10" />
              {/* Skeleton content */}
              <div className="aspect-[3/4] flex flex-col items-center justify-center p-6 gap-5">
                {/* Head placeholder */}
                <div className="w-16 h-16 rounded-full bg-slate-800 animate-pulse" />
                {/* Body placeholder */}
                <div className="w-20 h-24 rounded-xl bg-slate-800/60 animate-pulse" style={{ animationDelay: '150ms' }} />
                {/* Legs placeholder */}
                <div className="flex gap-3">
                  <div className="w-6 h-12 rounded-lg bg-slate-800/40 animate-pulse" style={{ animationDelay: '300ms' }} />
                  <div className="w-6 h-12 rounded-lg bg-slate-800/40 animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>

            {/* Status text */}
            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-sm font-black text-white">Creating Pet Portrait</p>
              </div>
              {petName && (
                <p className="text-xs text-slate-400">
                  for <span className="font-bold text-white">{petName}</span>
                </p>
              )}
              <p className="text-[10px] text-slate-600 mt-1">This process can take up to 60 seconds</p>
              <p className="text-[10px] text-amber-500/70 mt-2 flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                Please do not refresh or close this window
              </p>
            </div>

            {/* Progress steps */}
            <div className="mt-8 flex items-center gap-3">
              {["Analyzing", "Composing", "Rendering"].map((label, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"
                    style={{ animationDelay: `${i * 500}ms` }}
                  />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === "result" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                {petName ? <>{petName}&apos;s </> : "Your "}<span className="gradient-text">Portrait</span>
              </h1>
              <p className="text-slate-400 mt-2">Here&apos;s your AI-generated pet portrait!</p>
            </div>

            <div className="flex justify-center">
              <div className="relative w-64 sm:w-80 rounded-3xl overflow-hidden border border-slate-700 glow">
                {generatedImages[0] && (
                  <img src={generatedImages[0]} alt="Generated portrait" className="w-full h-auto" />
                )}
              </div>
            </div>

            {/* Free download button — image is already watermarked server-side */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => {
                  const src = generatedImages[0] || '';
                  const imgEl = new Image();
                  imgEl.crossOrigin = 'anonymous';
                  imgEl.onload = () => {
                    const c = document.createElement('canvas');
                    c.width = imgEl.width; c.height = imgEl.height;
                    const cx = c.getContext('2d');
                    if (!cx) return;
                    cx.drawImage(imgEl, 0, 0);
                    cx.save();
                    cx.translate(c.width / 2, c.height / 2);
                    cx.rotate(-Math.PI / 4);
                    cx.font = `bold ${Math.max(24, Math.floor(c.width / 14))}px sans-serif`;
                    cx.fillStyle = 'rgba(255,255,255,0.55)';
                    cx.textAlign = 'center';
                    cx.textBaseline = 'middle';
                    const wm = 'SAMPLE';
                    const gap = Math.max(100, Math.floor(c.width / 5));
                    const span = Math.max(c.width, c.height) * 1.5;
                    for (let y = -span; y < span; y += gap) {
                      for (let x = -span; x < span; x += gap * 1.8) { cx.fillText(wm, x, y); }
                    }
                    cx.restore();
                    const link = document.createElement('a');
                    link.href = c.toDataURL('image/jpeg', 0.92);
                    link.download = `${petName || 'portrait'}-digital.jpg`;
                    link.click();
                  };
                  imgEl.src = src;
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                Download Digital Portrait (Free)
              </button>
            </div>

            {/* Trust badges */}
            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                Secure checkout
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                Free shipping
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                Premium quality
              </span>
            </div>

            {/* OTO countdown on result page */}
            {!showOTO && !otoExpired && otoTimeLeft > 0 && (
              <div className="mt-4 flex justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    Limited-time discount expires in: {String(Math.floor(otoTimeLeft / 60000)).padStart(2, '0')}:{String(Math.floor((otoTimeLeft % 60000) / 1000)).padStart(2, '0')}
                  </span>
                </div>
              </div>
            )}

            {/* Print products inline */}
            <div className="mt-6 space-y-3 w-full">
              {(settings?.printPricing || [
                { size: '12x12', price: 29.99, desc: 'Perfect for desks, shelves, and small spaces.', popular: false },
                { size: '24x24', price: 49.99, desc: 'Ideal for bedrooms and man caves.', popular: true },
                { size: '36x36', price: 89.99, desc: 'Statement piece. Gallery-ready.', popular: false },
              ]).map((pp) => {
                const otoActive = !showOTO && !otoExpired && otoTimeLeft > 0;
                const pct = (pp.otoPct != null ? pp.otoPct : 40) / 100;
                const discounted = otoActive ? Math.round(pp.price * (1 - pct) * 100) / 100 : pp.price;
                return { id: `print-${pp.size}`, name: `${pp.size.replace('x', '\u00D7')}\u2033 Print`, desc: pp.desc || '', price: discounted, originalPrice: pp.price, popular: pp.popular || false, otoActive, pctOff: Math.round(pct * 100) };
              }).map((p) => {
                const inCart = (printCart[p.id] || 0) > 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPrintCart((prev: Record<string, number>) => {
                      const next = { ...prev };
                      if (next[p.id]) { delete next[p.id]; } else { next[p.id] = 1; }
                      return next;
                    })}
                    className={`group w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left cursor-pointer relative overflow-hidden ${
                      inCart ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900'
                    }`}
                  >
                    {p.popular && !inCart && (
                      <span className="absolute top-0 left-4 px-2 py-0.5 bg-emerald-500 text-[8px] font-black uppercase tracking-wider rounded-b-lg text-white">Most Popular</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-black text-white">{p.name}</span>
                        {p.otoActive && <span className="text-xs text-slate-500 line-through">${p.originalPrice.toFixed(2)}</span>}
                        <span className="text-sm font-black text-emerald-400">${p.price.toFixed(2)}</span>
                        {p.otoActive && <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-md">{p.pctOff}% OFF</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{p.desc}</p>
                    </div>
                    <div className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                      inCart ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}>
                      {inCart ? '\u2713 Added' : 'Add'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Checkout button */}
            {Object.keys(printCart).length > 0 && (
              <button
                disabled={printCheckoutLoading}
                onClick={async () => {
                  if (!user) { setShowSignIn(true); return; }
                  setPrintCheckoutLoading(true);
                  setError(null);
                  try {
                    const otoAct = !showOTO && !otoExpired && otoTimeLeft > 0;
                    const products = (settings?.printPricing || [
                      { size: '12x12', price: 29.99 }, { size: '24x24', price: 49.99 }, { size: '36x36', price: 89.99 },
                    ]).map(pp => {
                      const pct = (pp.otoPct != null ? pp.otoPct : 40) / 100;
                      const p = otoAct ? Math.round(pp.price * (1 - pct) * 100) / 100 : pp.price;
                      return { id: `print-${pp.size}`, name: `${pp.size} Print`, price: p, qty: 1 };
                    });
                    const items = products.filter(p => printCart[p.id]).map(p => ({ id: p.id, name: p.name, price: p.price, qty: printCart[p.id] }));
                    const token = await user.getIdToken();
                    const imageUrl = savedImageUrl || generatedImages[0] || '';
                    const res = await createPrintCheckout(token, items, imageUrl);
                    if (res.ok && res.url) {
                      window.location.href = res.url;
                    } else {
                      setError(res.error || 'Checkout failed');
                    }
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Checkout error');
                  } finally {
                    setPrintCheckoutLoading(false);
                  }
                }}
                className="mt-4 w-full px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite] hover:shadow-lg hover:shadow-indigo-500/30 font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                {printCheckoutLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                    Checkout — ${Object.entries(printCart).reduce((total, [id, qty]) => {
                      const otoAct2 = !showOTO && !otoExpired && otoTimeLeft > 0;
                      const prices: Record<string, number> = Object.fromEntries((settings?.printPricing || [
                        { size: '12x12', price: 29.99 }, { size: '24x24', price: 49.99 }, { size: '36x36', price: 89.99 },
                      ]).map(pp => {
                        const pct = (pp.otoPct != null ? pp.otoPct : 40) / 100;
                        return [`print-${pp.size}`, otoAct2 ? Math.round(pp.price * (1 - pct) * 100) / 100 : pp.price];
                      }));
                      return total + (prices[id] || 0) * (qty as number);
                    }, 0).toFixed(2)}
                  </>
                )}
              </button>
            )}

            {/* Free shipping banner */}
            <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25m-2.25 0V6.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v3.75" /></svg>
              <div>
                <p className="text-xs font-bold text-emerald-400">Free Shipping on All Orders</p>
                <p className="text-[10px] text-slate-500">Delivered in 5-7 business days.</p>
              </div>
            </div>

            {/* Secondary actions */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                onClick={() => { setStep("form"); setGeneratedImages([]); setUploadedImage(null); setSelectedStyle(null); setPetName(''); }}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
              >
                Create Another Portrait
              </button>
            </div>

            {/* Gallery */}
            {gallery.length > 0 && (
              <div className="mt-12">
                <h2 className="text-lg font-black text-white mb-4">Your Portraits</h2>
                <div className="grid grid-cols-3 gap-2">
                  {gallery.map((item: GalleryItem) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setGeneratedImages([proxyImageUrl(item.imageUrl)]);
                        setSavedImageUrl(item.imageUrl);
                        setPetName(item.playerName || '');
                        setStep("result");
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition cursor-pointer"
                    >
                      <img
                        src={proxyImageUrl(item.imageUrl)}
                        alt={item.playerName || "Portrait"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-[10px] font-bold text-white truncate">{item.playerName || "Portrait"}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User bar at bottom */}
      {user && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900/90 border border-slate-700 backdrop-blur-sm">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold">
              {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-xs text-slate-400 max-w-[120px] truncate hidden sm:block">
              {user.displayName || user.email}
            </span>
            <button
              onClick={() => signOut()}
              className="text-[10px] text-slate-500 hover:text-slate-300 underline"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <CreatePageInner />
    </Suspense>
  );
}
