import { test, expect } from "@playwright/test";

test("manifest PWA en español e instalable", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.lang).toBe("es");
  expect(json.display).toBe("standalone");
  const sizes = json.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
});

test("viewport cubre el notch y los inputs no hacen zoom", async ({ page }) => {
  await page.goto("/login");
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).toContain("viewport-fit=cover");
  const sizes = await page.locator("input").evaluateAll((els) =>
    els.map((el) => parseFloat(getComputedStyle(el).fontSize)),
  );
  expect(sizes.length).toBeGreaterThan(0);
  for (const s of sizes) expect(s).toBeGreaterThanOrEqual(16);
});

test("buscadores no indexan la app", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(await res.text()).toMatch(/Disallow: \/\s*$/m);
});

test("el service worker de avisos se sirve sin sesión", async ({ request }) => {
  const res = await request.get("/sw.js", { maxRedirects: 0 });
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("showNotification");
});
