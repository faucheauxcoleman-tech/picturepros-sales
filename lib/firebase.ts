import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDNEFauLBWuZeDQVMDwP6H2zhCsKv7UMwI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "colemans-ai-database.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "colemans-ai-database",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "colemans-ai-database.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "474460553303",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:474460553303:web:d26ed0af6e9ae2d30ca312",
};

let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let googleProvider: GoogleAuthProvider | null = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
} catch {
  // Firebase init fails during build/prerender — that's OK
  console.warn("[firebase] init skipped (build/prerender)");
}

// Detect embedded webviews that block Google OAuth popups
export function isEmbeddedWebview(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|BytedanceWebview|TikTok|Musical|MicroMessenger|WeChat/i.test(ua);
}

export async function signInWithGoogle() {
  if (isEmbeddedWebview()) {
    // Redirect flow works in embedded browsers where popups are blocked
    return signInWithRedirect(auth!, googleProvider!);
  }
  try {
    return await signInWithPopup(auth!, googleProvider!);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    // If popup is blocked/disallowed, fall back to redirect
    if (code.includes('popup-blocked') || code.includes('popup-closed') || code.includes('unauthorized-domain') || code.includes('web-storage-unsupported')) {
      return signInWithRedirect(auth!, googleProvider!);
    }
    throw err;
  }
}

// Handle redirect result (called on page load after redirect flow)
export async function handleRedirectResult() {
  if (!auth) return null;
  try {
    return await getRedirectResult(auth);
  } catch {
    return null;
  }
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth!, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth!, email, password);
}

export async function signOut() {
  return firebaseSignOut(auth!);
}

export { auth, onAuthStateChanged, type User };
