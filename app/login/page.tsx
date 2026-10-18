import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-ink px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-sm flex-1">
        <p className="font-display text-sm font-semibold tracking-[0.18em] text-accent-soft/80 uppercase">
          Herramienta interna
        </p>
        <h1 className="mt-2 font-display text-[40px] leading-[1.02] font-bold text-white">
          Carlos
          <br />
          Multiservicios
        </h1>
        <p className="mt-3 text-[17px] text-white/70">Obras, clientes y equipo.</p>
        <div className="mt-10 rounded-card bg-bg p-5">
          <LoginForm />
        </div>
      </div>
      <p className="mx-auto mt-8 w-full max-w-sm text-sm text-white/50">
        ¿No tienes usuario? Pídeselo a Carlos.
      </p>
    </main>
  );
}
