"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { generatePortrait, claimGeneration, createPrintCheckout, fetchSettings, type SalesSettings } from "@/lib/api";
import { trackLead, trackViewContent } from "@/lib/pixel";
import EmailGateModal from "@/components/EmailGateModal";

// Compress image using Object URLs (Safari-safe)
function compressFile(file: File, maxDim = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
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
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    };
    img.src = url;
  });
}

// Generate or read a stable anonymous session ID from localStorage
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'rp_session_id';
  try {
    let sid = window.localStorage.getItem(KEY);
    if (!sid) {
      sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      window.localStorage.setItem(KEY, sid);
    }
    return sid;
  } catch {
    return `s_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

const STYLE_OPTIONS = [
  { id: "royal-monarch", label: "Royal Monarch", emoji: "👑", file: "royal.png", border: "border-amber-500/60", text: "text-amber-300" },
  { id: "military-general", label: "Military General", emoji: "⚔️", file: "military.png", border: "border-emerald-500/60", text: "text-emerald-300" },
  { id: "renaissance-noble", label: "Renaissance Noble", emoji: "🏰", file: "renaissance.png", border: "border-rose-500/60", text: "text-rose-300" },
  { id: "wizard-sorcerer", label: "Wizard Sorcerer", emoji: "🧙", file: "wizard.png", border: "border-violet-500/60", text: "text-violet-300" },
  { id: "astronaut-explorer", label: "Astronaut Explorer", emoji: "🚀", file: "astronaut.png", border: "border-sky-500/60", text: "text-sky-300" },
  { id: "flower-garden", label: "Flower Garden", emoji: "🌸", file: "flower.png", border: "border-pink-500/60", text: "text-pink-300" },
];

type Step = "idle" | "uploading" | "preview" | "generating" | "result";
type EmailGate = null | { intent: 'download' | 'print'; printItems?: { id: string; name: string; price: number; qty: number }[] };

export default function InlineCreator() {
  const [step, setStep] = useState<Step>("idle");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [petName, setPetName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailGate, setEmailGate] = useState<EmailGate>(null);
  const [capturedEmail, setCapturedEmail] = useState<string | null>(null);
  const [printCart, setPrintCart] = useState<Record<string, number>>({});
  const [printCheckoutLoading, setPrintCheckoutLoading] = useState(false);
  const [settings, setSettings] = useState<SalesSettings | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string>("");

  // Initialize session ID + load settings on mount
  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
    fetchSettings().then(s => { if (s) setSettings(s); }).catch(() => {});
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG)");
      return;
    }
    setError(null);
    try {
      setStep("uploading");
      setUploadProgress(0);
      const progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + Math.random() * 18 + 8, 90));
      }, 120);
      const compressed = await compressFile(file, 1024, 0.7);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadedImage(compressed);
      await new Promise(r => setTimeout(r, 300));
      setStep("preview");
      // Smooth scroll to the style picker which appears below
      setTimeout(() => {
        const el = document.getElementById('style-picker');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch {
      setError("Failed to process image. Please try a different photo.");
      setStep("idle");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleGenerate = async () => {
    if (!uploadedImage || !selectedStyle) return;
    setStep("generating");
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const result = await generatePortrait(
        uploadedImage,
        selectedStyle,
        petName.trim() || undefined,
        undefined,
        undefined,
        undefined,            // no auth token = anonymous
        'portrait',
        sessionIdRef.current,
      );
      if (result.ok && result.data) {
        setGeneratedImage(result.data);
        setSavedImageUrl(result.savedImageUrl || null);
        trackViewContent(selectedStyle, 'portrait');
        setStep("result");
        setTimeout(() => {
          const el = document.getElementById('result-card');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        setError(result.error || "Generation failed. Please try again.");
        setStep("preview");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep("preview");
    }
  };

  // Apply SAMPLE watermark via canvas + trigger download
  const downloadWithWatermark = (src: string) => {
    const imgEl = new Image();
    imgEl.crossOrigin = 'anonymous';
    imgEl.onload = () => {
      const c = document.createElement('canvas');
      c.width = imgEl.width;
      c.height = imgEl.height;
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
        for (let x = -span; x < span; x += gap * 1.8) cx.fillText(wm, x, y);
      }
      cx.restore();
      const link = document.createElement('a');
      link.href = c.toDataURL('image/jpeg', 0.92);
      link.download = `${petName || 'royal-paws'}-portrait-sample.jpg`;
      link.click();
    };
    imgEl.src = src;
  };

  // Triggered when user submits the email-gate modal
  const handleEmailSubmit = async (email: string) => {
    if (!sessionIdRef.current) return;
    try {
      await claimGeneration(sessionIdRef.current, email, 'royal-paws-homepage');
      setCapturedEmail(email);
      trackLead();
    } catch { /* non-blocking */ }
    const gate = emailGate;
    setEmailGate(null);
    if (!gate) return;
    if (gate.intent === 'download') {
      if (generatedImage) downloadWithWatermark(generatedImage);
    } else if (gate.intent === 'print' && gate.printItems) {
      await proceedToPrintCheckout(gate.printItems, email);
    }
  };

  const proceedToPrintCheckout = async (items: { id: string; name: string; price: number; qty: number }[], email: string) => {
    setPrintCheckoutLoading(true);
    setError(null);
    try {
      const imageUrl = savedImageUrl || generatedImage || '';
      const res = await createPrintCheckout(null, items, imageUrl, { sessionId: sessionIdRef.current, email });
      if (res.ok && res.url) {
        window.location.href = res.url;
      } else {
        setError(res.error || 'Checkout failed');
        setPrintCheckoutLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout error');
      setPrintCheckoutLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    if (capturedEmail) {
      downloadWithWatermark(generatedImage);
    } else {
      setEmailGate({ intent: 'download' });
    }
  };

  const handlePrintCheckout = async () => {
    const items = buildPrintItems();
    if (items.length === 0) return;
    if (capturedEmail) {
      await proceedToPrintCheckout(items, capturedEmail);
    } else {
      setEmailGate({ intent: 'print', printItems: items });
    }
  };

  const buildPrintItems = () => {
    const printPricing = settings?.printPricing || [
      { size: '12x12', price: 29.99 },
      { size: '24x24', price: 49.99 },
      { size: '36x36', price: 89.99 },
    ];
    const products = printPricing.map(pp => ({
      id: `print-${pp.size}`,
      name: `${pp.size} Print`,
      price: pp.price,
      qty: 1,
    }));
    return products
      .filter(p => printCart[p.id])
      .map(p => ({ id: p.id, name: p.name, price: p.price, qty: printCart[p.id] }));
  };

  const cartTotal = (() => {
    const printPricing = settings?.printPricing || [
      { size: '12x12', price: 29.99 },
      { size: '24x24', price: 49.99 },
      { size: '36x36', price: 89.99 },
    ];
    const prices: Record<string, number> = Object.fromEntries(
      printPricing.map(pp => [`print-${pp.size}`, pp.price])
    );
    return Object.entries(printCart).reduce((sum, [id, qty]) => sum + (prices[id] || 0) * qty, 0);
  })();

  const reset = () => {
    setStep("idle");
    setUploadedImage(null);
    setSelectedStyle(null);
    setPetName("");
    setGeneratedImage(null);
    setSavedImageUrl(null);
    setError(null);
    setPrintCart({});
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* IDLE — big drop zone */}
      {step === "idle" && (
        <div className="animate-in fade-in duration-500">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-3xl border-2 border-dashed transition-all p-12 sm:p-16 text-center ${
              dragOver
                ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
                : "border-slate-700 bg-slate-900/40 hover:border-indigo-500/60 hover:bg-slate-900/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
            <div className="flex flex-col items-center gap-5">
              <div className={`relative ${dragOver ? "scale-110" : ""} transition-transform`}>
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
                <div className="relative p-5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30">
                  <svg className="w-12 h-12 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Drop a pet photo to start
                </h2>
                <p className="mt-2 text-slate-400 text-sm sm:text-base">
                  <span className="text-indigo-400 font-bold">Click to upload</span> or drag & drop your dog or cat photo
                </p>
                <p className="mt-1 text-xs text-slate-600">JPG / PNG · No signup needed · Free first portrait</p>
              </div>
            </div>
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
          <button
            onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
            className="mt-4 w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 font-bold text-xs text-slate-400 uppercase tracking-wider transition flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            Or take a photo now
          </button>
          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-medium text-center">
              {error}
            </div>
          )}
        </div>
      )}

      {/* UPLOADING progress */}
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

      {/* PREVIEW — uploaded photo + style picker + name + generate */}
      {step === "preview" && uploadedImage && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
          {/* Photo preview pill */}
          <div className="flex items-center gap-4 p-3 rounded-2xl border border-slate-700 bg-slate-900/60">
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-600 shrink-0">
              <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                Photo uploaded
              </p>
              <p className="text-xs text-slate-500 mt-1">Now pick a style below</p>
            </div>
            <button
              onClick={reset}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              Change
            </button>
          </div>

          {/* Style grid */}
          <div id="style-picker">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Choose a Style *</label>
            <div className="grid grid-cols-3 gap-3">
              {STYLE_OPTIONS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStyle(s.id)}
                  className={`relative group rounded-2xl overflow-hidden border-2 transition-all ${
                    selectedStyle === s.id
                      ? `${s.border} ring-2 ring-indigo-500/40 scale-[0.98]`
                      : "border-slate-800 hover:border-slate-600"
                  }`}
                >
                  <img
                    src={`/assets/samples/${s.file}`}
                    alt={s.label}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-2 sm:p-3 text-left">
                    <p className={`text-[10px] sm:text-xs font-black ${selectedStyle === s.id ? s.text : 'text-white'} flex items-center gap-1`}>
                      <span className="text-base">{s.emoji}</span>
                      <span className="truncate">{s.label}</span>
                    </p>
                  </div>
                  {selectedStyle === s.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Pet name (optional) */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Pet Name (optional)</label>
            <input
              type="text"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              placeholder="e.g. Buddy, Luna, Max"
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-sm"
              maxLength={30}
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!selectedStyle}
            className={`w-full px-10 py-4 rounded-full font-black text-base uppercase tracking-wider transition-all ${
              selectedStyle
                ? "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-0.5"
                : "bg-slate-800 text-slate-600 cursor-not-allowed"
            }`}
          >
            Generate Portrait — Free
          </button>
          <p className="text-xs text-slate-600 text-center -mt-4">No signup required · Takes about 30 seconds</p>
        </div>
      )}

      {/* GENERATING */}
      {step === "generating" && (
        <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center py-12">
          <div className="relative w-52 sm:w-60 rounded-3xl bg-slate-900/80 border border-slate-700/50 overflow-hidden shadow-2xl shadow-indigo-500/10">
            <div className="absolute inset-0 animate-shimmer z-10" />
            <div className="aspect-[3/4] flex flex-col items-center justify-center p-6 gap-5">
              <div className="w-16 h-16 rounded-full bg-slate-800 animate-pulse" />
              <div className="w-20 h-24 rounded-xl bg-slate-800/60 animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="flex gap-3">
                <div className="w-6 h-12 rounded-lg bg-slate-800/40 animate-pulse" style={{ animationDelay: '300ms' }} />
                <div className="w-6 h-12 rounded-lg bg-slate-800/40 animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-sm font-black text-white">Creating Pet Portrait</p>
            </div>
            {petName && <p className="text-xs text-slate-400">for <span className="font-bold text-white">{petName}</span></p>}
            <p className="text-[10px] text-slate-600 mt-1">This takes up to 60 seconds — please don&apos;t close this tab</p>
          </div>
        </div>
      )}

      {/* RESULT */}
      {step === "result" && generatedImage && (
        <div id="result-card" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-6">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              {petName ? <>{petName}&apos;s </> : "Your "}<span className="gradient-text">Royal Portrait</span>
            </h2>
            <p className="text-slate-400 mt-2 text-sm">Looks great, right? Order a print or download a sample below.</p>
          </div>

          <div className="flex justify-center">
            <div className="relative w-64 sm:w-80 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl shadow-indigo-500/20">
              <img src={generatedImage} alt="Generated portrait" className="w-full h-auto" />
            </div>
          </div>

          {/* Free sample download */}
          <div className="mt-5 flex justify-center">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Download Free Sample (Watermarked)
            </button>
          </div>

          {/* Print products */}
          <div className="mt-8">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3 text-center">Get a Real Print</p>
            <div className="space-y-3">
              {(settings?.printPricing || [
                { size: '12x12', price: 29.99, desc: 'Perfect for desks, shelves, and small spaces.', popular: false },
                { size: '24x24', price: 49.99, desc: 'Ideal for bedrooms and man caves.', popular: true },
                { size: '36x36', price: 89.99, desc: 'Statement piece. Gallery-ready.', popular: false },
              ]).map(pp => {
                const id = `print-${pp.size}`;
                const inCart = (printCart[id] || 0) > 0;
                const name = `${pp.size.replace('x', '×')}″ Print`;
                return (
                  <button
                    key={id}
                    onClick={() => setPrintCart(prev => {
                      const next = { ...prev };
                      if (next[id]) delete next[id];
                      else next[id] = 1;
                      return next;
                    })}
                    className={`group w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left cursor-pointer relative overflow-hidden ${
                      inCart ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900'
                    }`}
                  >
                    {pp.popular && !inCart && (
                      <span className="absolute top-0 left-4 px-2 py-0.5 bg-emerald-500 text-[8px] font-black uppercase tracking-wider rounded-b-lg text-white">Most Popular</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-black text-white">{name}</span>
                        <span className="text-sm font-black text-emerald-400">${pp.price.toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{pp.desc}</p>
                    </div>
                    <div className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                      inCart ? 'bg-emerald-600 text-white' : 'bg-indigo-600 group-hover:bg-indigo-500 text-white'
                    }`}>
                      {inCart ? '✓ Added' : 'Add'}
                    </div>
                  </button>
                );
              })}
            </div>

            {Object.keys(printCart).length > 0 && (
              <button
                disabled={printCheckoutLoading}
                onClick={handlePrintCheckout}
                className="mt-4 w-full px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] hover:shadow-lg hover:shadow-indigo-500/30 font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                {printCheckoutLoading ? (
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

            <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25m-2.25 0V6.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v3.75" />
              </svg>
              <div>
                <p className="text-xs font-bold text-emerald-400">Free Shipping on All Orders</p>
                <p className="text-[10px] text-slate-500">Delivered in 5-7 business days</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={reset}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
            >
              Create Another Portrait
            </button>
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-medium text-center">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Email gate modal */}
      <EmailGateModal
        open={!!emailGate}
        intent={emailGate?.intent || 'download'}
        onClose={() => setEmailGate(null)}
        onSubmit={handleEmailSubmit}
      />
    </div>
  );
}
