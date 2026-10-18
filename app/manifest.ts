import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Carlos Multiservicios",
    short_name: "Multiservicios",
    description: "Obras, clientes y equipo",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ec",
    theme_color: "#1c1a17",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
