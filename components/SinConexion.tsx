"use client";

import { useEffect, useRef, useState } from "react";
import { useOffline } from "next/offline";

// Envíos esperando conexión (Next los reintenta solo al volver la señal)
let pendientes = 0;

export function useEnvioPendiente(pending: boolean) {
  useEffect(() => {
    if (!pending) return;
    pendientes++;
    return () => {
      pendientes--;
    };
  }, [pending]);
}

export function SinConexion() {
  const sinRed = useOffline();
  const [recuperada, setRecuperada] = useState(false);
  const antes = useRef(false);

  useEffect(() => {
    if (antes.current && !sinRed) {
      setRecuperada(true);
      const t = setTimeout(() => setRecuperada(false), 4000);
      antes.current = sinRed;
      return () => clearTimeout(t);
    }
    antes.current = sinRed;
  }, [sinRed]);

  useEffect(() => {
    const avisar = (ev: BeforeUnloadEvent) => {
      if (pendientes > 0) ev.preventDefault();
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, []);

  if (sinRed)
    return (
      <p role="status" className="bg-warn-soft px-4 py-2.5 text-center text-[15px] font-semibold text-warn print:hidden">
        Sin conexión. Lo que guardes se enviará al recuperarla.
      </p>
    );
  if (recuperada)
    return (
      <p role="status" className="bg-ok-soft px-4 py-2.5 text-center text-[15px] font-semibold text-ok print:hidden">
        Conexión recuperada
      </p>
    );
  return null;
}
