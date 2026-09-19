/// <reference types="vite/client" />
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

interface ImportMetaEnv {
  /** Public Turnstile key. When empty the bot check widget is not shown (local development). */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}
