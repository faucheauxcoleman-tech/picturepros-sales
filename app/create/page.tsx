"use client";

import React, { useState, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { generatePortrait } from "@/lib/api";

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

type Step = "upload" | "sport" | "generating" | "result";

function CreatePageInner() {
  const searchParams = useSearchParams();
  const sportParam = searchParams.get("sport");
  const [step, setStep] = useState<Step>(sportParam ? "upload" : "sport");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string | null>(sportParam);
  const [dragOver, setDragOver] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setUploadedImage(base64);
      if (selectedSport) {
        // Sport already chosen — go straight to generate
        setStep("generating");
        setError(null);
        try {
          const result = await generatePortrait(base64, selectedSport);
          if (result.ok && result.data) {
            setGeneratedImages([result.data]);
            setStep("result");
          } else {
            setError(result.error || "Generation failed. Please try again.");
            setStep("upload");
          }
        } catch {
          setError("Something went wrong. Please try again.");
          setStep("upload");
        }
      } else {
        setStep("sport");
      }
    };
    reader.readAsDataURL(file);
  }, [selectedSport]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleGenerate = async () => {
    if (!uploadedImage || !selectedSport) return;
    setStep("generating");
    setError(null);
    try {
      const result = await generatePortrait(uploadedImage, selectedSport);
      if (result.ok && result.data) {
        setGeneratedImages([result.data]);
        setStep("result");
      } else {
        setError(result.error || "Generation failed. Please try again.");
        setStep("sport");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("sport");
    }
  };

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
            {(["upload", "sport", "result"] as const).map((s, i) => {
              const labels = ["Upload", "Style", "Portrait"];
              const isActive = step === s || (step === "generating" && s === "result");
              const isDone =
                (s === "upload" && step !== "upload") ||
                (s === "sport" && (step === "generating" || step === "result"));
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
        {/* Step 1: Upload */}
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
                Upload Your <span className="gradient-text">Photo</span>
              </h1>
              <p className="text-slate-400 mt-2">Any photo works — game day, practice, or a casual shot from your phone.</p>
              {error && (
                <div className="mt-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm font-medium">
                  {error}
                </div>
              )}
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-12 sm:p-20 text-center transition-all ${
                dragOver
                  ? "border-indigo-500 bg-indigo-500/5"
                  : "border-slate-800 hover:border-slate-600 bg-slate-900/30 hover:bg-slate-900/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />

              <div className="flex flex-col items-center gap-4">
                <div className={`p-4 rounded-2xl transition-colors ${dragOver ? "bg-indigo-500/10" : "bg-slate-800"}`}>
                  <svg className={`w-10 h-10 transition-colors ${dragOver ? "text-indigo-400" : "text-slate-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-bold text-slate-300">
                    <span className="text-indigo-400">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-sm text-slate-500 mt-1">JPG, PNG, HEIC — any photo from your camera roll</p>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <div className="h-px flex-1 bg-slate-800" />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">or</span>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>

                <button className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm transition-all flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  Take a Photo
                </button>
              </div>
            </div>

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

        {/* Step 2: Pick Sport/Style */}
        {step === "sport" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Pick a <span className="gradient-text">Sport</span>
              </h1>
              <p className="text-slate-400 mt-2">Choose the sport for your portrait style.</p>
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

            {/* Sport grid */}
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
              <button
                onClick={handleGenerate}
                disabled={!selectedSport}
                className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-black text-base uppercase tracking-wider transition-all ${
                  selectedSport
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-0.5"
                    : "bg-slate-800 text-slate-600 cursor-not-allowed"
                }`}
              >
                Generate Portrait — Free
              </button>
              <p className="text-xs text-slate-600">You have 2 free portraits remaining</p>
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
            <p className="mt-8 text-xs text-slate-600 text-center max-w-sm">
              Our AI is analyzing your photo and generating a professional sports portrait. Hang tight!
            </p>
          </div>
        )}

        {/* Step 4: Result */}
        {step === "result" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Your <span className="gradient-text">Portrait</span>
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
                <button className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download
                </button>
                <button className="px-8 py-3 rounded-xl border border-slate-700 hover:border-slate-500 font-bold text-sm text-slate-300 transition-all flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-8.25 0h.008v.008H10.5V12z" />
                  </svg>
                  Order Prints
                </button>
              </div>

              <div className="mt-4 p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 text-center max-w-md">
                <p className="text-sm font-bold text-indigo-400">Want more portraits?</p>
                <p className="text-xs text-slate-400 mt-1">Get 5 portraits for just $9.99 — try different sports and styles.</p>
                <button className="mt-3 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black uppercase tracking-wider transition-all">
                  Upgrade Now
                </button>
              </div>

              <button
                onClick={() => { setStep("upload"); setUploadedImage(null); setSelectedSport(null); setGeneratedImages([]); }}
                className="mt-2 text-sm text-slate-500 hover:text-slate-300 transition"
              >
                ← Create Another Portrait
              </button>
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
