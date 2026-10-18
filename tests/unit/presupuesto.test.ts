import { describe, expect, test } from "vitest";
import { parseLinea } from "@/lib/presupuesto";
import { medidasReducidas, validarFoto } from "@/lib/imagen";
import { fd } from "./fd";

describe("líneas de medidas y materiales", () => {
  test("cantidad al estilo español", () => {
    expect(parseLinea(fd({ concepto: " Canalón fachada ", cantidad: "12,5", unidad: "ml" }), "concepto")).toEqual({
      ok: true,
      data: { texto: "Canalón fachada", cantidad: 12.5, unidad: "ml" },
    });
  });
  test("cero, texto vacío y unidad inventada", () => {
    const r = parseLinea(fd({ material: "", cantidad: "0", unidad: "palmos" }), "material");
    expect(!r.ok && Object.keys(r.errores).sort()).toEqual(["cantidad", "material", "unidad"]);
  });
  test("cantidad enorme", () => {
    const r = parseLinea(fd({ concepto: "x", cantidad: "10000000", unidad: "m" }), "concepto");
    expect(!r.ok && r.errores.cantidad).toBeTruthy();
  });
});

describe("fotos", () => {
  test("solo imágenes de hasta 10 MB", () => {
    expect(validarFoto({ type: "image/jpeg", size: 3_000_000 })).toBeNull();
    expect(validarFoto({ type: "text/plain", size: 10 })).toBe("Solo se pueden subir fotos");
    expect(validarFoto({ type: "image/heic", size: 11 * 1024 * 1024 })).toBe("La foto es demasiado grande (máx. 10 MB)");
  });
  test("se reduce el lado mayor a 1600 px manteniendo la proporción", () => {
    expect(medidasReducidas(4000, 3000)).toEqual({ ancho: 1600, alto: 1200 });
    expect(medidasReducidas(3000, 4000)).toEqual({ ancho: 1200, alto: 1600 });
    expect(medidasReducidas(800, 600)).toEqual({ ancho: 800, alto: 600 });
  });
});
