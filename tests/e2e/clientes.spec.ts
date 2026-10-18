import { test, expect } from "@playwright/test";
import { crearTrabajador, entrar, USUARIOS } from "./helpers";

test.describe.configure({ mode: "serial" });
const nombre = `Comunidad Prueba ${Date.now().toString().slice(-6)}`;

test("trabajador sin obras ve la lista vacía", async ({ page }) => {
  const t = await crearTrabajador("vacio");
  await entrar(page, t.username, t.password);
  await page.goto("/clientes");
  await expect(page.getByText("Aún no hay clientes").filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nuevo cliente" })).toHaveCount(0);
});

test("el jefe crea y edita un cliente", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/clientes");
  await page.getByRole("link", { name: "Nuevo cliente" }).click();
  await page.getByLabel("Nombre").filter({ visible: true }).fill(nombre);
  await page.getByLabel("Dirección").filter({ visible: true }).fill("Calle Prueba 1");
  await page.getByLabel("Comunidad / administrador").filter({ visible: true }).fill("Fincas Prueba");
  await page.getByLabel("Teléfono").filter({ visible: true }).fill("600 999 888");
  await page.getByRole("button", { name: "Guardar cliente" }).click();

  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  await expect(page.getByRole("link", { name: "600 999 888" })).toHaveAttribute("href", "tel:600999888");

  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Dirección").filter({ visible: true }).fill("Calle Prueba 2");
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await expect(page.getByText("Calle Prueba 2").filter({ visible: true })).toBeVisible();

  await page.goto("/clientes");
  await expect(page.getByRole("link", { name: new RegExp(nombre) })).toBeVisible();
});

test("el nombre es obligatorio", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/clientes/nuevo");
  await page.getByLabel("Nombre").filter({ visible: true }).fill("   ");
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await expect(page.getByText("El nombre es obligatorio").filter({ visible: true })).toBeVisible();
});

test("no se puede borrar un cliente con obras", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/clientes");
  await page.getByRole("link", { name: /Comunidad C\/ Mayor 5/ }).click();
  await page.getByRole("link", { name: "Editar" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Borrar cliente" }).click();
  await expect(page.getByText("No se puede borrar: tiene obras").filter({ visible: true })).toBeVisible();
});

test("el jefe borra un cliente sin obras", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/clientes");
  await page.getByRole("link", { name: new RegExp(nombre) }).click();
  await page.getByRole("link", { name: "Editar" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Borrar cliente" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await expect(page.getByRole("link", { name: new RegExp(nombre) })).toHaveCount(0);
});

test("el trabajador solo ve los clientes de sus obras y no puede crear", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await page.goto("/clientes");
  await expect(page.getByRole("link", { name: /Comunidad C\/ Mayor 5/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Lucía Pérez/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Nuevo cliente" })).toHaveCount(0);
  await page.goto("/clientes/nuevo");
  await expect(page).toHaveURL(/\/$/);
});
