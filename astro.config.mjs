import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";

import mdx from "@astrojs/mdx";
import remarkMath from "remark-math";

// https://astro.build/config
export default defineConfig({
  outDir: "out/",
  markdown: {
    shikiConfig: {
      theme: "github-light",
    },
  },
  integrations: [
    preact(),
    mdx({
      remarkPlugins: [remarkMath],
    }),
  ],
});
