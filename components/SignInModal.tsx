"use client";

import React, { useState } from "react";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, isEmbeddedWebview } from "@/lib/firebase";

interface SignInModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SignInModal({ open, onClose, onSuccess }: SignInModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Google sign-in failed";
      if (msg.includes("popup-closed")) setError("Sign-in popup was closed");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      if (msg.includes("wrong-password") || msg.includes("invalid-credential")) setError("Incorrect email or password");
      else if (msg.includes("user-not-found")) setError("No account found with this email");
      else if (msg.includes("email-already-in-use")) setError("An account already exists with this email");
      else if (msg.includes("weak-password")) setError("Password must be at least 6 characters");
      else if (msg.includes("invalid-email")) setError("Invalid email address");
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black tracking-tight">
            {mode === "signin" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {mode === "signin" ? "Sign in to generate portraits" : "Sign up to get started"}
          </p>
        </div>

        {/* Google sign-in — or open-in-browser prompt for embedded webviews */}
        {isEmbeddedWebview() ? (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-center">
            <p className="text-xs font-bold text-amber-300 mb-2">Google sign-in requires a real browser</p>
            <p className="text-[10px] text-amber-400/70 mb-3">Tap below to open in Safari or Chrome, or use email sign-in.</p>
            <button
              onClick={() => { window.open(window.location.href, '_blank'); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Open in Browser
            </button>
          </div>
        ) : (
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-slate-100 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        )}

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-slate-700" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{isEmbeddedWebview() ? 'sign in with email instead' : 'or'}</span>
          <div className="h-px flex-1 bg-slate-700" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm uppercase tracking-wider transition disabled:opacity-50"
          >
            {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-xs text-red-400 text-center">{error}</p>
        )}

        <p className="mt-4 text-xs text-slate-500 text-center">
          {mode === "signin" ? (
            <>Don&apos;t have an account?{" "}
              <button onClick={() => { setMode("signup"); setError(null); }} className="text-indigo-400 hover:underline">Sign up</button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button onClick={() => { setMode("signin"); setError(null); }} className="text-indigo-400 hover:underline">Sign in</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
