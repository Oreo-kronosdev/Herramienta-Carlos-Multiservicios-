import { describe, expect, test } from "vitest";
import { formatEUR, parseImporte } from "@/lib/importe";

const sinEspaciosRaros = (s: string) => s.replace(/\s/g, " ");

describe("parseImporte (formato español)", () => {
  test.each([
    ["1.250,50", 1250.5],
    ["1250,5", 1250.5],
    ["1250", 1250],
    ["1250.50", 1250.5],
    ["1.250", 1250],
    ["12.500.000", 12500000],
    [" 1.250,50 € ", 1250.5],
    ["0", 0],
  ])("%s → %s", (txt, n) => {
    expect(parseImporte(txt)).toBe(n);
  });
  test("vacío es null", () => {
    expect(parseImporte("")).toBeNull();
    expect(parseImporte("   ")).toBeNull();
  });
  test.each(["-3", "abc", "12,345", "1,2,3", "1.25.0"])("%s es inválido", (txt) => {
    expect(parseImporte(txt)).toBe("invalido");
  });
});

describe("formatEUR", () => {
  test("formato español", () => {
    expect(sinEspaciosRaros(formatEUR(1250.5))).toBe("1250,50 €");
    expect(sinEspaciosRaros(formatEUR(12500))).toBe("12.500,00 €");
  });
});
