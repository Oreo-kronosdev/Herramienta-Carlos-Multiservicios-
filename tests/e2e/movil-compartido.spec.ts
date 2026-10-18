import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { entrar, salir, USUARIOS } from "./helpers";

const ENDPOINT = `https://push.example/movil-compartido-${Date.now()}`;

// El navegador de pruebas no tiene servicio push: se simula que este móvil ya tiene una suscripción.
test.beforeEach(async ({ page }) => {
  await page.addInitScript((endpoint) => {
    const sub = { endpoint, toJSON: () => ({ endpoint, keys: { p256dh: "clave", auth: "auth" } }), unsubscribe: async () => true };
    const reg = { pushManager: { getSubscription: async () => sub, subscribe: async () => sub } };
    Object.defineProperty(window, "Notification", { value: { permission: "granted", requestPermission: async () => "granted" } });
    Object.defineProperty(window, "PushManager", { value: function PushManager() {} });
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: async () => reg, getRegistration: async () => reg, ready: Promise.resolve(reg) },
    });
  }, ENDPOINT);
});

test("al entrar otra persona en el mismo móvil, los avisos pasan a ser suyos; al salir, se quitan", async ({ page }) => {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const CARLOS = "a0000000-0000-0000-0000-000000000001";
  const PEPE = "a0000000-0000-0000-0000-000000000002";
  const dueno = async () =>
    (await db.from("push_suscripciones").select("user_id").eq("endpoint", ENDPOINT).maybeSingle()).data?.user_id ?? null;

  await entrar(page, "carlos", USUARIOS.carlos);
  await expect.poll(dueno).toBe(CARLOS);

  await salir(page);
  await expect.poll(dueno).toBeNull(); // al salir, este móvil deja de recibir los avisos de Carlos

  await entrar(page, "pepe", USUARIOS.pepe);
  await expect.poll(dueno).toBe(PEPE);
  await page.goto("/agenda");
  await expect(page.getByText("Avisos activados en este móvil").filter({ visible: true })).toBeVisible();
});
