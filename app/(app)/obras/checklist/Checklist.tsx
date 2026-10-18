import { createClient } from "@/lib/supabase/server";
import { TIPOS_CHECKLIST, type TipoChecklist } from "@/lib/etiquetas";
import { DesmarcarTodo, ItemCheck, NuevoItem, QuitarItem } from "./Controles";

export async function Checklist({ obraId, esJefe }: { obraId: string; esJefe: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checklist_items")
    .select("id, texto, tipo, preparado")
    .eq("obra_id", obraId)
    .order("created_at");
  const items = data ?? [];
  const hechos = items.filter((i) => i.preparado).length;

  return (
    <section aria-labelledby="checklist-titulo" className="rounded-card border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="checklist-titulo" className="font-display text-xl font-bold">
          Material y herramientas
        </h2>
        {hechos > 0 ? <DesmarcarTodo obraId={obraId} /> : null}
      </div>
      {items.length ? (
        <>
          <p data-testid="progreso" className="text-[15px] font-semibold text-muted">
            {hechos} de {items.length} preparados
          </p>
          <div className="mt-1.5 mb-3 h-2 overflow-hidden rounded-full bg-bg" aria-hidden="true">
            <div className="h-full rounded-full bg-ok transition-[width]" style={{ width: `${(hechos / items.length) * 100}%` }} />
          </div>
          {(Object.keys(TIPOS_CHECKLIST) as TipoChecklist[]).map((tipo) => {
            const delTipo = items.filter((i) => i.tipo === tipo);
            if (!delTipo.length) return null;
            return (
              <div key={tipo} role="group" aria-label={TIPOS_CHECKLIST[tipo]} className="mt-3">
                <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{TIPOS_CHECKLIST[tipo]}</h3>
                <ul className="divide-y divide-line">
                  {delTipo.map((i) => (
                    <li key={i.id} className="flex items-center gap-1">
                      <ItemCheck id={i.id} texto={i.texto} preparado={i.preparado} obraId={obraId} />
                      {esJefe ? <QuitarItem id={i.id} texto={i.texto} obraId={obraId} /> : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </>
      ) : (
        <p data-testid="progreso" className="text-muted">
          {esJefe ? "Apunta lo que hay que llevar a esta obra." : "Carlos aún no ha apuntado qué hay que llevar."}
        </p>
      )}
      {esJefe ? (
        <div className="mt-4">
          <NuevoItem obraId={obraId} />
        </div>
      ) : null}
    </section>
  );
}
