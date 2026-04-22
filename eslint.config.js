// @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

const [baseConfig, tsConfig, ...restConfig] = tanstackConfig
const commonIgnores = [".output/**", "dist/**", "node_modules/**"]
const filesWithTypeAwareLintingDisabled = [
  "scripts/e2e-seed-auth.ts",
  "scripts/scheduled-push.ts",
  "src/components/app-sidebar.tsx",
  "src/components/flight-results.tsx",
  "public/sw.js",
  "src/components/flight-search-panel.tsx",
]
const tsLanguageOptions = /** @type {{ parserOptions?: object }} */ (
  tsConfig.languageOptions ?? {}
)
const tsParserOptions = tsLanguageOptions.parserOptions ?? {}

const eslintConfig = [
  {
    ignores: [...commonIgnores, ...filesWithTypeAwareLintingDisabled],
  },
  baseConfig,
  {
    ...tsConfig,
    ignores: [
      ...(tsConfig.ignores ?? []),
      "eslint.config.js",
      ...commonIgnores,
    ],
    languageOptions: {
      ...tsLanguageOptions,
      parserOptions: {
        ...tsParserOptions,
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...restConfig,
]

export default eslintConfig
