export const MAX_FOTO = 10 * 1024 * 1024;

export function validarFoto(f: { type: string; size: number }): string | null {
  if (!f.type.startsWith("image/")) return "Solo se pueden subir fotos";
  if (f.size > MAX_FOTO) return "La foto es demasiado grande (máx. 10 MB)";
  return null;
}

export function medidasReducidas(ancho: number, alto: number, max = 1600) {
  const escala = Math.min(1, max / Math.max(ancho, alto));
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

// En el navegador: reduce la foto y la pasa a JPEG para gastar menos datos al subirla.
export async function comprimirFoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { ancho, alto } = medidasReducidas(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();
  return new Promise((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo procesar la foto"))), "image/jpeg", 0.8));
}
