/// <reference types="vite/client" />

declare module '*.wasm' {
  const content: any;
  export default content;
}
