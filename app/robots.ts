import type { MetadataRoute } from "next";

// App interna: que ningún buscador la indexe.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
