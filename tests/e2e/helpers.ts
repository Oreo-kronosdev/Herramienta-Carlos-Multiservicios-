import { expect, type Page } from "@playwright/test";

export const USUARIOS = {
  carlos: "carlos1234",
  pepe: "pepe12345",
  ana: "ana123456",
} as const;

export async function entrar(page: Page, usuario: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(usuario);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function salir(page: Page) {
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login/);
}
