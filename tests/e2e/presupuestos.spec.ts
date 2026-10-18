import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";
import { entrar, USUARIOS } from "./helpers";

test.describe.configure({ mode: "serial" });
const OBRA = "/obras/c0000000-0000-0000-0000-000000000001";
let url = "";
const seccion = (page: Page, nombre: string) => page.getByRole("region", { name: nombre }).filter({ visible: true });
const admin = async () => {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
};

test("Pepe rellena una toma de datos con medidas, materiales y una foto", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await page.goto(OBRA);
  await page.getByRole("button", { name: "Nueva toma de datos" }).click();
  await expect(page).toHaveURL(/\/presupuestos\/[0-9a-f-]{36}$/);
  url = new URL(page.url()).pathname;

  const medidas = seccion(page, "Medidas");
  await medidas.getByLabel("Qué se mide").fill("Canalón fachada");
  await medidas.getByLabel("Cantidad").fill("12,5");
  await medidas.getByLabel("Unidad").selectOption("ml");
  await medidas.getByRole("button", { name: "Añadir medida" }).click();
  await expect(medidas.getByRole("listitem").filter({ hasText: "Canalón fachada" })).toContainText("12,5 ml");

  const materiales = seccion(page, "Materiales");
  await materiales.getByLabel("Material").fill("Abrazaderas");
  await materiales.getByLabel("Cantidad").fill("20");
  await materiales.getByLabel("Unidad").selectOption("ud");
  await materiales.getByRole("button", { name: "Añadir material" }).click();
  await expect(materiales.getByRole("listitem").filter({ hasText: "Abrazaderas" })).toContainText("20 ud");

  const png = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: { r: 200, g: 90, b: 30 } } }).png().toBuffer();
  const fotos = seccion(page, "Fotos");
  await fotos.getByLabel("Añadir fotos").setInputFiles({ name: "bajante.png", mimeType: "image/png", buffer: png });
  await expect(fotos.getByRole("img")).toHaveCount(1, { timeout: 15_000 });
  await fotos.getByLabel("Pie de foto").fill("Bajante roto");
  await fotos.getByRole("button", { name: "Guardar pie" }).click();
  await expect(fotos.getByText("Guardado")).toBeVisible();

  await page.reload();
  await expect(seccion(page, "Medidas")).toContainText("Canalón fachada");
  await expect(seccion(page, "Materiales")).toContainText("Abrazaderas");
  await expect(seccion(page, "Fotos").getByLabel("Pie de foto")).toHaveValue("Bajante roto");

  // Se subió comprimida (JPEG, lado mayor 1600 px)
  const db = await admin();
  const { data: foto } = await db.from("presupuesto_fotos").select("path").eq("presupuesto_id", url.split("/").pop()!).single();
  const { data: archivo } = await db.storage.from("presupuestos").download(foto!.path);
  const meta = await sharp(Buffer.from(await archivo!.arrayBuffer())).metadata();
  expect([meta.format, meta.width, meta.height]).toEqual(["jpeg", 1600, 1200]);
});

test("un archivo que no es foto se rechaza", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await page.goto(url);
  await seccion(page, "Fotos").getByLabel("Añadir fotos").setInputFiles({ name: "notas.txt", mimeType: "text/plain", buffer: Buffer.from("hola") });
  await expect(seccion(page, "Fotos").getByText("Solo se pueden subir fotos")).toBeVisible();
});

test("la vista para imprimir muestra todo y oculta la app", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await page.goto(url);
  await page.getByRole("link", { name: "Ver para imprimir" }).click();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Principal" })).toBeHidden();
  await expect(page.getByRole("button", { name: /Imprimir/ })).toBeHidden();
  const doc = page.getByRole("article");
  await expect(doc).toContainText("Carlos Multiservicios");
  await expect(doc).toContainText("Limpieza de canalones");
  await expect(doc).toContainText("12,5");
  await expect(doc).toContainText("Abrazaderas");
  await expect(doc).toContainText("Bajante roto");
  const ancho = await doc.getByRole("img").first().evaluate((i: HTMLImageElement) => i.naturalWidth);
  expect(ancho).toBeGreaterThan(0);
});

test("Ana, que no trabaja en esa obra, no puede abrirlo", async ({ page }) => {
  await entrar(page, "ana", USUARIOS.ana);
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "No encontrado" })).toBeVisible();
});

test("Carlos lo ve en la obra y lo borra con sus fotos", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto(OBRA);
  await seccion(page, "Presupuestos (toma de datos)").getByRole("link", { name: /Toma de datos/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`${url}$`));
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Borrar toma de datos" }).click();
  await expect(page).toHaveURL(new RegExp(`${OBRA}$`));
  const { data } = await (await admin()).storage.from("presupuestos").list(url.split("/").pop()!);
  expect(data).toEqual([]);
});
