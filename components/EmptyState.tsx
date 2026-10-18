import type { ReactNode } from "react";

export function EmptyState({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-card border-2 border-dashed border-line px-5 py-10 text-center">
      <p className="font-display text-xl font-bold">{titulo}</p>
      {children ? <div className="mt-1 text-muted">{children}</div> : null}
    </div>
  );
}
