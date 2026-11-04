// src/hooks/useInteracciones.ts
import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useUltimasInteracciones() {
  const [interacciones, setInteracciones] = useState<Record<string, { tipo: string; fecha: Date }>>({});

  useEffect(() => {
    if (!db) return;

    const q = query(
      collection(db, "interacciones_ws"),
      orderBy("fecha", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const mapa: Record<string, { tipo: string; fecha: Date }> = {};

      snapshot.forEach((doc) => {
        const data = doc.data();
        const rawTel = typeof data.cliente_telefono === "string" ? data.cliente_telefono.replace(/\D/g, "") : "";
        if (!rawTel) return;

        const entry = {
          tipo: data.tipo_mensaje,
          fecha: data.fecha?.toDate() || new Date(),
        };

        if (!mapa[rawTel]) {
          mapa[rawTel] = entry;
        }
        if (rawTel.length > 10) {
          const shortTel = rawTel.slice(-10);
          if (!mapa[shortTel]) {
            mapa[shortTel] = entry;
          }
        }
      });

      setInteracciones(mapa);
    });

    return () => unsub();
  }, []);

  return interacciones;
}
