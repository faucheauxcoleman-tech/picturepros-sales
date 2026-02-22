"use client";

import React, { useState, useRef, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { generatePortrait, fetchSettings } from "@/lib/api";

// Compress image to max dimension and quality to avoid huge payloads from phone cameras
function compressImage(dataUrl: string, maxDim = 1536, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        // Already small enough — check if it's a reasonable size
        if (dataUrl.length < 4_000_000) { resolve(dataUrl); return; }
      }
      // Scale down
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
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const SPORT_OPTIONS = [
  { id: "soccer", label: "Soccer", emoji: "⚽", bg: "from-emerald-600/20 to-emerald-900/30", border: "border-emerald-500/30", text: "text-emerald-400" },
  { id: "basketball", label: "Basketball", emoji: "🏀", bg: "from-orange-600/20 to-orange-900/30", border: "border-orange-500/30", text: "text-orange-400" },
  { id: "baseball", label: "Baseball", emoji: "⚾", bg: "from-blue-600/20 to-blue-900/30", border: "border-blue-500/30", text: "text-blue-400" },
  { id: "football", label: "Football", emoji: "🏈", bg: "from-red-600/20 to-red-900/30", border: "border-red-500/30", text: "text-red-400" },
  { id: "volleyball", label: "Volleyball", emoji: "🏐", bg: "from-violet-600/20 to-violet-900/30", border: "border-violet-500/30", text: "text-violet-400" },
  { id: "softball", label: "Softball", emoji: "🥎", bg: "from-yellow-600/20 to-yellow-900/30", border: "border-yellow-500/30", text: "text-yellow-400" },
  { id: "lacrosse", label: "Lacrosse", emoji: "🥍", bg: "from-cyan-600/20 to-cyan-900/30", border: "border-cyan-500/30", text: "text-cyan-400" },
  { id: "hockey", label: "Hockey", emoji: "🏒", bg: "from-sky-600/20 to-sky-900/30", border: "border-sky-500/30", text: "text-sky-400" },
];

const DEFAULT_FREE_LIMIT = 1;
const STORAGE_KEY = "pp_generations_used";

type Step = "sport" | "upload" | "details" | "generating" | "result";

function CreatePageInner() {
  const searchParams = useSearchParams();
  const sportParam = searchParams.get("sport");
  const [step, setStep] = useState<Step>(sportParam ? "upload" : "sport");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string | null>(sportParam);
  const [dragOver, setDragOver] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerNumber, setPlayerNumber] = useState("");
  const [playerPosition, setPlayerPosition] = useState("");
  const [generationsUsed, setGenerationsUsed] = useState(0);
  const [freeLimit, setFreeLimit] = useState(DEFAULT_FREE_LIMIT);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setGenerationsUsed(parseInt(stored) || 0);
    } catch {}
    fetchSettings().then((s) => {
      if (s && typeof s.freePortraits === 'number') setFreeLimit(s.freePortraits);
    });
  }, []);

  const freeRemaining = Math.max(0, freeLimit - generationsUsed);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const raw = e.target?.result as string;
      // Compress immediately so we never hold a huge raw photo in state
      const compressed = await compressImage(raw, 1536, 0.82);
      setUploadedImage(compressed);
      setStep("details");
    };
    reader.readAsDataURL(file);
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
    if (!uploadedImage || !selectedSport || !playerName.trim() || !playerNumber.trim()) return;
    if (freeRemaining <= 0) return;
    setStep("generating");
    setError(null);
    try {
      const result = await generatePortrait(
        uploadedImage,
        selectedSport,
        playerName.trim(),
        playerNumber.trim(),
        playerPosition.trim() || undefined
      );
      if (result.ok && result.data) {
        const composited = await compositePortrait(result.data);
        setGeneratedImages([composited]);
        const newCount = generationsUsed + 1;
        setGenerationsUsed(newCount);
        try { localStorage.setItem(STORAGE_KEY, String(newCount)); } catch {}
        setStep("result");
      } else {
        setError(result.error || "Generation failed. Please try again.");
        setStep("details");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[generate] error:', msg);
      setError(`Something went wrong: ${msg}`);
      setStep("details");
    }
  };

  const canGenerate = !!uploadedImage && !!selectedSport && !!playerName.trim() && !!playerNumber.trim() && freeRemaining > 0;

  // Composite player info onto portrait via canvas
  const compositePortrait = useCallback((imgSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const w = canvas.width;
        const h = canvas.height;
        const scale = w / 800; // base scale factor

        // Dark gradient overlay at bottom for text readability
        const grad = ctx.createLinearGradient(0, h * 0.7, 0, h);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0.6)');
        grad.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, h * 0.7, w, h * 0.3);

        // Player number - big, right side
        if (playerNumber.trim()) {
          const numSize = Math.round(72 * scale);
          ctx.font = `900 ${numSize}px "Arial Black", Arial, sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillText(`#${playerNumber.trim()}`, w - 20 * scale, h - 20 * scale);
        }

        // Player name - bottom left
        if (playerName.trim()) {
          const nameSize = Math.round(28 * scale);
          ctx.font = `800 ${nameSize}px "Arial Black", Arial, sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillStyle = 'white';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 6 * scale;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2 * scale;
          ctx.fillText(playerName.trim().toUpperCase(), 24 * scale, h - 24 * scale);
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
        }

        // Number + position line - above name
        const subParts: string[] = [];
        if (playerNumber.trim()) subParts.push(`#${playerNumber.trim()}`);
        if (playerPosition.trim()) subParts.push(playerPosition.trim());
        const sportObj = SPORT_OPTIONS.find(s => s.id === selectedSport);
        if (sportObj) subParts.push(sportObj.label);
        if (subParts.length > 0) {
          const subSize = Math.round(14 * scale);
          ctx.font = `700 ${subSize}px Arial, sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 4 * scale;
          ctx.fillText(subParts.join('  ·  '), 24 * scale, h - 56 * scale);
          ctx.shadowBlur = 0;
        }

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(imgSrc);
      img.src = imgSrc;
    });
  }, [playerName, playerNumber, playerPosition, selectedSport]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <nav className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/assets/logo/PP%20LOGO%20AI.png" alt="Picture Pros" className="h-9 sm:h-10" />
          </Link>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {(["sport", "upload", "details", "result"] as const).map((s, i) => {
              const labels = ["Sport", "Photo", "Details", "Portrait"];
              const stepOrder: Record<Step, number> = { sport: 0, upload: 1, details: 2, generating: 3, result: 4 };
              const thisOrder = stepOrder[s];
              const currentOrder = stepOrder[step];
              const isActive = (s === "result" && step === "generating") || step === s;
              const isDone = thisOrder < currentOrder && !(s === "result" && step === "generating");
              return (
                <div key={s} className="flex items-center gap-2">
                  {i > 0 && <div className={`w-6 h-px ${isDone ? "bg-indigo-500" : "bg-slate-800"}`} />}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                    isDone ? "bg-indigo-500/10 text-indigo-400" : isActive ? "bg-slate-800 text-white" : "text-slate-600"
                  }`}>
                    {isDone ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <span>{i + 1}</span>
                    )}
                    <span className="hidden sm:inline">{labels[i]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Step 0: Sport Selection */}
        {step === "sport" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Pick Your <span className="gradient-text">Sport</span>
              </h1>
              <p className="text-slate-400 mt-2">Choose a sport to get started with your portrait.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
              {SPORT_OPTIONS.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => { setSelectedSport(sport.id); setStep("upload"); }}
                  className={`group relative aspect-[4/5] rounded-2xl border bg-slate-900/60 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl flex flex-col items-center justify-center gap-3 ${
                    selectedSport === sport.id
                      ? `border-2 ${sport.border} shadow-lg`
                      : "border-white/10 hover:border-slate-600"
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-b ${sport.bg} opacity-[0.08] group-hover:opacity-[0.18] transition-opacity`} />
                  <span className="text-5xl sm:text-6xl relative z-10 group-hover:scale-110 transition-transform duration-300">{sport.emoji}</span>
                  <span className="relative z-10 text-xs sm:text-sm font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">{sport.label}</span>
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <span className="text-[9px] font-bold text-white/60 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">Select &rarr;</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Upload / Take Photo */}
        {step === "upload" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              {selectedSport && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-bold mb-4">
                  <span>{SPORT_OPTIONS.find(s => s.id === selectedSport)?.emoji}</span>
                  {SPORT_OPTIONS.find(s => s.id === selectedSport)?.label} Portrait
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Upload or Snap a <span className="gradient-text">Photo</span>
              </h1>
              <p className="text-slate-400 mt-2">Any photo works — game day, practice, or snap one right now!</p>
              {error && (
                <div className="mt-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-medium">
                  {error}
                </div>
              )}
            </div>

            {/* Upload zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-12 sm:p-16 text-center transition-all ${
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

              <div className="flex flex-col items-center gap-4">
                <div className={`p-4 rounded-2xl transition-colors ${dragOver ? "bg-indigo-500/10" : "bg-slate-800"}`}>
                  <svg className={`w-10 h-10 transition-colors ${dragOver ? "text-indigo-400" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-bold text-slate-300">
                    <span className="text-indigo-400">Tap to choose a photo</span> or drag and drop
                  </p>
                  <p className="text-sm text-slate-500 mt-1">JPG, PNG, HEIC — any photo from your camera roll</p>
                </div>
              </div>
            </div>

            {/* Camera button — separate from upload zone */}
            <div className="flex items-center gap-4 mt-4">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">or</span>
              <div className="h-px flex-1 bg-slate-800" />
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
              className="w-full mt-4 px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              Take a Photo Now
            </button>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                { icon: "✓", label: "Works with any photo" },
                { icon: "✓", label: "Phone camera quality is fine" },
                { icon: "✓", label: "Full body or waist-up" },
              ].map((tip) => (
                <div key={tip.label} className="flex items-center gap-2 text-xs text-slate-500 justify-center">
                  <span className="text-emerald-500 font-bold">{tip.icon}</span>
                  {tip.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Player Details + Sport Selection */}
        {step === "details" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Player <span className="gradient-text">Details</span>
              </h1>
              <p className="text-slate-400 mt-2">Tell us about the player so we can personalize the portrait.</p>
              {error && (
                <div className="mt-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-medium">
                  {error}
                </div>
              )}
            </div>

            {/* Photo preview */}
            {uploadedImage && (
              <div className="flex justify-center mb-8">
                <div className="relative w-32 h-40 rounded-2xl overflow-hidden border border-slate-700">
                  <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setUploadedImage(null); setStep("upload"); }}
                    className="absolute top-1 right-1 w-6 h-6 bg-slate-900/80 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Player info fields */}
            <div className="max-w-md mx-auto space-y-4 mb-8">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Player Name *</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Jersey Number *</label>
                  <input
                    type="text"
                    value={playerNumber}
                    onChange={(e) => setPlayerNumber(e.target.value)}
                    placeholder="e.g. 7"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Position <span className="text-slate-700">(optional)</span></label>
                  <input
                    type="text"
                    value={playerPosition}
                    onChange={(e) => setPlayerPosition(e.target.value)}
                    placeholder="e.g. Midfielder"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Sport selection */}
            <div className="mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center mb-4">Choose Sport *</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SPORT_OPTIONS.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => setSelectedSport(sport.id)}
                  className={`relative rounded-2xl p-5 text-center transition-all hover:-translate-y-0.5 ${
                    selectedSport === sport.id
                      ? `bg-gradient-to-b ${sport.bg} border-2 ${sport.border} shadow-lg`
                      : "border border-slate-800 bg-slate-900/50 hover:border-slate-600"
                  }`}
                >
                  <span className="text-3xl">{sport.emoji}</span>
                  <p className={`text-sm font-bold mt-2 ${selectedSport === sport.id ? sport.text : "text-slate-300"}`}>
                    {sport.label}
                  </p>
                  {selectedSport === sport.id && (
                    <div className="absolute top-2 right-2">
                      <svg className={`w-5 h-5 ${sport.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Generate button */}
            <div className="mt-8 flex flex-col items-center gap-3">
              {freeRemaining > 0 ? (
                <>
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-black text-base uppercase tracking-wider transition-all ${
                      canGenerate
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-0.5"
                        : "bg-slate-800 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    Generate Portrait — Free
                  </button>
                  <p className="text-xs text-slate-600">
                    {freeRemaining} free portrait{freeRemaining !== 1 ? "s" : ""} remaining
                  </p>
                  {!playerName.trim() || !playerNumber.trim() ? (
                    <p className="text-xs text-amber-500/70">Fill in player name and number to continue</p>
                  ) : !selectedSport ? (
                    <p className="text-xs text-amber-500/70">Select a sport to continue</p>
                  ) : null}
                </>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-400 mb-2">You&apos;ve used your free portrait</p>
                  <button className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-black text-base uppercase tracking-wider transition-all hover:shadow-2xl hover:shadow-indigo-500/25">
                    Unlock More Portraits
                  </button>
                  <p className="text-xs text-slate-600 mt-2">Starting at $4.99 for 3 portraits</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === "generating" && (
          <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center py-20">
            <div className="relative w-48 h-60 rounded-3xl bg-slate-900/50 border border-slate-800 overflow-hidden glow">
              <div className="absolute inset-0 animate-shimmer" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <div>
                  <p className="text-sm font-black text-white text-center">Creating Portrait</p>
                  <p className="text-[10px] text-slate-500 text-center mt-1">This takes about 20 seconds...</p>
                </div>
              </div>
            </div>
            {playerName && (
              <p className="mt-6 text-sm text-slate-400 text-center">
                Generating portrait for <span className="font-bold text-white">{playerName}</span>
                {playerNumber && <> #{playerNumber}</>}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-600 text-center max-w-sm">
              Our AI is analyzing your photo and generating a professional sports portrait. Hang tight!
            </p>
          </div>
        )}

        {/* Step 4: Result */}
        {step === "result" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                {playerName ? <>{playerName}&apos;s </> : "Your "}<span className="gradient-text">Portrait</span>
              </h1>
              <p className="text-slate-400 mt-2">Here&apos;s your AI-generated sports portrait!</p>
            </div>

            <div className="flex justify-center">
              <div className="relative w-64 sm:w-80 aspect-[3/4] rounded-3xl overflow-hidden border border-slate-700 glow">
                {generatedImages[0] && (
                  <img src={generatedImages[0]} alt="Generated portrait" className="w-full h-full object-cover" />
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <a
                  href={generatedImages[0] || "#"}
                  download={`${(playerName || "portrait").replace(/\s+/g, "_")}_portrait.png`}
                  className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download
                </a>
                <button className="px-8 py-3 rounded-xl border border-slate-700 hover:border-slate-500 font-bold text-sm text-slate-300 transition-all flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-8.25 0h.008v.008H10.5V12z" />
                  </svg>
                  Order Prints
                </button>
              </div>

              <div className="mt-4 p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 text-center max-w-md">
                <p className="text-sm font-bold text-indigo-400">Want more portraits?</p>
                <p className="text-xs text-slate-400 mt-1">Get 3 portraits for just $4.99 — try different sports and styles.</p>
                <button className="mt-3 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black uppercase tracking-wider transition-all">
                  Upgrade Now
                </button>
              </div>

              {freeRemaining > 0 ? (
                <button
                  onClick={() => { setStep(sportParam ? "upload" : "sport"); setUploadedImage(null); setSelectedSport(sportParam); setGeneratedImages([]); setPlayerName(""); setPlayerNumber(""); setPlayerPosition(""); setError(null); }}
                  className="mt-2 text-sm text-slate-500 hover:text-slate-300 transition"
                >
                  Create Another Portrait
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
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
