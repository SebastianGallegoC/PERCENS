import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

declare global {
  // Vitest / React: entorno de act() para pruebas.
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** jsdom no implementa ResizeObserver; lo usan los gráficos de Datos. */
class ResizeObserverStub {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe() {
    queueMicrotask(() => this.callback([], this));
  }

  unobserve() {}

  disconnect() {}
}

globalThis.ResizeObserver =
  ResizeObserverStub as unknown as typeof ResizeObserver;

const defaultDomRect: DOMRect = {
  width: 640,
  height: 320,
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 640,
  bottom: 320,
  toJSON: () => ({}),
};

Element.prototype.getBoundingClientRect = function () {
  return { ...defaultDomRect };
};

afterEach(() => {
  cleanup();
});
