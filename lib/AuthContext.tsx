"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { auth, onAuthStateChanged, handleRedirectResult, type User } from "./firebase";
import { trackSession } from "./api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    // Pick up redirect result (from signInWithRedirect in embedded browsers)
    handleRedirectResult().catch(() => {});
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Session tracking for signed-in users
  const sessionRef = useRef<{ id: string; start: number } | null>(null);

  const endSession = useCallback(async (u: User | null) => {
    const s = sessionRef.current;
    if (!s || !u) return;
    const durationMs = Date.now() - s.start;
    sessionRef.current = null;
    try {
      const token = await u.getIdToken();
      await trackSession('end', s.id, token, durationMs);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    // Start session
    const sid = `${user.uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionRef.current = { id: sid, start: Date.now() };
    user.getIdToken().then(token => trackSession('start', sid, token)).catch(() => {});

    // End session on tab close / navigate away
    const handleUnload = () => {
      const s = sessionRef.current;
      if (!s) return;
      const durationMs = Date.now() - s.start;
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://studio.picturepros.ai";
      // Use sendBeacon for reliability on tab close
      navigator.sendBeacon?.(
        `${API_BASE}/api/consumer/session-beacon`,
        JSON.stringify({ sessionId: s.id, durationMs })
      );
    };

    const handleVisChange = () => {
      if (document.visibilityState === 'hidden') handleUnload();
    };

    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisChange);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisChange);
      endSession(user);
    };
  }, [user, endSession]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
