import { describe, expect, test } from "vitest";
import { parseCliente } from "@/lib/cliente";
import { fd } from "./fd";

describe("datos de cliente", () => {
  test("el nombre es obligatorio", () => {
    const r = parseCliente(fd({ nombre: "   " }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.nombre).toBe("El nombre es obligatorio");
  });
  test("recorta espacios y deja vacíos como null", () => {
    const r = parseCliente(fd({ nombre: "  Comunidad Mayor 5 ", direccion: " ", administrador: "", telefono: "" }));
    expect(r).toEqual({
      ok: true,
      data: { nombre: "Comunidad Mayor 5", direccion: null, administrador: null, telefono: null },
    });
  });
  test("guarda todos los campos", () => {
    const r = parseCliente(fd({ nombre: "Lucía", direccion: "Av. Paz 12", administrador: "Fincas Sol", telefono: " 600 111 222 " }));
    expect(r.ok && r.data).toEqual({ nombre: "Lucía", direccion: "Av. Paz 12", administrador: "Fincas Sol", telefono: "600 111 222" });
  });
  test("teléfono con letras no vale", () => {
    const r = parseCliente(fd({ nombre: "Lucía", telefono: "llamar luego" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.telefono).toBeDefined();
  });
});
