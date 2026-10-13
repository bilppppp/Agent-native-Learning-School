import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import { assertVercelBuildEnv, resolveDeployTarget } from "./src/lib/deploy-target";

const deployTarget = resolveDeployTarget();
assertVercelBuildEnv();

const adapter =
	deployTarget === "node"
		? node({ mode: "standalone" })
		: deployTarget === "vercel"
			? vercel()
			: cloudflare({ inspectorPort: false });

function omitDevOnlyModules() {
	if (deployTarget === "dev") return undefined;
	return {
		name: "omit-dev-progress-store",
		resolveId(id) {
			if (id === "cloudflare:workers") return "\0omit-cloudflare-workers";
			if (id.includes("store-dev")) return "\0omit-store-dev";
		},
		load(id) {
			if (id === "\0omit-cloudflare-workers") {
				return "export const env = {};";
			}
			if (id === "\0omit-store-dev") {
				return "export async function createDevProgressStore() { throw new Error('Dev progress store is not available in this build'); }";
			}
		},
	};
}

export default defineConfig({
	output: "server",
	cacheDir: "./.astro/cache",
	adapter,
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
		plugins: [tailwindcss(), omitDevOnlyModules()].filter(Boolean),
		define: {
			"import.meta.env.SCHOOL_DEPLOY_TARGET": JSON.stringify(deployTarget),
		},
	},
});
