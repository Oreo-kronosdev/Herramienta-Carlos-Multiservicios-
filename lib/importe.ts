const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function formatEUR(n: number): string {
  return EUR.format(n);
}

// Acepta "1.250,50", "1250,5", "1250.50" o "1.250". Punto = miles si va en grupos de 3; si no, decimal.
export function parseImporte(raw: string): number | null | "invalido" {
  const s = raw.replace(/€/g, "").replace(/\s/g, "");
  if (!s) return null;
  let normal: string;
  if (s.includes(",")) {
    if (!/^\d{1,3}(\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(s)) return "invalido";
    normal = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    normal = s.replace(/\./g, "");
  } else if (/^\d+(\.\d{1,2})?$/.test(s)) {
    normal = s;
  } else {
    return "invalido";
  }
  return Number(normal);
}
