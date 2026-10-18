import { test, expect } from "@playwright/test";
import { entrar, salir, USUARIOS } from "./helpers";

// Nombre único por ejecución para no depender de reiniciar la base de datos.
const nuevo = `luis${Date.now().toString().slice(-6)}`;

test.describe.configure({ mode: "serial" });

test("el jefe crea un trabajador y este puede entrar", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/equipo");
  await page.getByRole("link", { name: "Nuevo usuario" }).click();
  await page.getByLabel("Usuario").filter({ visible: true }).fill(nuevo);
  await page.getByLabel("Nombre").filter({ visible: true }).fill("Luis Prueba");
  await page.getByLabel("Contraseña").filter({ visible: true }).fill("clave1234");
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page).toHaveURL(/\/equipo$/);
  await expect(page.getByText(`@${nuevo}`).filter({ visible: true })).toBeVisible();
  await salir(page);

  await entrar(page, nuevo, "clave1234");
  await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
});

test("un trabajador no puede entrar en Equipo", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await page.goto("/equipo");
  await expect(page).toHaveURL(/\/$/);
});

test("no se puede repetir un usuario", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/equipo/nuevo");
  await page.getByLabel("Usuario").filter({ visible: true }).fill("pepe");
  await page.getByLabel("Nombre").filter({ visible: true }).fill("Otro Pepe");
  await page.getByLabel("Contraseña").filter({ visible: true }).fill("clave1234");
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page.getByText("Ese usuario ya existe").filter({ visible: true })).toBeVisible();
});

test("al desactivar a un trabajador con la sesión abierta, sale al login", async ({ browser }) => {
  const trabajador = await (await browser.newContext()).newPage();
  await entrar(trabajador, nuevo, "clave1234");

  const jefe = await (await browser.newContext()).newPage();
  await entrar(jefe, "carlos", USUARIOS.carlos);
  await jefe.goto("/equipo");
  await jefe.getByRole("link", { name: new RegExp(`@${nuevo}\\b`) }).click();
  await jefe.getByLabel("Activo").filter({ visible: true }).uncheck();
  await jefe.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(jefe.getByText("Cambios guardados").filter({ visible: true })).toBeVisible();

  await trabajador.reload();
  await expect(trabajador).toHaveURL(/\/login/);
  await expect(trabajador.getByText("Usuario desactivado").filter({ visible: true })).toBeVisible();

  // Y tampoco puede volver a entrar
  await trabajador.getByLabel("Usuario").filter({ visible: true }).fill(nuevo);
  await trabajador.getByLabel("Contraseña").filter({ visible: true }).fill("clave1234");
  await trabajador.getByRole("button", { name: "Entrar" }).click();
  await expect(trabajador.getByText("Usuario desactivado").filter({ visible: true })).toBeVisible();
});

test("el jefe no puede quitarse el rol de jefe", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/equipo");
  await page.getByRole("link", { name: /Carlos/ }).click();
  await page.getByLabel("Rol").filter({ visible: true }).selectOption("trabajador");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("No puedes quitarte el rol de jefe a ti mismo").filter({ visible: true })).toBeVisible();
  await page.goto("/equipo");
  await expect(page).toHaveURL(/\/equipo$/);
});

test("un aviso de «guardado» no reaparece al volver a la ficha", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/equipo");
  await page.getByRole("link", { name: /@pepe\b/ }).click();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados").filter({ visible: true })).toBeVisible();
  await page.getByRole("link", { name: /Equipo/ }).first().click();
  await page.getByRole("link", { name: /@pepe\b/ }).click();
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeVisible();
  await expect(page.getByText("Cambios guardados").filter({ visible: true })).toHaveCount(0);
});

test("el jefe cambia la contraseña de un trabajador", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/equipo");
  await page.getByRole("link", { name: /Ana/ }).click();
  await page.getByLabel("Nueva contraseña").filter({ visible: true }).fill(USUARIOS.ana);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText("Contraseña cambiada").filter({ visible: true })).toBeVisible();
});
