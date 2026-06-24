import { describe, it, expect } from "vitest";

// Stub env vars before module imports
import { vi } from "vitest";
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-key");

vi.mock("../supabase", () => ({
  supabase: { storage: { from: () => ({ upload: vi.fn(), getPublicUrl: vi.fn() }) } },
}));

const {
  formatPoints,
  formatCurrency,
  createPageUrl,
  getLevel,
  getNextLevelStars,
  getBonus,
} = await import("../utils.jsx");

describe("formatPoints", () => {
  it("formatea miles con separador", () => {
    expect(formatPoints(1500)).toBe("1,500");
  });
  it("formatea cero", () => {
    expect(formatPoints(0)).toBe("0");
  });
  it("formatea millones", () => {
    expect(formatPoints(1000000)).toBe("1,000,000");
  });
});

describe("formatCurrency", () => {
  it("formatea USD con símbolo", () => {
    expect(formatCurrency(10)).toMatch(/\$10\.00/);
  });
  it("formatea cero", () => {
    expect(formatCurrency(0)).toMatch(/\$0\.00/);
  });
});

describe("createPageUrl", () => {
  it("devuelve ruta correcta para WorkerDashboard", () => {
    expect(createPageUrl("WorkerDashboard")).toBe("/worker-dashboard");
  });
  it("devuelve / para páginas desconocidas", () => {
    expect(createPageUrl("PaginaInexistente")).toBe("/");
  });
  it("maneja null/undefined sin explotar", () => {
    expect(createPageUrl(null)).toBe("/");
    expect(createPageUrl(undefined)).toBe("/");
  });
  it("construye ruta TaskDetail con id", () => {
    expect(createPageUrl("TaskDetail?id=abc-123")).toBe("/tasks/abc-123");
  });
  it("construye ruta TaskDetail con campaignId", () => {
    expect(createPageUrl("TaskDetail?campaignId=camp-1")).toBe("/tasks/campaign/camp-1");
  });
});

describe("getLevel", () => {
  it("nivel 1 con 0 estrellas", () => expect(getLevel(0)).toBe(1));
  it("nivel 2 con 50 estrellas", () => expect(getLevel(50)).toBe(2));
  it("nivel 3 con 150 estrellas", () => expect(getLevel(150)).toBe(3));
  it("nivel 4 con 300 estrellas", () => expect(getLevel(300)).toBe(4));
  it("nivel 5 con 600+ estrellas", () => expect(getLevel(600)).toBe(5));
  it("nivel 5 con muchas estrellas", () => expect(getLevel(9999)).toBe(5));
});

describe("getBonus", () => {
  it("nivel 1 no tiene bonus", () => expect(getBonus(1)).toBe(0));
  it("nivel 2 tiene 5% bonus", () => expect(getBonus(2)).toBeCloseTo(0.05));
  it("nivel 5 tiene 20% bonus", () => expect(getBonus(5)).toBeCloseTo(0.20));
});
