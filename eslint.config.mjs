import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Contentlayer generates these on every build. Linting them reports
    // problems nobody can fix in this repo.
    ".contentlayer/**",
  ]),
  {
    // Build scripts run directly on Node as CommonJS, so require() is correct here.
    files: ["scripts/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // remark and rehype plugins walk mdast/hast nodes whose child shapes are not
    // statically known. Typing every visitor argument buys nothing here.
    files: ["src/lib/remark-*.ts", "src/lib/rehype-*.ts", "contentlayer.config.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
]);

export default eslintConfig;
