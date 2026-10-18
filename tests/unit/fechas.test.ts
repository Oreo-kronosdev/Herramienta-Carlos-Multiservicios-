import { describe, expect, test } from "vitest";
import { formatFecha, formatHora, hoyMadrid } from "@/lib/fechas";

describe("hoyMadrid", () => {
  test("de noche en Madrid ya es el día siguiente aunque en UTC no", () => {
    expect(hoyMadrid(new Date("2026-10-18T22:30:00Z"))).toBe("2026-10-19"); // verano, UTC+2
    expect(hoyMadrid(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16"); // invierno, UTC+1
  });
  test("justo antes de medianoche sigue siendo el mismo día", () => {
    expect(hoyMadrid(new Date("2026-10-18T21:59:00Z"))).toBe("2026-10-18");
  });
});

describe("formato", () => {
  test("hora sin segundos", () => {
    expect(formatHora("09:30:00")).toBe("09:30");
    expect(formatHora(null)).toBeNull();
  });
  test("fecha en español", () => {
    expect(formatFecha("2026-10-20", "2026-10-18")).toBe("martes, 20 de octubre");
  });
  test("añade el año si no es el actual", () => {
    expect(formatFecha("2027-01-05", "2026-10-18")).toBe("martes, 5 de enero de 2027");
  });
});

import { diasEntre, sumarDias } from "@/lib/fechas";

describe("aritmética de días", () => {
  test("sumar días cruza meses y el cambio de hora", () => {
    expect(sumarDias("2026-10-24", 7)).toBe("2026-10-31");
    expect(sumarDias("2026-10-31", 1)).toBe("2026-11-01");
  });
  test("días entre dos fechas", () => {
    expect(diasEntre("2026-10-19", "2026-10-22")).toBe(3);
    expect(diasEntre("2026-10-25", "2026-10-26")).toBe(1); // día del cambio de hora
  });
});
