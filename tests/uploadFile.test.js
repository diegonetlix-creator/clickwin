import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing uploadFile
vi.mock("../supabase", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.example.com/uploads/test.jpg" } }),
      }),
    },
  },
}));

// Mock env vars
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-key");

const { uploadFile } = await import("../utils.jsx");

const makeFile = (name, type, sizeBytes) => {
  const file = new File(["x".repeat(sizeBytes)], name, { type });
  return file;
};

describe("uploadFile", () => {
  it("acepta imágenes JPEG válidas", async () => {
    const file = makeFile("foto.jpg", "image/jpeg", 100);
    const result = await uploadFile(file);
    expect(result.url).toContain("https://");
  });

  it("acepta imágenes PNG válidas", async () => {
    const file = makeFile("foto.png", "image/png", 100);
    const result = await uploadFile(file);
    expect(result.url).toContain("https://");
  });

  it("rechaza archivos PDF", async () => {
    const file = makeFile("doc.pdf", "application/pdf", 100);
    await expect(uploadFile(file)).rejects.toThrow("Tipo de archivo no permitido");
  });

  it("rechaza ejecutables", async () => {
    const file = makeFile("virus.exe", "application/octet-stream", 100);
    await expect(uploadFile(file)).rejects.toThrow("Tipo de archivo no permitido");
  });

  it("rechaza archivos mayores a 5 MB", async () => {
    const file = makeFile("grande.jpg", "image/jpeg", 6 * 1024 * 1024);
    await expect(uploadFile(file)).rejects.toThrow("5 MB");
  });

  it("acepta archivos exactamente en el límite de 5 MB", async () => {
    const file = makeFile("justo.jpg", "image/jpeg", 5 * 1024 * 1024);
    const result = await uploadFile(file);
    expect(result.url).toContain("https://");
  });
});
