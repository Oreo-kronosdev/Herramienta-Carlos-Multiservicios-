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
