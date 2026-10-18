import { test, expect } from "@playwright/test";
import { entrar, USUARIOS } from "./helpers";

test.describe.configure({ mode: "serial" });
const titulo = `Canalones prueba ${Date.now().toString().slice(-6)}`;
const OBRA_DE_ANA = "/obras/c0000000-0000-0000-0000-000000000003";

test("el jefe crea una obra con presupuesto y la asigna", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/obras");
  await page.getByRole("link", { name: "Nueva obra" }).click();
  await page.getByLabel("Cliente").filter({ visible: true }).selectOption({ label: "Lucía Pérez" });
  await expect(page.getByLabel("Dirección").filter({ visible: true })).toHaveValue("Av. de la Paz 12, Madrid");
  await page.getByLabel("Título").filter({ visible: true }).fill(titulo);
  await page.getByLabel("Tipo de trabajo").filter({ visible: true }).selectOption({ label: "Canalones" });
  await page.getByLabel("Presupuesto (€)").filter({ visible: true }).fill("1.250,50");
  await page.getByRole("checkbox", { name: "Pepe" }).check();
  await page.getByRole("button", { name: "Guardar obra" }).click();

  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
  await expect(page.getByText("1250,50 €").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Pepe").filter({ visible: true })).toBeVisible();

  await page.getByRole("button", { name: "En curso" }).click();
  await expect(page.getByRole("button", { name: "En curso" })).toHaveAttribute("aria-pressed", "true");
});

test("presupuesto mal escrito da error", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/obras/nuevo");
  await page.getByLabel("Cliente").filter({ visible: true }).selectOption({ label: "Lucía Pérez" });
  await page.getByLabel("Título").filter({ visible: true }).fill("Obra con error");
  await page.getByLabel("Tipo de trabajo").filter({ visible: true }).selectOption({ label: "Pintura" });
  await page.getByLabel("Presupuesto (€)").filter({ visible: true }).fill("mil euros");
  await page.getByRole("button", { name: "Guardar obra" }).click();
  await expect(page.getByText("Importe no válido").filter({ visible: true })).toBeVisible();
});

test("el inicio del jefe muestra las obras por estado", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await expect(page.getByRole("link", { name: /En curso\s*\d+/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Pendiente\s*\d+/ })).toBeVisible();
});

test("el trabajador ve sus obras, el presupuesto y cambia el estado, pero no edita", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await expect(page.getByRole("link", { name: new RegExp(titulo) })).toBeVisible();
  await expect(page.getByRole("link", { name: /Pintura de fachada/ })).toHaveCount(0);

  await page.getByRole("link", { name: new RegExp(titulo) }).click();
  await expect(page.getByText("1250,50 €").filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);

  await page.getByRole("button", { name: "Terminada" }).click();
  await expect(page.getByRole("button", { name: "Terminada" })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "Terminada" })).toHaveAttribute("aria-pressed", "true");
});

test("el trabajador no puede abrir una obra ajena ni crear obras", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await page.goto(OBRA_DE_ANA);
  await expect(page.getByRole("heading", { name: "No encontrado" })).toBeVisible();
  await expect(page.getByText("Pintura de fachada").filter({ visible: true })).toHaveCount(0);
  await page.goto("/obras/nuevo");
  await expect(page).toHaveURL(/\/$/);
});

test("el jefe borra la obra de prueba", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/obras");
  await page.getByRole("link", { name: new RegExp(titulo) }).click();
  await page.getByRole("link", { name: "Editar" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Borrar obra" }).click();
  await expect(page).toHaveURL(/\/obras$/);
  await expect(page.getByRole("link", { name: new RegExp(titulo) })).toHaveCount(0);
});
