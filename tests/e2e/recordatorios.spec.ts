import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { crearTrabajador, entrar, USUARIOS } from "./helpers";
import { hoyMadrid } from "../../lib/fechas";

const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
const llamar = (request: import("@playwright/test").APIRequestContext, secreto?: string) =>
  request.get("/api/recordatorios", secreto ? { headers: { authorization: `Bearer ${secreto}` } } : {});

test("sin el secreto del cron responde 401", async ({ request }) => {
  expect((await llamar(request)).status()).toBe(401);
  expect((await llamar(request, "otro")).status()).toBe(401);
});

test("marca como avisado, no repite y reintenta solo los que fallaron", async ({ request }) => {
  const db = admin();
  const sinMovil = await crearTrabajador("sinmovil");
  const conFallo = await crearTrabajador("fallo");
  // Suscripción que no se puede entregar (clave inválida): error reintentable
  await db.from("push_suscripciones").insert({
    user_id: conFallo.id,
    endpoint: `https://push.invalid/${conFallo.username}`,
    p256dh: "no-es-una-clave",
    auth: "x",
  });
  const { data: ev } = await db
    .from("eventos")
    .insert({ titulo: "Aviso de prueba", fecha: hoyMadrid(), avisar_dias: 0 })
    .select("id")
    .single();
  await db.from("evento_personas").insert([
    { evento_id: ev!.id, user_id: sinMovil.id },
    { evento_id: ev!.id, user_id: conFallo.id },
  ]);
  const avisadoAt = async (user: string) =>
    (await db.from("evento_personas").select("avisado_at").eq("evento_id", ev!.id).eq("user_id", user).single()).data!
      .avisado_at;

  const r1 = await llamar(request, process.env.CRON_SECRET);
  expect(r1.status()).toBe(200);
  expect((await r1.json()).fallos).toBeGreaterThanOrEqual(1);
  expect(await avisadoAt(sinMovil.id)).not.toBeNull();
  expect(await avisadoAt(conFallo.id)).toBeNull(); // se reintentará mañana

  const marcado = await avisadoAt(sinMovil.id);
  await llamar(request, process.env.CRON_SECRET);
  expect(await avisadoAt(sinMovil.id)).toBe(marcado); // no se repite

  await db.from("eventos").delete().eq("id", ev!.id);
});

test("si el navegador bloquea las notificaciones, se explica cómo activarlas", async ({ page }) => {
  await entrar(page, "pepe", USUARIOS.pepe);
  await page.goto("/agenda");
  await expect(page.getByText("Los avisos están bloqueados").filter({ visible: true })).toBeVisible();
});
