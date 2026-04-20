// @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

const [baseConfig, tsConfig, ...restConfig] = tanstackConfig

const eslintConfig = [
  {
    ignores: [".output/**", "dist/**", "node_modules/**"],
  },
  baseConfig,
  {
    ...tsConfig,
    ignores: [...(tsConfig.ignores ?? []), "eslint.config.js", ".output/**", "dist/**"],
  },
  ...restConfig,
]

export default eslintConfig


