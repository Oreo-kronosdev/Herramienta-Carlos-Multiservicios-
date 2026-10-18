import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

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
      <header className="sticky top-0 z-20 bg-ink pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto flex h-(--header-h) max-w-2xl items-center justify-between px-4">
          <span className="font-display text-lg font-bold tracking-wide">
            Multiservicios
          </span>
          <form action={signOut} className="flex items-center gap-3">
            <span className="text-[15px] text-white/70">{perfil.nombre}</span>
            <button
              type="submit"
              className="h-10 rounded-lg px-3 text-[15px] font-semibold text-white/90 active:bg-white/10"
            >
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-5 pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1.5rem)]">
        {children}
      </main>
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
