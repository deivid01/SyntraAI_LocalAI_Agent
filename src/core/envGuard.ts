/**
 * Environment Guard Utility
 * Ensures safe execution between Node.js (Main) and Browser (Renderer) environments.
 */

export const isRenderer = (): boolean => {
  // @ts-ignore
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
};

export const isMainProcess = (): boolean => {
  return typeof process !== 'undefined' && !!process.versions && !!process.versions.electron && (process as any).type === 'browser';
};

export const isNode = (): boolean => {
  return typeof process !== 'undefined' && !!process.versions && !!process.versions.node;
};

/**
 * Polyfill for DOMMatrix in Node.js environment.
 * Required by some libraries (like pdf-parse/pdf.js) that assume a browser-like matrix utility.
 */
export const ensureDOMMatrix = () => {
  if (isNode() && typeof (global as any).DOMMatrix === 'undefined') {
    // Simple mock/polyfill for DOMMatrix if needed, 
    // but often libraries just need the constructor to exist or a basic implementation.
    // For pdf.js, it specifically uses it for coordinate transformations.
    
    try {
      // Trying to use a lightweight replacement or just a class shell
      (global as any).DOMMatrix = class DOMMatrix {
        a: number = 1; b: number = 0; c: number = 0; d: number = 1; e: number = 0; f: number = 0;
        constructor(init?: string | number[]) {
          if (Array.isArray(init) && init.length >= 6) {
            this.a = init[0]; this.b = init[1]; this.c = init[2]; this.d = init[3]; this.e = init[4]; this.f = init[5];
          }
        }
        // Basic methods required by most matrix implementations
        multiply() { return this; }
        translate() { return this; }
        scale() { return this; }
        rotate() { return this; }
      };
      console.log('[EnvGuard] DOMMatrix polyfill applied to global scope.');
    } catch (e) {
      console.error('[EnvGuard] Failed to polyfill DOMMatrix:', e);
    }
  }
};
