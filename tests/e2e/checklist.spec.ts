import { test, expect, type Page } from "@playwright/test";
import { entrar, USUARIOS } from "./helpers";

test.describe.configure({ mode: "serial" });
const OBRA = "/obras/c0000000-0000-0000-0000-000000000001";
const sufijo = Date.now().toString().slice(-5);
const brocha = `Brocha 50 mm ${sufijo}`;
const andamio = `Andamio ${sufijo}`;
const lista = (page: Page) => page.getByRole("region", { name: "Material y herramientas" }).filter({ visible: true });
const progreso = (page: Page) => lista(page).getByTestId("progreso");
const leer = async (page: Page) => {
  const m = (await progreso(page).textContent())!.match(/(\d+) de (\d+) preparados/)!;
  return { hechos: Number(m[1]), total: Number(m[2]) };
};
let total = 0;

// Cada ejecución empieza con la lista de la obra sin marcar (por si una ejecución anterior se cortó).
test.beforeAll(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  await db.from("checklist_items").update({ preparado: false }).eq("obra_id", OBRA.split("/").pop()!);
});

test("el jefe añade material y herramientas", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto(OBRA);
  await lista(page).getByLabel("Qué hace falta").fill(brocha);
  await lista(page).getByRole("radio", { name: "Material" }).check();
  await lista(page).getByRole("button", { name: "Añadir" }).click();
  await expect(lista(page).getByRole("group", { name: "Material" })).toContainText(brocha);
  await expect(lista(page).getByLabel("Qué hace falta")).toHaveValue("");

  await lista(page).getByLabel("Qué hace falta").fill(andamio);
  await lista(page).getByRole("radio", { name: "Herramientas" }).check();
  await lista(page).getByRole("button", { name: "Añadir" }).click();
  await expect(lista(page).getByRole("group", { name: "Herramientas" })).toContainText(andamio);
});

test("Pepe marca lo que lleva y lo desmarca todo para la próxima salida", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await page.goto(OBRA);
  await expect(progreso(page)).toHaveText(/^0 de \d+ preparados$/);
  total = (await leer(page)).total;
  await expect(lista(page).getByRole("button", { name: "Añadir" })).toHaveCount(0);
  await expect(lista(page).getByRole("button", { name: /^Quitar/ })).toHaveCount(0);

  await lista(page).getByRole("checkbox", { name: "Silicona" }).check();
  await lista(page).getByRole("checkbox", { name: brocha }).check();
  await expect(progreso(page)).toHaveText(`2 de ${total} preparados`);
  await page.reload();
  await expect(progreso(page)).toHaveText(`2 de ${total} preparados`);

  page.once("dialog", (d) => d.accept());
  await lista(page).getByRole("button", { name: "Desmarcar todo" }).click();
  await expect(progreso(page)).toHaveText(`0 de ${total} preparados`);
});

test("el jefe quita elementos", async ({ page }) => {
  page.on("dialog", (d) => d.accept()); // «¿Quitar … de la lista?»
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto(OBRA);
  await lista(page).getByRole("button", { name: `Quitar ${andamio}` }).click();
  await lista(page).getByRole("button", { name: `Quitar ${brocha}` }).click();
  await expect(lista(page)).not.toContainText(andamio);
  await expect(progreso(page)).toHaveText(`0 de ${total - 2} preparados`);
});

test("un texto vacío da error", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto(OBRA);
  await lista(page).getByRole("button", { name: "Añadir" }).click();
  await expect(lista(page).getByText("Escribe qué hace falta")).toBeVisible();
});

test("sin conexión, «Desmarcar todo» avisa y la página sigue funcionando", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await page.goto(OBRA);
  await lista(page).getByRole("checkbox", { name: "Guantes" }).check();
  await expect(progreso(page)).toHaveText(/^1 de/);
  await page.route(OBRA, (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));
  page.once("dialog", (d) => d.accept());
  await lista(page).getByRole("button", { name: "Desmarcar todo" }).click();
  await expect(lista(page).getByRole("alert")).toContainText("No se pudo");
  await expect(page.getByRole("heading", { name: "Limpieza de canalones" })).toBeVisible();
  await page.unroute(OBRA);
  await lista(page).getByRole("checkbox", { name: "Guantes" }).uncheck();
  await expect(progreso(page)).toHaveText(/^0 de/);
});

test("sin conexión, «Quitar» avisa y no borra", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto(OBRA);
  await page.route(OBRA, (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));
  page.once("dialog", (d) => d.accept());
  await lista(page).getByRole("button", { name: "Quitar Arnés" }).click();
  await expect(lista(page).getByRole("alert")).toContainText("No se pudo");
  await expect(lista(page)).toContainText("Arnés");
});
