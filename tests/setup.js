import "@testing-library/jest-dom";
import { vi } from "vitest";

// Polyfill crypto.randomUUID for jsdom
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

// Suppress console.warn in tests unless explicitly needed
vi.spyOn(console, "warn").mockImplementation(() => {});
