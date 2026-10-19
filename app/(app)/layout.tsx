import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { BotonSalir } from "@/components/BotonSalir";
import { SincronizarAvisos } from "@/components/SincronizarAvisos";
import { SinConexion } from "@/components/SinConexion";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const perfil = await requireUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-ink pt-[env(safe-area-inset-top)] text-white print:hidden">
        <div className="mx-auto flex h-(--header-h) max-w-2xl items-center justify-between px-4">
          <span className="font-display text-lg font-bold tracking-wide">
            Multiservicios
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[15px] text-white/70">{perfil.nombre}</span>
            <BotonSalir />
          </div>
        </div>
        <SinConexion />
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-5 pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1.5rem)] print:max-w-none print:p-0">
        {children}
      </main>
      <BottomNav esJefe={perfil.rol === "jefe"} />
      <SincronizarAvisos />
    </div>
  );
}

function ShellFallback() {
  return (
    <div className="min-h-dvh">
      <div className="h-[calc(var(--header-h)+env(safe-area-inset-top))] bg-ink" />
    </div>
  );
}
