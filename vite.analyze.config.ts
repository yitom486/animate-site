import { reactRouter } from "@react-router/dev/vite";
import { cloudflareDevProxy } from "@react-router/dev/vite/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * 临时：在每次 generateBundle 时写出 chunk→模块体积表。
 * React Router 会打 client + server 两套，用目录名区分。
 */
function chunkModuleDump(): Plugin {
  return {
    name: "chunk-module-dump",
    generateBundle(_options, bundle) {
      const outDir = (this as { meta?: { watchMode?: boolean } }).meta;
      const dirHint =
        Object.values(bundle).find((c) => c.type === "chunk" && "fileName" in c)?.fileName ?? "";
      // Vite/RR 输出路径会进 fileName；用是否含 assets/ 与模块是否含 node_modules 粗分
      const chunks: Array<{
        fileName: string;
        codeBytes: number;
        modules: Array<{ id: string; renderedLength: number }>;
      }> = [];

      for (const item of Object.values(bundle)) {
        if (item.type !== "chunk") continue;
        const modules = Object.entries(item.modules ?? {}).map(([id, info]) => ({
          id,
          renderedLength: info.renderedLength ?? 0,
        }));
        modules.sort((a, b) => b.renderedLength - a.renderedLength);
        chunks.push({
          fileName: item.fileName,
          codeBytes: item.code?.length ?? 0,
          modules,
        });
      }

      chunks.sort((a, b) => b.codeBytes - a.codeBytes);
      const hasNodeModules = chunks.some((c) =>
        c.modules.some((m) => m.id.includes("node_modules")),
      );
      const tag = hasNodeModules ? "client" : "server";
      const outPath = join("docs/planning", `_bundle-modules-${tag}.json`);
      mkdirSync("docs/planning", { recursive: true });
      writeFileSync(outPath, JSON.stringify({ tag, chunks }, null, 2));
      console.log(`[chunk-module-dump] wrote ${outPath} (${chunks.length} chunks)`);
    },
  };
}

export default defineConfig({
  plugins: [cloudflareDevProxy(), tailwindcss(), reactRouter(), chunkModuleDump()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    sourcemap: true,
  },
});
