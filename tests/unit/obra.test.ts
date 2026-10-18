import { describe, expect, test } from "vitest";
import { parseObra } from "@/lib/obra";
import { fd } from "./fd";

const base = {
  cliente_id: "b0000000-0000-0000-0000-000000000001",
  titulo: " Limpieza de canalones ",
  direccion: "Calle Mayor 5",
  tipo_trabajo: "canalones",
  estado: "pendiente",
  presupuesto: "1.250,50",
};

describe("datos de obra", () => {
  test("datos válidos con trabajadores", () => {
    const r = parseObra(fd({ ...base, trabajadores: ["u1", "u2"] }));
    expect(r).toEqual({
      ok: true,
      data: {
        cliente_id: base.cliente_id,
        titulo: "Limpieza de canalones",
        direccion: "Calle Mayor 5",
        tipo_trabajo: "canalones",
        estado: "pendiente",
        presupuesto: 1250.5,
        trabajadores: ["u1", "u2"],
      },
    });
  });
  test("presupuesto vacío es null y sin trabajadores es lista vacía", () => {
    const r = parseObra(fd({ ...base, presupuesto: "" }));
    expect(r.ok && r.data.presupuesto).toBeNull();
    expect(r.ok && r.data.trabajadores).toEqual([]);
  });
  test("tipo de trabajo inventado", () => {
    const r = parseObra(fd({ ...base, tipo_trabajo: "piscinas" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.tipo_trabajo).toBeDefined();
  });
  test("estado inventado, sin cliente, sin título, sin dirección y presupuesto malo", () => {
    const r = parseObra(fd({ ...base, estado: "x", cliente_id: "", titulo: " ", direccion: "", presupuesto: "-5" }));
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(Object.keys(r.errores).sort()).toEqual(["cliente_id", "direccion", "estado", "presupuesto", "titulo"]);
  });
});
