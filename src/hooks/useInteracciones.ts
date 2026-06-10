// src/hooks/useInteracciones.ts
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useUltimasInteracciones() {
  // Mapa de interacciones por teléfono del cliente
  const [interacciones, setInteracciones] = useState<Record<string, { tipo: string, fecha: Date }>>({});

  useEffect(() => {
    if (!db) return;
    
    const q = query(
      collection(db, "interacciones_ws"),
      orderBy("fecha", "desc"),
      limit(100) // Traemos las 100 más recientes para cubrir a la mayoría de los clientes activos
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const mapa: Record<string, { tipo: string, fecha: Date }> = {};
      
      // Al iterar en orden descendente, el primero que encontramos es el más reciente
      snapshot.forEach(doc => {
        const data = doc.data();
        const tel = data.cliente_telefono;
        if (tel && !mapa[tel]) {
           mapa[tel] = { 
             tipo: data.tipo_mensaje, 
             fecha: data.fecha?.toDate() || new Date() 
           };
        }
      });
      
      setInteracciones(mapa);
    });
    
    return () => unsub();
  }, []);

  return interacciones;
}
