import { describe, expect, test } from "vitest";
import { normalizeUsername, usernameToEmail, validateUsername } from "@/lib/username";

describe("nombres de usuario", () => {
  test("normaliza mayúsculas y espacios", () => {
    expect(normalizeUsername("  Pepe ")).toBe("pepe");
  });
  test("rechaza demasiado cortos", () => {
    expect(validateUsername("jo")).not.toBeNull();
  });
  test("rechaza espacios y tildes", () => {
    expect(validateUsername("josé luis")).not.toBeNull();
    expect(validateUsername("josé")).not.toBeNull();
  });
  test("acepta letras, números, punto, guion y guion bajo", () => {
    expect(validateUsername("jose.luis")).toBeNull();
    expect(validateUsername("ana_2")).toBeNull();
  });
  test("rechaza más de 30 caracteres", () => {
    expect(validateUsername("a".repeat(31))).not.toBeNull();
  });
  test("convierte a email interno", () => {
    expect(usernameToEmail("Carlos")).toBe("carlos@usuarios.local");
    expect(usernameToEmail(" CARLOS ")).toBe("carlos@usuarios.local");
  });
});
