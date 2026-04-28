"use client";

import React, { useState, useEffect, useRef } from "react";

interface EmailGateModalProps {
  open: boolean;
  intent: 'download' | 'print';
  onClose: () => void;
  onSubmit: (email: string) => void | Promise<void>;
}

export default function EmailGateModal({ open, intent, onClose, onSubmit }: EmailGateModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus when opened (side-effect only, no setState)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const validate = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = email.trim();
    if (!validate(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  };

  const headline = intent === 'download'
    ? "Where should we send your portrait?"
    : "Almost there! What's your email?";
  const subline = intent === 'download'
    ? "Drop your email and we'll save your portrait. We'll also send tips and exclusive print discounts."
    : "We'll send your order confirmation here. No spam — just the good stuff.";
  const ctaLabel = intent === 'download' ? "Get My Portrait" : "Continue to Checkout";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center">
              {intent === 'download' ? (
                <svg className="w-7 h-7 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              )}
            </div>
          </div>

          <h2 className="text-2xl font-black tracking-tight">{headline}</h2>
          <p className="mt-2 text-sm text-slate-400 max-w-sm">{subline}</p>

          <div className="mt-6 w-full">
            <input
              ref={inputRef}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition text-sm font-medium"
            />
            {error && <p className="mt-2 text-xs text-red-400 font-bold text-left">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-black text-sm uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-indigo-500/25 cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Working...
              </>
            ) : (
              <>
                {ctaLabel}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>

          <p className="mt-3 text-[10px] text-slate-600">
            We&apos;ll never share your email. Unsubscribe anytime.
          </p>
        </div>
      </form>
    </div>
  );
}
