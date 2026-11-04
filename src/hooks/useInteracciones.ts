// src/hooks/useInteracciones.ts
// Store singleton compartido con 1 único listener onSnapshot diferido tras hidratación

import { useSyncExternalStore } from "react";
import { getFirestoreDb } from "@/lib/firebase";

export type InteraccionResumen = { tipo: string; fecha: Date };
export type InteraccionesMap = Record<string, InteraccionResumen>;

const EMPTY_MAP: InteraccionesMap = {};

let currentSnapshot: InteraccionesMap = EMPTY_MAP;
const listeners = new Set<() => void>();
let firestoreUnsub: (() => void) | null = null;
let starting = false;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

function notifyListeners() {
  for (const fn of listeners) fn();
}

function startSharedListener() {
  if (firestoreUnsub || starting || typeof window === "undefined") return;
  starting = true;

  const init = async () => {
    try {
      const [db, { collection, query, orderBy, onSnapshot, limit }] = await Promise.all([
        getFirestoreDb(),
        import("firebase/firestore"),
      ]);
      if (!db || listeners.size === 0) {
        starting = false;
        return;
      }

      const q = query(
        collection(db, "interacciones_ws"),
        orderBy("fecha", "desc"),
        limit(100)
      );

      firestoreUnsub = onSnapshot(
        q,
        (snapshot) => {
          const mapa: InteraccionesMap = {};
          snapshot.forEach((doc) => {
            const data = doc.data();
            const rawTel =
              typeof data.cliente_telefono === "string"
                ? data.cliente_telefono.replace(/\D/g, "")
                : "";
            if (!rawTel) return;

            const entry: InteraccionResumen = {
              tipo: data.tipo_mensaje,
              fecha: data.fecha?.toDate?.() || new Date(),
            };

            if (!mapa[rawTel]) mapa[rawTel] = entry;
            if (rawTel.length > 10) {
              const shortTel = rawTel.slice(-10);
              if (!mapa[shortTel]) mapa[shortTel] = entry;
            }
          });

          currentSnapshot = mapa;
          notifyListeners();
        },
        () => {
          // Silenciar errores puntuales de conectividad móvil
        }
      );
    } finally {
      starting = false;
    }
  };

  if ("requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(init);
  } else {
    setTimeout(init, 150);
  }
}

function subscribe(callback: () => void): () => void {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
  listeners.add(callback);
  startSharedListener();

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && firestoreUnsub) {
      // Conservar listener caliente 30s al cambiar de pestaña en BottomNav
      cleanupTimer = setTimeout(() => {
        if (listeners.size === 0 && firestoreUnsub) {
          firestoreUnsub();
          firestoreUnsub = null;
        }
      }, 30_000);
    }
  };
}

function getSnapshot(): InteraccionesMap {
  return currentSnapshot;
}

function getServerSnapshot(): InteraccionesMap {
  return EMPTY_MAP;
}

export function useUltimasInteracciones(): InteraccionesMap {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
