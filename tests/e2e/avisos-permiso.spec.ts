import { test, expect } from "@playwright/test";
import { entrar, USUARIOS } from "./helpers";

// El modo headless "ligero" no admite permisos de notificación; el Chromium completo sí.
test.use({ channel: "chromium", permissions: ["notifications"] });

test("con permiso, en la agenda se ofrece activar los avisos", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await page.goto("/agenda");
  await expect(page.getByRole("button", { name: "Activar avisos en este móvil" })).toBeVisible();
});
