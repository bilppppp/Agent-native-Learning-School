import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, sessionDrivers } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkMath from "remark-math";
import { assertVercelBuildEnv, resolveDeployTarget } from "./src/lib/deploy-target";

const deployTarget = resolveDeployTarget();
assertVercelBuildEnv();

const adapter =
	deployTarget === "node"
		? node({ mode: "standalone" })
		: deployTarget === "vercel"
			? vercel()
			: cloudflare({
					inspectorPort: false,
					imageService: "compile",
					...(deployTarget === "cloudflare"
						? { configPath: "wrangler.cloudflare.jsonc" }
						: {}),
				});

function omitUnusedProgressStores() {
	if (deployTarget === "dev") return undefined;
	return {
		name: "omit-unused-progress-stores",
		resolveId(id) {
			if (deployTarget !== "cloudflare" && id === "cloudflare:workers") {
				return "\0omit-cloudflare-workers";
			}
			if (id.includes("store-dev")) return "\0omit-store-dev";
			if (deployTarget !== "cloudflare" && id.includes("store-r2")) {
				return "\0omit-store-r2";
			}
		},
		load(id) {
			if (id === "\0omit-cloudflare-workers") {
				return "export const env = {};";
			}
			if (id === "\0omit-store-dev") {
				return "export async function createDevProgressStore() { throw new Error('Dev progress store is not available in this build'); }";
			}
			if (id === "\0omit-store-r2") {
				return "export function createR2ProgressStore() { throw new Error('R2 progress store is not available in this build'); }";
			}
		},
	};
}

export default defineConfig({
	session: {
		driver: sessionDrivers["null"](),
	},
	output: "server",
	cacheDir: "./.astro/cache",
	adapter,
	integrations: [mdx()],
	markdown: {
		remarkPlugins: [remarkMath],
		rehypePlugins: [
			rehypeSlug,
			[
				rehypeAutolinkHeadings,
				{ behavior: "wrap", properties: { class: "heading-anchor" } },
			],
			[rehypeKatex, { throwOnError: false }],
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
		plugins: [tailwindcss(), omitUnusedProgressStores()].filter(Boolean),
		define: {
			"import.meta.env.SCHOOL_DEPLOY_TARGET": JSON.stringify(deployTarget),
		},
	},
});
