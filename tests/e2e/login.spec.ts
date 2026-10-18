import { test, expect } from "@playwright/test";
import { entrar, salir, USUARIOS } from "./helpers";

test("sin sesión, cualquier página lleva al login", async ({ page }) => {
  await page.goto("/obras");
  await expect(page).toHaveURL(/\/login/);
});

test("el jefe entra y sale", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
  await salir(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("el usuario no distingue mayúsculas ni espacios", async ({ page }) => {
  await entrar(page, "  CARLOS ", USUARIOS.carlos);
  await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
});

test("contraseña incorrecta muestra error y no entra", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Usuario").filter({ visible: true }).fill("carlos");
  await page.getByLabel("Contraseña").filter({ visible: true }).fill("mala-clave");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Usuario o contraseña incorrectos").filter({ visible: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
