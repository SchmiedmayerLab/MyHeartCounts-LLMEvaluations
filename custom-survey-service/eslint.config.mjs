//
// This source file is part of the My Heart Counts LLM Evaluations open-source project
//
// SPDX-FileCopyrightText: 2025-2026 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT
//

import { getEslintReactConfig } from "@schmiedmayerlab/grove-configurations";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  ...getEslintReactConfig({ tsconfigRootDir: import.meta.dirname }),
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    files: ["next-env.d.ts"],
    rules: {
      "import-x/extensions": "off",
      "import-x/no-unresolved": "off",
    },
  },
  {
    files: ["eslint.config.mjs"],
    rules: {
      // `@next/eslint-plugin-next` is CommonJS, so `configs` is only reachable through the default export
      "import-x/no-named-as-default-member": "off",
    },
  },
];
