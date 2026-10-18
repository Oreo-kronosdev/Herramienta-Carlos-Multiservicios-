"use client";

import { useEffect } from "react";
import { guardarSuscripcion } from "@/app/(app)/avisos/actions";

// Si este móvil ya tenía los avisos activados, se apuntan a nombre de quien acaba de entrar
// (móvil compartido) y se recupera la suscripción si el navegador la cambió.
export function SincronizarAvisos() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => (sub ? guardarSuscripcion(JSON.parse(JSON.stringify(sub.toJSON()))) : null))
      .catch(() => {});
  }, []);
  return null;
}
