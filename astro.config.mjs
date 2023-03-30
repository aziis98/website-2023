import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	outDir: 'out/',
	markdown: {
		shikiConfig: {
			theme: "github-light",
		},
	},
});
