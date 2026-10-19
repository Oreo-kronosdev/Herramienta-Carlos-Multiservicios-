import { test, expect } from "@playwright/test";
import { entrar, USUARIOS } from "./helpers";

test("un error no borra lo escrito: solo falta rellenar lo marcado", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/agenda/nuevo");
  const titulo = page.getByLabel("Título").filter({ visible: true });
  await titulo.fill("Visita sin fecha");
  await page.getByLabel("Hora").filter({ visible: true }).fill("10:30");
  await page.getByLabel("Pepe").filter({ visible: true }).check();
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByText("Elige una fecha válida").filter({ visible: true })).toBeVisible();
  const fecha = page.locator("input[name=fecha]").filter({ visible: true });
  await expect(fecha).toHaveAttribute("aria-invalid", "true");
  await expect(fecha).toBeFocused();
  await expect(titulo).toHaveValue("Visita sin fecha");
  await expect(page.getByLabel("Hora").filter({ visible: true })).toHaveValue("10:30");
  await expect(page.getByLabel("Pepe").filter({ visible: true })).toBeChecked();

  await fecha.fill("2030-01-15");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("heading", { name: "Visita sin fecha" })).toBeVisible();
});

test("sin conexión se avisa y se guarda al volver la señal", async ({ page, context }) => {
  const nombre = `Sin señal ${Date.now().toString().slice(-6)}`;
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/clientes/nuevo");
  await page.getByLabel("Nombre").filter({ visible: true }).fill(nombre);

  await context.setOffline(true);
  await expect(page.getByText("Sin conexión. Lo que guardes se enviará al recuperarla.")).toBeVisible();
  await page.getByRole("button", { name: "Guardar cliente" }).click();
  await expect(page.getByRole("button", { name: "Sin conexión · se enviará al volver" })).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Sin conexión. Lo que guardes")).toHaveCount(0);
});
