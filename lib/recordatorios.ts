import { diasEntre, formatFecha, formatHora } from "@/lib/fechas";

export type Pendiente = {
  evento_id: string;
  user_id: string;
  titulo: string;
  fecha: string;
  hora: string | null;
  activo: boolean;
};
export type Sub = { endpoint: string; p256dh: string; auth: string };
export type Payload = { title: string; body: string; url: string };

// La consulta ya trae fecha_aviso <= hoy y sin avisar; aquí se quitan las pasadas y los desactivados.
export function elegirAvisos(filas: Pendiente[], hoy: string): Pendiente[] {
  return filas.filter((f) => f.activo && f.fecha >= hoy);
}

export function textoAviso(p: Pendiente, hoy: string): Payload {
  const dias = diasEntre(hoy, p.fecha);
  const cuando = dias <= 0 ? "Hoy" : dias === 1 ? "Mañana" : `En ${dias} días`;
  return {
    title: `${cuando}: ${p.titulo}`,
    body: `${formatFecha(p.fecha, hoy)} · ${formatHora(p.hora) ?? "Todo el día"}`,
    url: `/agenda/${p.evento_id}`,
  };
}

const caducada = (e: unknown) => {
  const s = (e as { statusCode?: number })?.statusCode;
  return s === 404 || s === 410;
};

export async function enviarAvisos(
  pendientes: Pendiente[],
  subsPorUsuario: Map<string, Sub[]>,
  enviar: (sub: Sub, payload: Payload) => Promise<void>,
  hoy: string,
) {
  const avisados: { evento_id: string; user_id: string }[] = [];
  const caducadas: string[] = [];
  let fallos = 0;

  for (const p of pendientes) {
    const payload = textoAviso(p, hoy);
    let ok = 0;
    let errores = 0;
    for (const sub of subsPorUsuario.get(p.user_id) ?? []) {
      try {
        await enviar(sub, payload);
        ok++;
      } catch (e) {
        if (caducada(e)) caducadas.push(sub.endpoint);
        else errores++;
      }
    }
    fallos += errores;
    // Sin errores reintentables (o con algún envío bueno) se da por avisado: si no, mañana se reintenta.
    if (ok > 0 || errores === 0) avisados.push({ evento_id: p.evento_id, user_id: p.user_id });
  }
  return { avisados, caducadas: [...new Set(caducadas)], fallos };
}

type Clave = { evento_id: string; user_id: string };

// Lote a lote: las filas llegan ya reservadas (marcadas); se liberan las que no se pudieron entregar.
export async function procesarAvisos(o: {
  hoy: string;
  limite: number;
  reclamar: (limite: number) => Promise<Pendiente[]>;
  cargarSubs: (usuarios: string[]) => Promise<Map<string, Sub[]>>;
  liberar: (filas: Clave[]) => Promise<void>;
  borrarCaducadas: (endpoints: string[]) => Promise<void>;
  enviar: (sub: Sub, payload: Payload) => Promise<void>;
}) {
  const total = { avisados: 0, caducadas: 0, fallos: 0 };
  for (;;) {
    const lote = await o.reclamar(o.limite);
    if (!lote.length) break;
    let subs: Map<string, Sub[]>;
    try {
      subs = await o.cargarSubs([...new Set(lote.map((p) => p.user_id))]);
    } catch (e) {
      await o.liberar(lote);
      throw e;
    }
    const r = await enviarAvisos(elegirAvisos(lote, o.hoy), subs, o.enviar, o.hoy);
    const ok = new Set(r.avisados.map((a) => `${a.evento_id}|${a.user_id}`));
    const pendientes = lote.filter((p) => !ok.has(`${p.evento_id}|${p.user_id}`));
    if (pendientes.length) await o.liberar(pendientes);
    if (r.caducadas.length) await o.borrarCaducadas(r.caducadas);
    total.avisados += r.avisados.length;
    total.caducadas += r.caducadas.length;
    total.fallos += r.fallos;
    if (lote.length < o.limite) break;
  }
  return total;
}
