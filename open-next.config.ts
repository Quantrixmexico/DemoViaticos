import { defineCloudflareConfig } from "@opennextjs/cloudflare"

export default {
  ...defineCloudflareConfig(),
  // `npm run build` ejecuta OpenNext; sin esto OpenNext volvería a llamar
  // a `npm run build` y entraría en bucle.
  buildCommand: "npx next build",
}
