// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDpwiDs-V5XB_CgXpJOutxuP6ulMFH_AQM",
  authDomain: "saleshelper-domus.firebaseapp.com",
  projectId: "saleshelper-domus",
  storageBucket: "saleshelper-domus.firebasestorage.app",
  messagingSenderId: "289288394686",
  appId: "1:289288394686:web:49ce7ec0840427ee924bef",
  measurementId: "G-B36R57KWD3"
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
