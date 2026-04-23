"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { signOut } from "@/lib/firebase";

interface AccountDropdownProps {
  credits: number | null;
  onBuyCredits?: () => void;
}

export default function AccountDropdown({ credits, onBuyCredits }: AccountDropdownProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const initial = (user.displayName?.[0] || user.email?.[0] || "U").toUpperCase();
  const photoUrl = user.photoURL;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-slate-800/80 transition-all"
      >
        {/* Avatar */}
        {photoUrl ? (
          <img src={photoUrl} alt="" className="w-7 h-7 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-black text-white">
            {initial}
          </div>
        )}
        {/* Credits badge — visible on sm+ */}
        {credits !== null && (
          <span className="hidden sm:inline text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            {credits}
          </span>
        )}
        {/* Chevron */}
        <svg className={`w-3 h-3 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]">
          {/* User info */}
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-sm font-bold text-white truncate">{user.displayName || "My Account"}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>

          {/* Credits */}
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold">Credits</span>
              <span className="text-sm font-black text-white">{credits ?? 0}</span>
            </div>
            {onBuyCredits && (
              <button
                onClick={() => { setOpen(false); onBuyCredits(); }}
                className="mt-2 w-full py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-[11px] font-bold transition-colors"
              >
                Buy More Credits
              </button>
            )}
          </div>

          {/* My Portraits */}
          <a
            href="/gallery"
            onClick={() => setOpen(false)}
            className="w-full px-4 py-3 text-left text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-2 border-b border-slate-800"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            My Portraits
          </a>

          {/* My Orders */}
          <a
            href="/orders"
            onClick={() => setOpen(false)}
            className="w-full px-4 py-3 text-left text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-2 border-b border-slate-800"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            My Orders
          </a>

          {/* Sign out */}
          <button
            onClick={() => { setOpen(false); signOut(); }}
            className="w-full px-4 py-3 text-left text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
