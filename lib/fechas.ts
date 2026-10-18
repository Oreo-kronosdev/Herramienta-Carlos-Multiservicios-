// Las fechas de la agenda son días de calendario en España; "hoy" nunca se calcula en UTC.
const DIA_MADRID = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function hoyMadrid(ahora: Date = new Date()): string {
  return DIA_MADRID.format(ahora);
}

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);
}

export function esFechaValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

export function formatFecha(iso: string, hoy: string = hoyMadrid()): string {
  const mismoAno = iso.slice(0, 4) === hoy.slice(0, 4);
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(mismoAno ? {} : { year: "numeric" }),
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function formatHora(h: string | null): string | null {
  return h ? h.slice(0, 5) : null;
}
