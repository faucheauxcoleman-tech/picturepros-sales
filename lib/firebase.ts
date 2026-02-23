import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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

export async function signInWithGoogle() {
  return signInWithPopup(auth!, googleProvider!);
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
