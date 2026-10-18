import { describe, expect, test } from "vitest";
import { parseEvento } from "@/lib/evento";
import { fd } from "./fd";

const base = {
  titulo: " Revisar bajantes ",
  tipo: "cita",
  fecha: "2026-10-20",
  hora: "09:30",
  obra_id: "c1",
  notas: "",
  avisar_dias: "2",
  personas: ["u1"],
};

describe("datos de cita", () => {
  test("válida", () => {
    expect(parseEvento(fd(base))).toEqual({
      ok: true,
      data: {
        titulo: "Revisar bajantes",
        tipo: "cita",
        fecha: "2026-10-20",
        hora: "09:30",
        obra_id: "c1",
        notas: null,
        avisar_dias: 2,
        personas: ["u1"],
      },
    });
  });
  test("hora y obra vacías son null", () => {
    const r = parseEvento(fd({ ...base, hora: "", obra_id: "" }));
    expect(r.ok && [r.data.hora, r.data.obra_id]).toEqual([null, null]);
  });
  test("un error por cada campo mal", () => {
    const r = parseEvento(fd({ ...base, titulo: " ", fecha: "2026-02-30", tipo: "x", avisar_dias: "5", personas: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errores).sort()).toEqual(["avisar_dias", "fecha", "personas", "tipo", "titulo"]);
      expect(r.errores.personas).toBe("Asigna al menos una persona");
    }
  });
  test("sin fecha", () => {
    const r = parseEvento(fd({ ...base, fecha: "" }));
    expect(!r.ok && r.errores.fecha).toBeTruthy();
  });
  test("hora mal escrita", () => {
    const r = parseEvento(fd({ ...base, hora: "25:00" }));
    expect(!r.ok && r.errores.hora).toBeTruthy();
  });
});
