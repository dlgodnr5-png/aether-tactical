// OpenNext Cloudflare adapter config
// https://opennext.js.org/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Defaults: no R2, no D1. Use Cloudflare Workers + ASSETS binding.
  // ISR/cache on KV can be added later if needed.
});
