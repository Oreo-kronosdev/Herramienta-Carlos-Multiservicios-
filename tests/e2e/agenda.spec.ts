import { test, expect } from "@playwright/test";
import { entrar, USUARIOS } from "./helpers";
import { formatFecha, hoyMadrid, sumarDias } from "../../lib/fechas";

test.describe.configure({ mode: "serial" });
const titulo = `Visita prueba ${Date.now().toString().slice(-6)}`;
const manana = sumarDias(hoyMadrid(), 1);
const CITA_DE_ANA = "/agenda/d0000000-0000-0000-0000-000000000002";
const OBRA_PEPE = "/obras/c0000000-0000-0000-0000-000000000001";

test("el jefe crea una cita en una obra para Pepe", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Agenda" }).click();
  await page.getByRole("link", { name: "Nueva cita" }).click();
  await page.getByLabel("Título").filter({ visible: true }).fill(titulo);
  await page.getByLabel("Fecha", { exact: true }).filter({ visible: true }).fill(manana);
  await page.getByLabel("Hora").filter({ visible: true }).fill("09:30");
  await page.getByLabel("Obra").filter({ visible: true }).selectOption({ label: "Limpieza de canalones" });
  await expect(page.getByRole("checkbox", { name: "Pepe" })).toBeChecked(); // se marca solo al elegir la obra
  await page.getByLabel("Avisar").filter({ visible: true }).selectOption({ label: "2 días antes" });
  await page.getByRole("button", { name: "Guardar cita" }).click();

  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
  await expect(page.getByText(formatFecha(manana)).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("09:30").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Limpieza de canalones" })).toBeVisible();
  await expect(page.getByText("Pepe").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("2 días antes").filter({ visible: true })).toBeVisible();
});

test("la cita aparece en la agenda, en el inicio y en la obra", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await expect(page.getByRole("link", { name: new RegExp(titulo) })).toBeVisible(); // Próximos 7 días
  await page.goto("/agenda");
  await expect(page.getByRole("link", { name: new RegExp(titulo) })).toBeVisible();
  await page.goto(OBRA_PEPE);
  await expect(page.getByRole("link", { name: new RegExp(titulo) })).toBeVisible();
});

test("Pepe ve su cita pero no puede crear ni editar ni ver las de Ana", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await page.goto("/agenda");
  await expect(page.getByRole("link", { name: new RegExp(titulo) })).toBeVisible();
  await expect(page.getByRole("link", { name: /Entregar presupuesto de fachada/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Nueva cita" })).toHaveCount(0);
  await page.getByRole("link", { name: new RegExp(titulo) }).click();
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
  await page.goto(CITA_DE_ANA);
  await expect(page.getByRole("heading", { name: "No encontrado" })).toBeVisible();
  await page.goto("/agenda/nuevo");
  await expect(page).toHaveURL(/\/$/);
});

test("Ana no ve la cita de Pepe", async ({ page }) => {
  await entrar(page, "ana", USUARIOS.ana);
  await page.goto("/agenda");
  await expect(page.getByRole("link", { name: /Entregar presupuesto de fachada/ })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(titulo) })).toHaveCount(0);
});

test("una cita sin personas da error", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/agenda/nuevo");
  await page.getByLabel("Título").filter({ visible: true }).fill("Sin nadie");
  await page.getByLabel("Fecha", { exact: true }).filter({ visible: true }).fill(manana);
  await page.getByRole("button", { name: "Guardar cita" }).click();
  await expect(page.getByText("Asigna al menos una persona").filter({ visible: true })).toBeVisible();
});

test("el jefe borra la cita", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/agenda");
  await page.getByRole("link", { name: new RegExp(titulo) }).click();
  await page.getByRole("link", { name: "Editar" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Borrar cita" }).click();
  await expect(page).toHaveURL(/\/agenda$/);
  await expect(page.getByRole("link", { name: new RegExp(titulo) })).toHaveCount(0);
});
