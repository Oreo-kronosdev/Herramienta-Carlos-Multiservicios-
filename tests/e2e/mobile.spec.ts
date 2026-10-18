import { test, expect, type Page } from "@playwright/test";
import { entrar, USUARIOS } from "./helpers";

const RUTAS_JEFE = [
  "/",
  "/obras",
  "/obras/nuevo",
  "/obras/c0000000-0000-0000-0000-000000000001",
  "/agenda",
  "/agenda/nuevo",
  "/agenda/d0000000-0000-0000-0000-000000000001",
  "/tareas",
  "/tareas/nueva",
  "/clientes",
  "/clientes/nuevo",
  "/clientes/b0000000-0000-0000-0000-000000000001",
  "/equipo",
  "/equipo/nuevo",
];

async function revisarPantalla(page: Page, ruta: string) {
  await page.goto(ruta);
  await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
  const { scroll, ancho } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    ancho: document.documentElement.clientWidth,
  }));
  expect(scroll, `scroll horizontal en ${ruta}`).toBeLessThanOrEqual(ancho);
  const fuentes = await page
    .locator("input:visible, select:visible, textarea:visible")
    .evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
  for (const f of fuentes) expect(f, `input < 16px en ${ruta}`).toBeGreaterThanOrEqual(16);
}

test("jefe: navegación inferior con Equipo y pantallas sin desbordes", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  const nav = page.getByRole("navigation", { name: "Principal" });
  for (const n of ["Inicio", "Obras", "Agenda", "Tareas", "Clientes", "Equipo"]) await expect(nav.getByRole("link", { name: n })).toBeVisible();
  for (const ruta of RUTAS_JEFE) await revisarPantalla(page, ruta);

  await nav.getByRole("link", { name: "Clientes" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  await expect(nav.getByRole("link", { name: "Clientes" })).toHaveAttribute("aria-current", "page");
});

test("trabajador: navegación sin Equipo", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  const nav = page.getByRole("navigation", { name: "Principal" });
  await expect(nav.getByRole("link", { name: "Obras" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Agenda" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Equipo" })).toHaveCount(0);
  for (const ruta of ["/", "/obras", "/agenda", "/tareas", "/clientes", "/obras/c0000000-0000-0000-0000-000000000001"]) await revisarPantalla(page, ruta);
});

test("todos los estilos :hover están protegidos para pantallas táctiles", async ({ page }) => {
  await entrar(page, "carlos", USUARIOS.carlos);
  const sueltas = await page.evaluate(() => {
    const malas: string[] = [];
    const revisar = (reglas: CSSRuleList, dentroDeHover: boolean) => {
      for (const r of Array.from(reglas)) {
        if (r instanceof CSSMediaRule) revisar(r.cssRules, dentroDeHover || r.conditionText.includes("hover: hover"));
        else if (r instanceof CSSStyleRule) {
          if (r.selectorText.includes(":hover") && !dentroDeHover) malas.push(r.selectorText);
          if (r.cssRules?.length) revisar(r.cssRules, dentroDeHover);
        } else if ("cssRules" in r) revisar((r as CSSGroupingRule).cssRules, dentroDeHover);
      }
    };
    for (const s of Array.from(document.styleSheets)) {
      try { revisar(s.cssRules, false); } catch { /* hojas externas */ }
    }
    return malas;
  });
  expect(sueltas).toEqual([]);
});
