import { describe, expect, test } from "vitest";
import { estadoTarea, parseTarea } from "@/lib/tarea";
import { fd } from "./fd";

describe("datos de tarea", () => {
  test("válida", () => {
    expect(parseTarea(fd({ titulo: " Comprar silicona ", notas: "", fecha_limite: "2026-10-20", obra_id: "", asignada_a: "u1" }))).toEqual({
      ok: true,
      data: { titulo: "Comprar silicona", notas: null, fecha_limite: "2026-10-20", obra_id: null, asignada_a: "u1" },
    });
  });
  test("sin título ni persona", () => {
    const r = parseTarea(fd({ titulo: "", asignada_a: "" }));
    expect(!r.ok && Object.keys(r.errores).sort()).toEqual(["asignada_a", "titulo"]);
    expect(!r.ok && r.errores.asignada_a).toBe("Elige a quién se la asignas");
  });
  test("fecha imposible y fecha vacía", () => {
    expect(parseTarea(fd({ titulo: "x", asignada_a: "u", fecha_limite: "2026-02-30" })).ok).toBe(false);
    const r = parseTarea(fd({ titulo: "x", asignada_a: "u", fecha_limite: "" }));
    expect(r.ok && r.data.fecha_limite).toBeNull();
  });
});

describe("estadoTarea (hoy en Madrid)", () => {
  const hoy = "2026-10-19";
  test("la de hoy no está vencida; la de ayer sí", () => {
    expect(estadoTarea({ hecha: false, fecha_limite: "2026-10-19" }, hoy)).toBe("pendiente");
    expect(estadoTarea({ hecha: false, fecha_limite: "2026-10-18" }, hoy)).toBe("vencida");
  });
  test("hecha manda sobre vencida; sin fecha es pendiente", () => {
    expect(estadoTarea({ hecha: true, fecha_limite: "2026-10-01" }, hoy)).toBe("hecha");
    expect(estadoTarea({ hecha: false, fecha_limite: null }, hoy)).toBe("pendiente");
  });
});
