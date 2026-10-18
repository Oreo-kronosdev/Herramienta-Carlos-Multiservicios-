import type { Resultado } from "@/lib/equipo";
import { TIPOS_MOVIMIENTO, type TipoMovimiento } from "@/lib/etiquetas";
import { esFechaValida, hoyMadrid, sumarDias } from "@/lib/fechas";
import { parseImporte } from "@/lib/importe";

const MAX = 1e10; // numeric(12,2)

function importe(raw: string, errores: Record<string, string>): number {
  const n = parseImporte(raw);
  if (n === null) errores.importe = "Escribe el importe";
  else if (n === "invalido" || n <= 0 || n >= MAX) errores.importe = "Importe no válido. Ej.: 1.250,50";
  return typeof n === "number" ? n : 0;
}

export type MovimientoInput = { tipo: TipoMovimiento; concepto: string; importe: number; fecha: string; obra_id: string | null };

export function parseMovimiento(fd: FormData): Resultado<MovimientoInput> {
  const t = (k: string) => String(fd.get(k) ?? "").trim();
  const errores: Record<string, string> = {};
  if (!Object.hasOwn(TIPOS_MOVIMIENTO, t("tipo"))) errores.tipo = "Elige ingreso o gasto";
  if (!t("concepto")) errores.concepto = "Escribe el concepto";
  const n = importe(t("importe"), errores);
  if (!esFechaValida(t("fecha"))) errores.fecha = "Elige una fecha válida";
  if (Object.keys(errores).length) return { ok: false, errores };
  return {
    ok: true,
    data: { tipo: t("tipo") as TipoMovimiento, concepto: t("concepto"), importe: n, fecha: t("fecha"), obra_id: t("obra_id") || null },
  };
}

export type FacturaInput = {
  numero: string;
  cliente_id: string;
  obra_id: string | null;
  concepto: string;
  importe: number;
  fecha_emision: string;
  fecha_vencimiento: string | null;
};

export function parseFactura(fd: FormData): Resultado<FacturaInput> {
  const t = (k: string) => String(fd.get(k) ?? "").trim();
  const errores: Record<string, string> = {};
  const vence = t("fecha_vencimiento") || null;
  if (!t("numero")) errores.numero = "Pon el número de factura";
  if (!t("cliente_id")) errores.cliente_id = "Elige el cliente";
  if (!t("concepto")) errores.concepto = "Escribe el concepto";
  const n = importe(t("importe"), errores);
  if (!esFechaValida(t("fecha_emision"))) errores.fecha_emision = "Elige una fecha válida";
  if (vence && !esFechaValida(vence)) errores.fecha_vencimiento = "Elige una fecha válida";
  else if (vence && esFechaValida(t("fecha_emision")) && vence < t("fecha_emision"))
    errores.fecha_vencimiento = "No puede vencer antes de emitirse";
  if (Object.keys(errores).length) return { ok: false, errores };
  return {
    ok: true,
    data: {
      numero: t("numero"),
      cliente_id: t("cliente_id"),
      obra_id: t("obra_id") || null,
      concepto: t("concepto"),
      importe: n,
      fecha_emision: t("fecha_emision"),
      fecha_vencimiento: vence,
    },
  };
}

export function rangoMes(mes: string | undefined, hoy: string = hoyMadrid()) {
  const valido = typeof mes === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : hoy.slice(0, 7);
  const desde = `${valido}-01`;
  const hasta = sumarDias(`${mesSiguiente(valido)}-01`, -1);
  return { mes: valido, desde, hasta };
}

export function mesSiguiente(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

export function mesAnterior(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

export function nombreMes(mes: string): string {
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${mes}-01T00:00:00Z`));
}

// En céntimos enteros para que 0,1 + 0,2 sea 0,30 exacto.
export function resumen(movs: { tipo: TipoMovimiento; importe: number }[]) {
  let ingresos = 0;
  let gastos = 0;
  for (const m of movs) {
    const c = Math.round(Number(m.importe) * 100);
    if (m.tipo === "ingreso") ingresos += c;
    else gastos += c;
  }
  return { ingresos: ingresos / 100, gastos: gastos / 100, balance: (ingresos - gastos) / 100 };
}
