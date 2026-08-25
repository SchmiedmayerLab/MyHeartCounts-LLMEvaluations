//
// This source file is part of the My Heart Counts LLM Evaluations open-source project
//
// SPDX-FileCopyrightText: 2025-2026 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT
//

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  // Extensible for provider-specific options
  [key: string]: unknown;
}

export type ModelProvider = "openai" | "huggingface" | "securegpt";

export interface ModelBackend {
  readonly modelId: string;
  readonly provider: ModelProvider;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  supportsModel(modelId: string): boolean;
}
