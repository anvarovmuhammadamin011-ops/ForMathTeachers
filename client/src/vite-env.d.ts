/// <reference types="vite/client" />

declare module 'katex/dist/contrib/auto-render.mjs' {
  interface RenderMathInElementOptions {
    delimiters?: Array<{ left: string; right: string; display: boolean }>;
    throwOnError?: boolean;
    strict?: string | boolean;
    trust?: boolean;
    ignoredTags?: string[];
  }
  export default function renderMathInElement(
    element: HTMLElement,
    options?: RenderMathInElementOptions,
  ): void;
}
