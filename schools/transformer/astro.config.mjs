import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";

export default defineConfig({
	output: "server",
	cacheDir: "./.astro/cache",
	adapter: cloudflare({ inspectorPort: false }),
	integrations: [mdx()],
	markdown: {
		rehypePlugins: [
			rehypeSlug,
			[
				rehypeAutolinkHeadings,
				{ behavior: "wrap", properties: { class: "heading-anchor" } },
			],
		],
		shikiConfig: {
			theme: "vesper",
		},
	},
	security: {
		checkOrigin: false,
	},
	vite: {
		server: { strictPort: true },
		cacheDir: "./.vite",
		plugins: [tailwindcss()],
	},
});
