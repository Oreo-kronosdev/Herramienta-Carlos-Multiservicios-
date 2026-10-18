import { describe, expect, test } from "vitest";
import { mesAnterior, mesSiguiente, nombreMes, parseFactura, parseMovimiento, rangoMes, resumen } from "@/lib/finanzas";
import { fd } from "./fd";

describe("movimientos", () => {
  test("válido", () => {
    expect(parseMovimiento(fd({ tipo: "gasto", concepto: " Tejas ", importe: "45,90", fecha: "2026-10-05", obra_id: "" }))).toEqual({
      ok: true,
      data: { tipo: "gasto", concepto: "Tejas", importe: 45.9, fecha: "2026-10-05", obra_id: null },
    });
  });
  test.each(["0", "-5", "10000000000", "abc", ""])("importe %s no vale", (importe) => {
    const r = parseMovimiento(fd({ tipo: "gasto", concepto: "x", importe, fecha: "2026-10-05" }));
    expect(!r.ok && r.errores.importe).toBeTruthy();
  });
  test("tipo, concepto y fecha obligatorios", () => {
    const r = parseMovimiento(fd({ tipo: "regalo", concepto: " ", importe: "1", fecha: "2026-13-01" }));
    expect(!r.ok && Object.keys(r.errores).sort()).toEqual(["concepto", "fecha", "tipo"]);
  });
});

describe("facturas", () => {
  const base = { numero: " 2026-010 ", cliente_id: "c1", obra_id: "", concepto: "Tejado", importe: "1.210,00", fecha_emision: "2026-10-01", fecha_vencimiento: "" };
  test("válida", () => {
    expect(parseFactura(fd(base))).toEqual({
      ok: true,
      data: { numero: "2026-010", cliente_id: "c1", obra_id: null, concepto: "Tejado", importe: 1210, fecha_emision: "2026-10-01", fecha_vencimiento: null },
    });
  });
  test("vencimiento antes de la emisión", () => {
    const r = parseFactura(fd({ ...base, fecha_vencimiento: "2026-09-30" }));
    expect(!r.ok && r.errores.fecha_vencimiento).toBe("No puede vencer antes de emitirse");
  });
  test("número y cliente obligatorios", () => {
    const r = parseFactura(fd({ ...base, numero: "", cliente_id: "" }));
    expect(!r.ok && Object.keys(r.errores).sort()).toEqual(["cliente_id", "numero"]);
  });
});

describe("meses", () => {
  test("rango del mes, incluidos febreros", () => {
    expect(rangoMes("2026-10")).toEqual({ mes: "2026-10", desde: "2026-10-01", hasta: "2026-10-31" });
    expect(rangoMes("2026-02").hasta).toBe("2026-02-28");
    expect(rangoMes("2028-02").hasta).toBe("2028-02-29");
  });
  test("mes inválido usa el actual", () => {
    expect(rangoMes("hola", "2026-10-19").mes).toBe("2026-10");
    expect(rangoMes("2026-13", "2026-10-19").mes).toBe("2026-10");
  });
  test("anterior, siguiente y nombre", () => {
    expect(mesSiguiente("2026-12")).toBe("2027-01");
    expect(mesAnterior("2026-01")).toBe("2025-12");
    expect(nombreMes("2026-10")).toBe("octubre de 2026");
  });
});

describe("resumen", () => {
  test("suma en céntimos exactos", () => {
    const r = resumen([
      { tipo: "ingreso", importe: 0.1 },
      { tipo: "ingreso", importe: 0.2 },
      { tipo: "gasto", importe: 45.9 },
    ]);
    expect(r).toEqual({ ingresos: 0.3, gastos: 45.9, balance: -45.6 });
  });
});
