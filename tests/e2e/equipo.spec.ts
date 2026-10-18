import { test, expect } from "@playwright/test";
import { entrar, salir, USUARIOS } from "./helpers";

// Nombre único por ejecución para no depender de reiniciar la base de datos.
const nuevo = `luis${Date.now().toString().slice(-6)}`;

test.describe.configure({ mode: "serial" });

test("el jefe crea un trabajador y este puede entrar", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/equipo");
  await page.getByRole("link", { name: "Nuevo usuario" }).click();
  await page.getByLabel("Usuario").fill(nuevo);
  await page.getByLabel("Nombre").fill("Luis Prueba");
  await page.getByLabel("Contraseña").fill("clave1234");
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page).toHaveURL(/\/equipo$/);
  await expect(page.getByText(`@${nuevo}`)).toBeVisible();
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
  await page.getByLabel("Usuario").fill("pepe");
  await page.getByLabel("Nombre").fill("Otro Pepe");
  await page.getByLabel("Contraseña").fill("clave1234");
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page.getByText("Ese usuario ya existe")).toBeVisible();
});

test("al desactivar a un trabajador con la sesión abierta, sale al login", async ({ browser }) => {
  const trabajador = await (await browser.newContext()).newPage();
  await entrar(trabajador, nuevo, "clave1234");

  const jefe = await (await browser.newContext()).newPage();
  await entrar(jefe, "carlos", USUARIOS.carlos);
  await jefe.goto("/equipo");
  await jefe.getByRole("link", { name: new RegExp(`@${nuevo}\\b`) }).click();
  await jefe.getByLabel("Activo").uncheck();
  await jefe.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(jefe.getByText("Cambios guardados")).toBeVisible();

  await trabajador.reload();
  await expect(trabajador).toHaveURL(/\/login/);
  await expect(trabajador.getByText("Usuario desactivado")).toBeVisible();

  // Y tampoco puede volver a entrar
  await trabajador.getByLabel("Usuario").fill(nuevo);
  await trabajador.getByLabel("Contraseña").fill("clave1234");
  await trabajador.getByRole("button", { name: "Entrar" }).click();
  await expect(trabajador.getByText("Usuario desactivado")).toBeVisible();
});

test("el jefe no puede quitarse el rol de jefe", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/equipo");
  await page.getByRole("link", { name: /Carlos/ }).click();
  await page.getByLabel("Rol").selectOption("trabajador");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("No puedes quitarte el rol de jefe a ti mismo")).toBeVisible();
  await page.goto("/equipo");
  await expect(page).toHaveURL(/\/equipo$/);
});

test("el jefe cambia la contraseña de un trabajador", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/equipo");
  await page.getByRole("link", { name: /Ana/ }).click();
  await page.getByLabel("Nueva contraseña").fill(USUARIOS.ana);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(page.getByText("Contraseña cambiada")).toBeVisible();
});
