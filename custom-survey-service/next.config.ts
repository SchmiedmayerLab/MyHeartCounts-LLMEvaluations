//
// This source file is part of the My Heart Counts LLM Evaluations open-source project
//
// SPDX-FileCopyrightText: 2025-2026 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT
//

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: configDirectory,
  },
};

// Next.js expects a default export from next.config.ts.
// eslint-disable-next-line import-x/no-default-export
export default nextConfig;
