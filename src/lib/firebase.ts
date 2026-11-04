// src/lib/firebase.ts
// Carga diferida (lazy) del SDK de Firebase/Firestore para reducir ~130KB gzip del bundle inicial

import type { Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDpwiDs-V5XB_CgXpJOutxuP6ulMFH_AQM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "saleshelper-domus.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "saleshelper-domus",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "saleshelper-domus.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "289288394686",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:289288394686:web:49ce7ec0840427ee924bef",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-B36R57KWD3",
};

let dbPromise: Promise<Firestore | null> | null = null;

export function getFirestoreDb(): Promise<Firestore | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    try {
      const [{ initializeApp, getApps, getApp }, { getFirestore }] = await Promise.all([
        import("firebase/app"),
        import("firebase/firestore"),
      ]);
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      return getFirestore(app);
    } catch {
      return null;
    }
  })();

  return dbPromise;
}
