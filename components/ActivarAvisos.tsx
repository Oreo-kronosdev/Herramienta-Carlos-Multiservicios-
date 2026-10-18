"use client";

import { useEffect, useState } from "react";
import { borrarSuscripcion, guardarSuscripcion } from "@/app/(app)/avisos/actions";

type Estado = "cargando" | "no-soportado" | "ios-instalar" | "denegado" | "activo" | "inactivo";

function clave(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function ActivarAvisos() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // En iPhone/iPad solo hay notificaciones con la app instalada en la pantalla de inicio
        const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
        return setEstado(ios ? "ios-instalar" : "no-soportado");
      }
      if (Notification.permission === "denied") return setEstado("denegado");
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      setEstado((await reg.pushManager.getSubscription()) ? "activo" : "inactivo");
    })().catch(() => setEstado("no-soportado"));
  }, []);

  async function activar() {
    setOcupado(true);
    try {
      if ((await Notification.requestPermission()) !== "granted") return setEstado("denegado");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: clave(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const { ok } = await guardarSuscripcion(JSON.parse(JSON.stringify(sub)));
      setEstado(ok ? "activo" : "inactivo");
    } catch {
      setEstado("inactivo");
    } finally {
      setOcupado(false);
    }
  }

  async function desactivar() {
    setOcupado(true);
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (sub) {
      await borrarSuscripcion(sub.endpoint);
      await sub.unsubscribe();
    }
    setEstado("inactivo");
    setOcupado(false);
  }

  if (estado === "cargando") return null;
  const caja = "mb-5 rounded-card border border-line bg-surface p-4";
  if (estado === "activo")
    return (
      <div className={`${caja} flex items-center justify-between gap-3`}>
        <p className="font-semibold text-ok">Avisos activados en este móvil ✓</p>
        <button type="button" onClick={desactivar} disabled={ocupado} className="h-10 shrink-0 rounded-lg px-3 text-[15px] font-semibold text-muted active:bg-bg">
          Desactivar
        </button>
      </div>
    );
  if (estado === "inactivo")
    return (
      <div className={caja}>
        <p className="mb-3 text-[15px] text-muted">Recibe un aviso en el móvil antes de cada cita.</p>
        <button
          type="button"
          onClick={activar}
          disabled={ocupado}
          className="flex h-12 w-full items-center justify-center rounded-[10px] bg-ink px-4 font-semibold text-white active:scale-[0.98] disabled:opacity-60"
        >
          {ocupado ? "Activando…" : "Activar avisos en este móvil"}
        </button>
      </div>
    );
  const textos: Record<string, string> = {
    "ios-instalar": "En iPhone, para recibir avisos primero instala la app: botón Compartir → «Añadir a pantalla de inicio». Luego ábrela desde ahí.",
    denegado: "Los avisos están bloqueados para esta web. Actívalos en los ajustes del navegador (Notificaciones) y vuelve aquí.",
    "no-soportado": "Este navegador no permite avisos. Prueba con Chrome en Android o con la app instalada en iPhone.",
  };
  return <p className={`${caja} text-[15px] text-muted`}>{textos[estado]}</p>;
}
