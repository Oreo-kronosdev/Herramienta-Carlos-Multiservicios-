"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { useOffline } from "next/offline";
import { useEnvioPendiente } from "@/components/SinConexion";

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "danger";
}) {
  const { pending } = useFormStatus();
  const sinRed = useOffline();
  useEnvioPendiente(pending);
  const color =
    variant === "danger" ? "bg-danger text-white" : "bg-accent text-accent-ink";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex h-13 w-full items-center justify-center rounded-[10px] px-5 text-[17px] font-semibold transition-transform duration-100 ease-out active:scale-[0.98] disabled:opacity-60 ${color}`}
    >
      {pending ? (sinRed ? "Sin conexión · se enviará al volver" : (pendingText ?? "Guardando…")) : children}
    </button>
  );
}
