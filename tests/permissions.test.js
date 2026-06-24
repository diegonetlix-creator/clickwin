import { describe, it, expect } from "vitest";
import { can } from "../core/can.js";
import { PERMISSIONS } from "../core/permissions.js";

describe("can() — sistema de permisos por rol", () => {
  it("worker puede ver tareas", () => {
    expect(can("worker", "VIEW_TASKS")).toBe(true);
  });

  it("worker NO puede crear campañas", () => {
    expect(can("worker", "CREATE_CAMPAIGN")).toBe(false);
  });

  it("worker NO puede gestionar usuarios", () => {
    expect(can("worker", "MANAGE_USERS")).toBe(false);
  });

  it("promoter puede crear campañas", () => {
    expect(can("promoter", "CREATE_CAMPAIGN")).toBe(true);
  });

  it("promoter NO puede gestionar usuarios (no es admin)", () => {
    expect(can("promoter", "MANAGE_USERS")).toBe(false);
  });

  it("admin tiene todos los permisos administrativos", () => {
    const adminPerms = [
      "MANAGE_USERS", "MANAGE_CAMPAIGNS", "MANAGE_FINANCES",
      "MANAGE_FRAUD", "MANAGE_PRIZES", "CREATE_CAMPAIGN",
      "REVIEW_TASKS", "MANAGE_MISSIONS", "VIEW_STATS",
      "VIEW_TASKS", "VIEW_FEED", "REDEEM_PRIZE",
    ];
    adminPerms.forEach((perm) => {
      expect(can("admin", perm)).toBe(true);
    });
  });

  it("admin NO puede enviar tareas como worker (diseño intencional)", () => {
    // Los admins gestionan el sistema, no participan como workers
    expect(can("admin", "SUBMIT_TASK")).toBe(false);
  });

  it("rol desconocido no tiene permisos", () => {
    expect(can("hacker", "VIEW_TASKS")).toBe(false);
    expect(can("hacker", "MANAGE_USERS")).toBe(false);
  });

  it("rol null/undefined devuelve false sin explotar", () => {
    expect(can(null, "VIEW_TASKS")).toBe(false);
    expect(can(undefined, "VIEW_TASKS")).toBe(false);
  });

  it("permiso desconocido devuelve false", () => {
    expect(can("admin", "PERMISO_INVENTADO")).toBe(false);
  });
});
