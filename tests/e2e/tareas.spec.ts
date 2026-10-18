import { test, expect } from "@playwright/test";
import { entrar, USUARIOS } from "./helpers";
import { hoyMadrid, sumarDias } from "../../lib/fechas";

test.describe.configure({ mode: "serial" });
const titulo = `Comprar silicona ${Date.now().toString().slice(-6)}`;
const OBRA_PEPE = "/obras/c0000000-0000-0000-0000-000000000001";
const fila = (page: import("@playwright/test").Page, t: string) =>
  page.getByRole("listitem").filter({ hasText: t }).filter({ visible: true });

test("el jefe asigna una tarea a Pepe en una obra", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Tareas" }).click();
  await page.getByRole("link", { name: "Nueva tarea" }).click();
  await page.getByLabel("Qué hay que hacer").filter({ visible: true }).fill(titulo);
  await page.getByLabel("Para").filter({ visible: true }).selectOption({ label: "Pepe" });
  await page.getByLabel("Obra").filter({ visible: true }).selectOption({ label: "Limpieza de canalones" });
  await page.getByLabel("Fecha límite").filter({ visible: true }).fill(sumarDias(hoyMadrid(), 1));
  await page.getByRole("button", { name: "Guardar tarea" }).click();

  await expect(page).toHaveURL(/\/tareas$/);
  await expect(fila(page, titulo)).toContainText("Pepe");
  await page.goto(OBRA_PEPE);
  await expect(fila(page, titulo)).toBeVisible();
});

test("Pepe la ve en su inicio y la marca como hecha", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await expect(fila(page, titulo)).toBeVisible();
  await page.goto("/tareas");
  await expect(page.getByRole("link", { name: "Nueva tarea" })).toHaveCount(0);
  await expect(page.getByText("Comprar pintura de fachada").filter({ visible: true })).toHaveCount(0);
  await fila(page, titulo).getByRole("checkbox").check();
  await expect(fila(page, titulo)).toHaveCount(0); // sale de pendientes
  await page.getByRole("link", { name: "Ver hechas" }).click();
  await expect(fila(page, titulo).getByRole("checkbox")).toBeChecked();
  await page.goto("/tareas/nueva");
  await expect(page).toHaveURL(/\/$/);
});

test("una tarea con fecha de ayer sale como vencida", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await page.goto("/tareas");
  await expect(fila(page, "Mandar fotos del tiro de la chimenea")).toContainText("Vencida");
});

test("el jefe edita el título y la tarea sigue hecha", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/tareas?hechas=1");
  await fila(page, titulo).getByRole("link").click();
  await page.getByLabel("Qué hay que hacer").filter({ visible: true }).fill(`${titulo} (2 tubos)`);
  await page.getByRole("button", { name: "Guardar tarea" }).click();
  await expect(page).toHaveURL(/\/tareas$/);
  await page.goto("/tareas?hechas=1");
  await expect(fila(page, `${titulo} (2 tubos)`).getByRole("checkbox")).toBeChecked();
});

test("sin persona da error", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/tareas/nueva");
  await page.getByLabel("Qué hay que hacer").filter({ visible: true }).fill("Sin nadie");
  await page.getByRole("button", { name: "Guardar tarea" }).click();
  await expect(page.getByText("Elige a quién se la asignas").filter({ visible: true })).toBeVisible();
});

test("el jefe borra la tarea", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/tareas?hechas=1");
  await fila(page, `${titulo} (2 tubos)`).getByRole("link").click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Borrar tarea" }).click();
  await expect(page).toHaveURL(/\/tareas$/);
  await page.goto("/tareas?hechas=1");
  await expect(fila(page, `${titulo} (2 tubos)`)).toHaveCount(0);
});
