import { describe, expect, test } from "vitest";
import { comprobarCambioPropio, parseNuevoUsuario } from "@/lib/equipo";
import { fd } from "./fd";

describe("cambios sobre uno mismo", () => {
  test("el jefe no puede quitarse el rol", () => {
    expect(comprobarCambioPropio("j", "j", { rol: "trabajador" })).not.toBeNull();
  });
  test("el jefe no puede desactivarse", () => {
    expect(comprobarCambioPropio("j", "j", { activo: false })).not.toBeNull();
  });
  test("el jefe puede cambiar su nombre o seguir activo y jefe", () => {
    expect(comprobarCambioPropio("j", "j", { rol: "jefe", activo: true })).toBeNull();
  });
  test("el jefe puede desactivar a otro", () => {
    expect(comprobarCambioPropio("j", "a", { activo: false })).toBeNull();
  });
});

describe("alta de usuario", () => {
  test("normaliza el usuario y acepta datos válidos", () => {
    const r = parseNuevoUsuario(fd({ username: " Luis ", nombre: " Luis Gómez ", password: "clave1234", rol: "trabajador" }));
    expect(r).toEqual({ ok: true, data: { username: "luis", nombre: "Luis Gómez", password: "clave1234", rol: "trabajador" } });
  });
  test("contraseña de menos de 8 caracteres", () => {
    const r = parseNuevoUsuario(fd({ username: "luis", nombre: "Luis", password: "corta", rol: "trabajador" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.password).toBe("Mínimo 8 caracteres");
  });
  test("rol inventado y nombre vacío", () => {
    const r = parseNuevoUsuario(fd({ username: "luis", nombre: "  ", password: "clave1234", rol: "admin" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores.rol).toBeDefined();
      expect(r.errores.nombre).toBe("El nombre es obligatorio");
    }
  });
  test("usuario con tilde", () => {
    const r = parseNuevoUsuario(fd({ username: "josé", nombre: "José", password: "clave1234", rol: "trabajador" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.username).toBeDefined();
  });
});
