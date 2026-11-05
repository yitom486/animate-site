import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// CLI 安装的 vendor 原件与未使用的框架欢迎页不属于业务主题检查范围。
const excluded = new Set(["app/components/ui", "app/components/motion", "app/welcome"]);
const rawColor =
  /(?:bg|text|border|ring|shadow|from|via|to|fill|stroke|divide|outline|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b|#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch)\(/;
const namedColor =
  /(?:color|backgroundColor|background|borderColor|fill|stroke|stopColor)\s*[:=]\s*["'](?:white|black|red|blue|green|pink|purple|gray|grey|yellow|orange)["']/;
const violations: string[] = [];

async function checkDirectory(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.posix.join(directory, entry.name);
    if (excluded.has(filename)) continue;
    if (entry.isDirectory()) {
      await checkDirectory(filename);
    } else if (/\.(?:tsx?|css)$/.test(filename) && filename !== "app/app.css") {
      const content = await readFile(filename, "utf8");
      content.split("\n").forEach((line, index) => {
        if (rawColor.test(line) || namedColor.test(line)) {
          violations.push(`${filename}:${index + 1}: 请改用 CSS 变量与语义 Tailwind 类。`);
        }
      });
    }
  }
}

const css = await readFile("app/app.css", "utf8");
const themeBlocks = [/:root\s*\{([^}]+)\}/s, /\.dark\s*\{([^}]+)\}/s].map((pattern) => {
  const block = css.match(pattern)?.[1];
  if (!block) throw new Error("主题必须同时定义 :root 与 .dark。");
  return new Set([...block.matchAll(/--([\w-]+)\s*:/g)].map((match) => match[1]));
});
for (const name of new Set([...themeBlocks[0], ...themeBlocks[1]])) {
  if (!themeBlocks.every((theme) => theme.has(name))) {
    violations.push(`app/app.css: --${name} 必须同时存在于亮色与暗色主题。`);
  }
}
const nonThemeCss = css.replace(/(?::root|\.dark)\s*\{[^}]+\}/gs, "");
if (rawColor.test(nonThemeCss)) {
  violations.push("app/app.css: 颜色字面量只能定义在 :root / .dark 的主题变量中。");
}
await checkDirectory("app");
if (violations.length) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("主题检查通过：业务代码无颜色硬编码，亮暗主题变量齐全。");
}
