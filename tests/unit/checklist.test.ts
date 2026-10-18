import { describe, expect, test } from "vitest";
import { parseItem } from "@/lib/checklist";
import { fd } from "./fd";

describe("elemento del checklist", () => {
  test("válido", () => {
    expect(parseItem(fd({ obra_id: "o1", texto: "  Brocha 50 mm ", tipo: "material" }))).toEqual({
      ok: true,
      data: { obra_id: "o1", texto: "Brocha 50 mm", tipo: "material" },
    });
  });
  test("vacío", () => {
    const r = parseItem(fd({ obra_id: "o1", texto: "  ", tipo: "material" }));
    expect(!r.ok && r.errores.texto).toBe("Escribe qué hace falta");
  });
  test("demasiado largo", () => {
    const r = parseItem(fd({ obra_id: "o1", texto: "x".repeat(121), tipo: "herramienta" }));
    expect(!r.ok && r.errores.texto).toBe("Máximo 120 caracteres");
  });
  test("tipo inventado", () => {
    const r = parseItem(fd({ obra_id: "o1", texto: "x", tipo: "comida" }));
    expect(!r.ok && r.errores.tipo).toBe("Elige material o herramienta");
  });
});
