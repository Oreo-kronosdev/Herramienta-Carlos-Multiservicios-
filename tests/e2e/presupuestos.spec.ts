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

test.describe("limpieza de fotos", () => {
  const jpeg = () => sharp({ create: { width: 400, height: 300, channels: 3, background: "#888" } }).jpeg().toBuffer();

  async function obraConPresupuesto() {
    const db = await admin();
    const { data: obra } = await db
      .from("obras")
      .insert({ cliente_id: "b0000000-0000-0000-0000-000000000002", titulo: `Obra para borrar ${Date.now()}`, direccion: "C/ X", tipo_trabajo: "otro" })
      .select("id")
      .single();
    const { data: p } = await db.from("presupuestos").insert({ obra_id: obra!.id }).select("id").single();
    const conFila = `${p!.id}/con-fila.jpg`;
    const suelta = `${p!.id}/suelta.jpg`; // subida sin llegar a registrarse
    for (const path of [conFila, suelta]) {
      const { error } = await db.storage.from("presupuestos").upload(path, await jpeg(), { contentType: "image/jpeg" });
      expect(error).toBeNull();
    }
    await db.from("presupuesto_fotos").insert({ presupuesto_id: p!.id, path: conFila });
    return { db, obraId: obra!.id, presupuestoId: p!.id };
  }

  test("borrar una toma de datos borra también fotos que no llegaron a registrarse", async ({ page }) => {
    const { db, obraId, presupuestoId } = await obraConPresupuesto();
    await entrar(page, "carlos", USUARIOS.carlos);
    await page.goto(`/presupuestos/${presupuestoId}`);
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Borrar toma de datos" }).click();
    await expect(page).toHaveURL(new RegExp(`/obras/${obraId}$`));
    expect((await db.storage.from("presupuestos").list(presupuestoId)).data).toEqual([]);
    await db.from("obras").delete().eq("id", obraId);
  });

  test("borrar una obra borra las fotos de sus tomas de datos", async ({ page }) => {
    const { db, obraId, presupuestoId } = await obraConPresupuesto();
    await entrar(page, "carlos", USUARIOS.carlos);
    await page.goto(`/obras/${obraId}/editar`);
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Borrar obra" }).click();
    await expect(page).toHaveURL(/\/obras$/);
    expect((await db.storage.from("presupuestos").list(presupuestoId)).data).toEqual([]);
  });

  test("«Quitar» una foto borra su archivo", async ({ page }) => {
    const { db, obraId, presupuestoId } = await obraConPresupuesto();
    await entrar(page, "carlos", USUARIOS.carlos);
    await page.goto(`/presupuestos/${presupuestoId}`);
    page.once("dialog", (d) => d.accept());
    await seccion(page, "Fotos").getByRole("button", { name: "Quitar" }).click();
    await expect(seccion(page, "Fotos").getByLabel("Pie de foto")).toHaveCount(0);
    const nombres = ((await db.storage.from("presupuestos").list(presupuestoId)).data ?? []).map((o) => o.name);
    expect(nombres).not.toContain("con-fila.jpg");
    await db.storage.from("presupuestos").remove(nombres.map((n) => `${presupuestoId}/${n}`));
    await db.from("obras").delete().eq("id", obraId);
  });

  test("el almacén rechaza archivos que no son imágenes", async () => {
    const db = await admin();
    const { error } = await db.storage
      .from("presupuestos")
      .upload("a1000000-0000-0000-0000-000000000001/nota.txt", Buffer.from("hola"), { contentType: "text/plain" });
    expect(error).not.toBeNull();
  });
});

test("Ana no puede borrar por la API las fotos de una obra que no es suya", async () => {
  const db = await admin();
  const path = `a1000000-0000-0000-0000-000000000001/no-tocar-${Date.now()}.jpg`;
  const jpg = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } }).jpeg().toBuffer();
  await db.storage.from("presupuestos").upload(path, jpg, { contentType: "image/jpeg" });
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const ana = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    });
    await ana.auth.signInWithPassword({ email: "ana@usuarios.local", password: USUARIOS.ana });
    await ana.storage.from("presupuestos").remove([path]);
    const { data } = await db.storage.from("presupuestos").list("a1000000-0000-0000-0000-000000000001");
    expect((data ?? []).map((o) => o.name)).toContain(path.split("/")[1]);
  } finally {
    await db.storage.from("presupuestos").remove([path]);
  }
});
