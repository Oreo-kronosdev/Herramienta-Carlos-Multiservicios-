import { describe, expect, test } from "vitest";
import { elegirAvisos, enviarAvisos, textoAviso, type Pendiente, type Sub } from "@/lib/recordatorios";

const p = (over: Partial<Pendiente>): Pendiente => ({
  evento_id: "e1",
  user_id: "pepe",
  titulo: "Revisión de chimenea",
  fecha: "2026-10-20",
  hora: "09:30:00",
  activo: true,
  ...over,
});

describe("elegirAvisos", () => {
  test("descarta citas pasadas y personas desactivadas", () => {
    const filas = [
      p({ evento_id: "pasada", fecha: "2026-10-18" }),
      p({ evento_id: "inactivo", activo: false }),
      p({ evento_id: "hoy", fecha: "2026-10-19" }),
      p({ evento_id: "futura", fecha: "2026-10-22" }),
    ];
    expect(elegirAvisos(filas, "2026-10-19").map((f) => f.evento_id)).toEqual(["hoy", "futura"]);
  });
});

describe("textoAviso", () => {
  test("mañana, hoy y en N días", () => {
    expect(textoAviso(p({ fecha: "2026-10-20" }), "2026-10-19").title).toBe("Mañana: Revisión de chimenea");
    expect(textoAviso(p({ fecha: "2026-10-19" }), "2026-10-19").title).toBe("Hoy: Revisión de chimenea");
    expect(textoAviso(p({ fecha: "2026-10-22" }), "2026-10-19").title).toBe("En 3 días: Revisión de chimenea");
  });
  test("cuerpo con fecha y hora, y enlace a la cita", () => {
    const t = textoAviso(p({}), "2026-10-19");
    expect(t.body).toBe("martes, 20 de octubre · 09:30");
    expect(t.url).toBe("/agenda/e1");
    expect(textoAviso(p({ hora: null }), "2026-10-19").body).toBe("martes, 20 de octubre · Todo el día");
  });
});

describe("enviarAvisos", () => {
  const sub = (endpoint: string): Sub => ({ endpoint, p256dh: "k", auth: "a" });

  test("caducadas se borran, errores no marcan, sin suscripciones cuenta como avisado", async () => {
    const pendientes = [p({ user_id: "pepe" }), p({ user_id: "ana" }), p({ user_id: "luis" })];
    const subs = new Map<string, Sub[]>([
      ["pepe", [sub("pepe-ok"), sub("pepe-viejo")]],
      ["ana", [sub("ana-roto")]],
    ]);
    const enviados: string[] = [];
    const r = await enviarAvisos(pendientes, subs, async (s) => {
      if (s.endpoint === "pepe-viejo") throw Object.assign(new Error("gone"), { statusCode: 410 });
      if (s.endpoint === "ana-roto") throw Object.assign(new Error("boom"), { statusCode: 500 });
      enviados.push(s.endpoint);
    }, "2026-10-19");
    expect(enviados).toEqual(["pepe-ok"]);
    expect(r.avisados).toEqual([
      { evento_id: "e1", user_id: "pepe" },
      { evento_id: "e1", user_id: "luis" },
    ]);
    expect(r.caducadas).toEqual(["pepe-viejo"]);
    expect(r.fallos).toBe(1);
  });

  test("una suscripción caducada sola (404) no reintenta pero sí avisa", async () => {
    const r = await enviarAvisos([p({})], new Map([["pepe", [sub("x")]]]), async () => {
      throw Object.assign(new Error("nf"), { statusCode: 404 });
    }, "2026-10-19");
    expect(r.caducadas).toEqual(["x"]);
    expect(r.avisados).toHaveLength(1); // ya no hay dónde avisar: no se acumula
    expect(r.fallos).toBe(0);
  });
});
