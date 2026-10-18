import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requireJefe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hoyMadrid } from "@/lib/fechas";
import { nombreMes, rangoMes, resumen } from "@/lib/finanzas";
import { TIPOS_MOVIMIENTO } from "@/lib/etiquetas";

const EUR = '#,##0.00 "€"';
const FECHA = "dd/mm/yyyy";
const fecha = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : null);

export async function GET(request: NextRequest) {
  await requireJefe();
  const hoy = hoyMadrid();
  const ano = request.nextUrl.searchParams.get("ano");
  const periodo =
    ano && /^\d{4}$/.test(ano)
      ? { desde: `${ano}-01-01`, hasta: `${ano}-12-31`, nombre: `año ${ano}`, archivo: ano }
      : (() => {
          const r = rangoMes(request.nextUrl.searchParams.get("mes") ?? undefined, hoy);
          return { desde: r.desde, hasta: r.hasta, nombre: nombreMes(r.mes), archivo: r.mes };
        })();

  const supabase = await createClient();
  const [{ data: movs, error: e1 }, { data: facturas, error: e2 }, { data: sinCobrar, error: e3 }] = await Promise.all([
    supabase
      .from("movimientos")
      .select("tipo, concepto, importe, fecha, obras (titulo)")
      .gte("fecha", periodo.desde)
      .lte("fecha", periodo.hasta)
      .order("fecha"),
    // Emitidas en el periodo + las pendientes de antes
    supabase
      .from("facturas")
      .select("numero, concepto, importe, fecha_emision, fecha_vencimiento, pagada, pagada_en, clientes (nombre), obras (titulo)")
      .or(`and(fecha_emision.gte.${periodo.desde},fecha_emision.lte.${periodo.hasta}),and(pagada.eq.false,fecha_emision.lt.${periodo.desde})`)
      .order("fecha_emision"),
    // Igual que en pantalla: todo lo que hoy está sin cobrar
    supabase.from("facturas").select("importe").eq("pagada", false),
  ]);
  if (e1 || e2 || e3) return NextResponse.json({ error: "No se pudieron leer los datos" }, { status: 500 });

  const r = resumen(movs);
  const pendiente = resumen(sinCobrar.map((f) => ({ tipo: "ingreso" as const, importe: f.importe }))).ingresos;
  const libro = new ExcelJS.Workbook();
  libro.creator = "Carlos Multiservicios";

  const hResumen = libro.addWorksheet("Resumen");
  hResumen.columns = [{ width: 28 }, { width: 18 }];
  hResumen.addRows([["Periodo", periodo.nombre], ["Ingresos", r.ingresos], ["Gastos", r.gastos], ["Balance", r.balance], ["Pendiente de cobro (hoy)", pendiente]]);
  for (let i = 2; i <= 5; i++) hResumen.getCell(`B${i}`).numFmt = EUR;
  hResumen.getColumn(1).font = { bold: true };

  const hMovs = libro.addWorksheet("Movimientos");
  hMovs.columns = [
    { header: "Fecha", width: 12, style: { numFmt: FECHA } },
    { header: "Tipo", width: 10 },
    { header: "Concepto", width: 40 },
    { header: "Obra", width: 30 },
    { header: "Importe (€)", width: 14, style: { numFmt: EUR } },
  ];
  // Gastos en negativo: la suma de la columna es el balance
  for (const m of movs) {
    hMovs.addRow([fecha(m.fecha), TIPOS_MOVIMIENTO[m.tipo], m.concepto, m.obras?.titulo ?? "", m.tipo === "gasto" ? -m.importe : Number(m.importe)]);
  }
  const ultima = hMovs.rowCount;
  // Sin movimientos no hay nada que sumar (y SUM(E2:E2) en la fila 2 sería circular)
  const total = hMovs.addRow(["", "", "Total (balance)", "", ultima >= 2 ? { formula: `SUM(E2:E${ultima})`, result: r.balance } : 0]);
  total.font = { bold: true };

  const hFact = libro.addWorksheet("Facturas");
  hFact.columns = [
    { header: "Número", width: 14 },
    { header: "Cliente", width: 30 },
    { header: "Obra", width: 30 },
    { header: "Concepto", width: 36 },
    { header: "Importe (€)", width: 14, style: { numFmt: EUR } },
    { header: "Emisión", width: 12, style: { numFmt: FECHA } },
    { header: "Vencimiento", width: 12, style: { numFmt: FECHA } },
    { header: "Estado", width: 12 },
    { header: "Pagada el", width: 12, style: { numFmt: FECHA } },
  ];
  for (const f of facturas) {
    hFact.addRow([
      f.numero,
      f.clientes?.nombre ?? "",
      f.obras?.titulo ?? "",
      f.concepto,
      Number(f.importe),
      fecha(f.fecha_emision),
      fecha(f.fecha_vencimiento),
      f.pagada ? "Pagada" : f.fecha_vencimiento && f.fecha_vencimiento < hoy ? "Vencida" : "Pendiente",
      fecha(f.pagada_en),
    ]);
  }
  for (const h of [hMovs, hFact]) {
    h.getRow(1).font = { bold: true };
    h.views = [{ state: "frozen", ySplit: 1 }];
  }

  const buffer = await libro.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="finanzas-${periodo.archivo}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
