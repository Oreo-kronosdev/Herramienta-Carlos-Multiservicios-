import { expect, type Page } from "@playwright/test";

export const USUARIOS = {
  carlos: "carlos1234",
  pepe: "pepe12345",
  ana: "ana123456",
} as const;

export async function entrar(page: Page, usuario: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Usuario").filter({ visible: true }).fill(usuario);
  await page.getByLabel("Contraseña").filter({ visible: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function salir(page: Page) {
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login/);
}

// Crea un trabajador directamente con la clave secreta (solo para preparar pruebas locales).
export async function crearTrabajador(prefijo: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const username = `${prefijo}${Date.now().toString().slice(-7)}`;
  const password = "clave1234";
  const { data, error } = await admin.auth.admin.createUser({
    email: `${username}@usuarios.local`,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const nombre = `Prueba ${username}`;
  const { error: e2 } = await admin.from("profiles").insert({ id: data.user.id, username, nombre, rol: "trabajador" });
  if (e2) throw e2;
  return { id: data.user.id, username, password, nombre };
}
