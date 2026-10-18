import { test, expect, type Page } from "@playwright/test";
import ExcelJS from "exceljs";
import { entrar, USUARIOS } from "./helpers";

test.describe.configure({ mode: "serial" });
const sufijo = Date.now().toString().slice(-6);
const factura = `F-TEST-${sufijo}`;

// "1.234,50 €" → 1234.5
const euros = (t: string) => Number(t.replace(/[^\d,-]/g, "").replace(",", "."));
const tarjeta = async (page: Page, id: string) => euros((await page.getByTestId(id).filter({ visible: true }).textContent())!);
const totales = async (page: Page) => ({
  ingresos: await tarjeta(page, "total-ingresos"),
  gastos: await tarjeta(page, "total-gastos"),
  balance: await tarjeta(page, "total-balance"),
  pendiente: await tarjeta(page, "total-pendiente"),
});
const cerca = (a: number, b: number) => expect(Math.round(a * 100)).toBe(Math.round(b * 100));

test.afterAll(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  await db.from("movimientos").delete().like("concepto", `%${sufijo}%`);
  await db.from("facturas").delete().eq("numero", factura);
});

test("el jefe apunta un gasto y un ingreso y el resumen cuadra", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Más" }).click();
  await page.getByRole("link", { name: /Finanzas/ }).click();
  await expect(page.getByRole("heading", { name: "Finanzas" })).toBeVisible();
  const antes = await totales(page);

  await page.getByRole("link", { name: "Nuevo gasto" }).click();
  await page.getByLabel("Concepto").filter({ visible: true }).fill(`Silicona ${sufijo}`);
  await page.getByLabel("Importe (€)").filter({ visible: true }).fill("45,90");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("heading", { name: "Finanzas" })).toBeVisible();

  await page.getByRole("link", { name: "Nuevo ingreso" }).click();
  await page.getByLabel("Concepto").filter({ visible: true }).fill(`Pago en mano ${sufijo}`);
  await page.getByLabel("Importe (€)").filter({ visible: true }).fill("200");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("heading", { name: "Finanzas" })).toBeVisible();

  const despues = await totales(page);
  cerca(despues.gastos, antes.gastos + 45.9);
  cerca(despues.ingresos, antes.ingresos + 200);
  cerca(despues.balance, antes.balance + 154.1);
  await expect(page.getByRole("listitem").filter({ hasText: `Silicona ${sufijo}` }).filter({ visible: true })).toContainText("45,90");
});

test("una factura cobrada pasa a ingreso y al desmarcarla vuelve a pendiente", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/finanzas");
  const antes = await totales(page);

  await page.getByRole("link", { name: "Nueva factura" }).click();
  await page.getByLabel("Número").filter({ visible: true }).fill(factura);
  await page.getByLabel("Cliente").filter({ visible: true }).selectOption({ label: "Lucía Pérez" });
  await page.getByLabel("Concepto").filter({ visible: true }).fill(`Tejado ${sufijo}`);
  await page.getByLabel("Importe (€)").filter({ visible: true }).fill("1.210,00");
  await page.getByRole("button", { name: "Guardar factura" }).click();
  await expect(page.getByRole("heading", { name: "Finanzas" })).toBeVisible();
  cerca((await totales(page)).pendiente, antes.pendiente + 1210);

  const fila = page
    .getByRole("listitem")
    .filter({ hasText: factura, has: page.getByRole("button", { name: "Cobrada" }) })
    .filter({ visible: true });
  await fila.getByRole("button", { name: "Cobrada" }).click();
  await expect(fila).toHaveCount(0);
  const c = (n: number) => Math.round(n * 100);
  await expect.poll(async () => c((await totales(page)).pendiente)).toBe(c(antes.pendiente));
  await expect.poll(async () => c((await totales(page)).ingresos)).toBe(c(antes.ingresos + 1210));
  await expect(page.getByRole("listitem").filter({ hasText: `Factura ${factura}` }).filter({ visible: true })).toBeVisible();

  await page.getByRole("link", { name: new RegExp(`Factura ${factura}`) }).click();
  await page.getByRole("link", { name: "Ver la factura" }).click();
  await page.getByRole("button", { name: "Marcar como no pagada" }).click();
  await expect(page.getByText("Pendiente de cobro").filter({ visible: true }).first()).toBeVisible();
  await page.goto("/finanzas");
  await expect.poll(async () => c((await totales(page)).ingresos)).toBe(c(antes.ingresos));
  await expect.poll(async () => c((await totales(page)).pendiente)).toBe(c(antes.pendiente + 1210));
});

test("una factura que vence antes de emitirse da error", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/finanzas/facturas/nueva");
  await page.getByLabel("Número").filter({ visible: true }).fill(`MAL-${sufijo}`);
  await page.getByLabel("Cliente").filter({ visible: true }).selectOption({ label: "Lucía Pérez" });
  await page.getByLabel("Concepto").filter({ visible: true }).fill("x");
  await page.getByLabel("Importe (€)").filter({ visible: true }).fill("10");
  await page.getByLabel("Emitida el").filter({ visible: true }).fill("2026-10-10");
  await page.getByLabel("Vence el").filter({ visible: true }).fill("2026-10-01");
  await page.getByRole("button", { name: "Guardar factura" }).click();
  await expect(page.getByText("No puede vencer antes de emitirse").filter({ visible: true })).toBeVisible();
});

test("el Excel del mes trae hojas, fechas e importes que cuadran con la pantalla", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/finanzas");
  const { balance } = await totales(page);
  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Exportar mes a Excel" }).click();
  const archivo = await (await descarga).path();
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(archivo);
  expect(libro.worksheets.map((h) => h.name)).toEqual(["Resumen", "Movimientos", "Facturas"]);

  const movs = libro.getWorksheet("Movimientos")!;
  expect(movs.getRow(1).values).toEqual([undefined, "Fecha", "Tipo", "Concepto", "Obra", "Importe (€)"]);
  let suma = 0;
  movs.eachRow((fila, n) => {
    const importe = fila.getCell(5).value;
    if (n > 1 && typeof importe === "number") {
      expect(fila.getCell(1).value).toBeInstanceOf(Date);
      suma += Math.round(importe * 100);
    }
  });
  expect(suma).toBe(Math.round(balance * 100));
  expect(libro.getWorksheet("Facturas")!.getRow(1).getCell(1).value).toBe("Número");
});

test("un trabajador no entra en finanzas ni descarga el Excel", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Más" })).toHaveCount(0);
  await page.goto("/finanzas");
  await expect(page).toHaveURL(/\/$/);
  const r = await page.request.get("/finanzas/exportar", { maxRedirects: 0 });
  expect(r.status()).not.toBe(200);
});

test("el Excel de un mes sin movimientos no tiene fórmulas circulares y el pendiente cuadra con la pantalla", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  await page.goto("/finanzas");
  const { pendiente } = await totales(page);
  const r = await page.request.get("/finanzas/exportar?mes=2020-01");
  expect(r.status()).toBe(200);
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load((await r.body()) as unknown as ArrayBuffer);
  const movs = libro.getWorksheet("Movimientos")!;
  const total = movs.getRow(movs.rowCount).getCell(5).value;
  const formula = typeof total === "object" && total && "formula" in total ? String(total.formula) : "";
  const ultimaReferida = Number(formula.match(/E(\d+)\)?$/)?.[1] ?? 0);
  expect(ultimaReferida).toBeLessThan(movs.rowCount); // nunca se suma a sí misma
  const resumenPendiente = libro.getWorksheet("Resumen")!.getCell("B5").value;
  expect(Math.round(Number(resumenPendiente) * 100)).toBe(Math.round(pendiente * 100));
});
