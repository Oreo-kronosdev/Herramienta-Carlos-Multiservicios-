"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

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
  const color =
    variant === "danger" ? "bg-danger text-white" : "bg-accent text-accent-ink";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex h-13 w-full items-center justify-center rounded-[10px] px-5 text-[17px] font-semibold transition-transform duration-100 ease-out active:scale-[0.98] disabled:opacity-60 ${color}`}
    >
      {pending ? (pendingText ?? "Guardando…") : children}
    </button>
  );
}
