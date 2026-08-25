//
// This source file is part of the My Heart Counts LLM Evaluations open-source project
//
// SPDX-FileCopyrightText: 2025-2026 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT
//

import { randomInt } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { BackendFactory } from "./backends/BackendFactory.js";
import { HuggingFacePythonBackend } from "./backends/HuggingFacePythonBackend.js";
import { type ModelBackend } from "./backends/ModelBackend.js";
import { MODEL_CONFIGS, type ModelConfig } from "./config/models.js";
import {
  buildPrompt,
  getContextSnippet,
  loadPromptConstants,
  renderTemplate,
} from "./config/promptConstantsLoader.js";

// Type definitions matching planNudges.ts
enum Disease {
  HEART_FAILURE = "Heart failure",
  PULMONARY_ARTERIAL_HYPERTENSION = "Pulmonary arterial hypertension",
  DIABETES = "Diabetes",
  ACHD_SIMPLE = "ACHD (simple)",
  ACHD_COMPLEX = "ACHD (complex)",
}

enum StageOfChange {
  PRECONTEMPLATION = "Precontemplation",
  CONTEMPLATION = "Contemplation",
  PREPARATION = "Preparation",
  ACTION = "Action",
  MAINTENANCE = "Maintenance",
}

enum EducationLevel {
  HIGHSCHOOL = "Highschool",
  COLLEGE = "college",
  COLLAGE = "collage",
}

interface TestContext {
  genderIdentity: string;
  ageGroup: string;
  disease: Disease | null;
  stageOfChange: StageOfChange | null;
  educationLevel: EducationLevel;
  language: string;
  preferredWorkoutTypes: string;
  preferredNotificationTime: string;
}

interface TestResult {
  context: TestContext;
  modelId: string;
  provider: string;
  backendType: string;
  genderContext: string;
  ageContext: string;
  diseaseContext: string;
  stageContext: string;
  educationContext: string;
  languageContext: string;
  activityTypeContext: string;
  notificationTimeContext: string;
  fullPrompt: string;
  llmResponse: string;
  latencyMs?: number;
  error?: string;
}

const REQUIRED_CONTEXT_KEYS: Array<keyof TestContext> = [
  "genderIdentity",
  "ageGroup",
  "disease",
  "stageOfChange",
  "educationLevel",
  "language",
  "preferredWorkoutTypes",
  "preferredNotificationTime",
];

class NudgePermutationTester {
  private results: TestResult[] = [];
  private modelsToTest: ModelConfig[] = [];

  constructor(
    private openAIApiKey: string | undefined,
    private pythonServiceUrl = "http://localhost:8000",
    private secureGPTApiKey?: string | undefined,
    private geminiApiKey?: string | undefined,
  ) {}

  private getActivityTypeContext(preferredWorkoutTypes: string): string {
    // Available workout types, edit here if needed down the line
    const availableWorkoutTypes = [
      "other",
      "HIIT",
      "walk",
      "swim",
      "run",
      "sport",
      "strength",
      "bicycle",
      "yoga/pilates",
    ];

    const selectedTypes = preferredWorkoutTypes
      .split(",")
      .map((type: string) => type.trim());
    const hasOther = selectedTypes.includes("other");

    // Format selected activities consistently, strips: other
    const selectedActivities = selectedTypes.filter((type) => type !== "other");
    const formattedSelectedTypes =
      selectedActivities.length > 0 ?
        selectedActivities.join(", ")
      : "various activities";

    let activityTypeContext = `${formattedSelectedTypes} are the user's preferred activity types. Recommendations should be centered around these activity types. Recommendations should be creative, encouraging, and aligned within their preferred activity type.`;
    // Handle "other" selections if present in the preferred types
    if (hasOther) {
      // Only include activities that were NOT selected by the user
      const notChosenTypes = availableWorkoutTypes.filter(
        (type) => type !== "other" && !selectedTypes.includes(type),
      );

      if (selectedActivities.length === 0) {
        // User has only selected "other" with no other options, overwrite activityTypeContext with only this string
        activityTypeContext = `The user indicated that their preferred activity types differ from the available options (${availableWorkoutTypes.filter((type) => type !== "other").join(", ")}). Provide creative recommendations and suggest other ways to stay physically active without relying on the listed options.`;
      } else if (notChosenTypes.length > 0) {
        // User selected "other" along with some activities
        activityTypeContext += `The user indicated that they also prefer activity types beyond the remaining options (${notChosenTypes.join(", ")}). Provide creative recommendations and suggest other ways to stay physically active.`;
      } else {
        // User selected all standard activities plus "other"
        activityTypeContext += `The user indicated additional preferred activity types beyond the listed options. Provide creative recommendations and suggest other ways to stay physically active.`;
      }
    }

    return activityTypeContext;
  }

  private async generateNudgesForContext(
    context: TestContext,
    backend: ModelBackend,
    modelConfig: ModelConfig,
  ): Promise<TestResult> {
    const promptConstants = loadPromptConstants();
    const genderContext = getContextSnippet(
      promptConstants,
      "genderIdentity",
      context.genderIdentity,
    );
    const ageContext = getContextSnippet(
      promptConstants,
      "ageGroup",
      context.ageGroup,
    );
    const diseaseContext = getContextSnippet(
      promptConstants,
      "disease",
      context.disease,
    );
    const stageContext = getContextSnippet(
      promptConstants,
      "stageOfChange",
      context.stageOfChange,
    );
    const educationContext = getContextSnippet(
      promptConstants,
      "educationLevel",
      context.educationLevel,
    );
    const languageContext = getContextSnippet(
      promptConstants,
      "language",
      context.language,
    );
    const activityTypeContext = this.getActivityTypeContext(
      context.preferredWorkoutTypes,
    );
    const notificationTimeContext = renderTemplate(
      promptConstants.templates.notificationTimeContext,
      { preferredNotificationTime: context.preferredNotificationTime },
    );

    const prompt = buildPrompt(context);
    const startTime = Date.now();

    try {
      const timeout =
        modelConfig.config?.timeout ? modelConfig.config.timeout * 1000 : 60000;
      const options = {
        maxTokens: 512,
        temperature: 0.7,
        timeout,
      };

      const llmResponse = await backend.generate(prompt, options);
      const latencyMs = Date.now() - startTime;

      return {
        context,
        modelId: modelConfig.id,
        provider: modelConfig.provider,
        backendType: modelConfig.provider,
        genderContext,
        ageContext,
        diseaseContext,
        stageContext,
        educationContext,
        languageContext,
        activityTypeContext,
        notificationTimeContext,
        fullPrompt: prompt,
        llmResponse,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        context,
        modelId: modelConfig.id,
        provider: modelConfig.provider,
        backendType: modelConfig.provider,
        genderContext,
        ageContext,
        diseaseContext,
        stageContext,
        educationContext,
        languageContext,
        activityTypeContext,
        notificationTimeContext,
        fullPrompt: prompt,
        llmResponse: "",
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private generateAllPermutations(
    requireStageOfChange = false,
    requireComorbidity = false,
  ): TestContext[] {
    const genderOptions = ["male", "female"];
    const ageOptions = ["<35", "35-50", "51-65", ">65"];
    const diseaseOptions =
      requireComorbidity ?
        Object.values(Disease)
      : [null, ...Object.values(Disease)];
    const stageOptions =
      requireStageOfChange ?
        Object.values(StageOfChange)
      : [null, ...Object.values(StageOfChange)];
    const educationOptions = [...Object.values(EducationLevel)];
    const languageOptions = ["en", "en"];
    const workoutTypeOptions = [
      "run,walk",
      "HIIT,strength",
      "swim,bicycle",
      "yoga/pilates,walk",
      "sport,run,strength",
      "other",
      "other,walk,run",
      "other,HIIT,walk,swim,run,sport,strength,bicycle,yoga/pilates",
    ];
    const notificationTimeOptions = ["7:00 AM", "12:00 PM", "6:00 PM"];

    const permutations: TestContext[] = [];

    for (const genderIdentity of genderOptions) {
      for (const ageGroup of ageOptions) {
        for (const disease of diseaseOptions) {
          for (const stageOfChange of stageOptions) {
            permutations.push(
              ...this.expandPreferences(
                { genderIdentity, ageGroup, disease, stageOfChange },
                {
                  educationOptions,
                  languageOptions,
                  workoutTypeOptions,
                  notificationTimeOptions,
                },
              ),
            );
          }
        }
      }
    }

    return permutations;
  }

  private expandPreferences(
    participant: Pick<
      TestContext,
      "genderIdentity" | "ageGroup" | "disease" | "stageOfChange"
    >,
    options: {
      educationOptions: EducationLevel[];
      languageOptions: string[];
      workoutTypeOptions: string[];
      notificationTimeOptions: string[];
    },
  ): TestContext[] {
    const permutations: TestContext[] = [];

    for (const educationLevel of options.educationOptions) {
      for (const language of options.languageOptions) {
        for (const preferredWorkoutTypes of options.workoutTypeOptions) {
          for (const preferredNotificationTime of options.notificationTimeOptions) {
            permutations.push({
              ...participant,
              educationLevel,
              language,
              preferredWorkoutTypes,
              preferredNotificationTime,
            });
          }
        }
      }
    }

    return permutations;
  }

  private escapeCSVValue(value: string): string {
    // Always escape values that contain commas, quotes, or newlines
    if (
      value.includes(",") ||
      value.includes('"') ||
      value.includes("\n") ||
      value.includes("\r")
    ) {
      // Replace quotes with double quotes and wrap in quotes
      // Also normalize all line breaks to spaces to keep CSV structure intact
      const escaped = value
        .replace(/"/g, '""')
        .replace(/\r?\n/g, " ")
        .replace(/\r/g, " ");
      return `"${escaped}"`;
    }
    return value;
  }

  private writeResultsToCSV(results: TestResult[], filename: string): void {
    const headers = [
      "modelId",
      "provider",
      "backendType",
      "genderIdentity",
      "ageGroup",
      "disease",
      "stageOfChange",
      "educationLevel",
      "language",
      "preferredNotificationTime",
      "genderContext",
      "ageContext",
      "diseaseContext",
      "stageContext",
      "educationContext",
      "languageContext",
      "notificationTimeContext",
      "fullPrompt",
      "llmResponse",
      "latencyMs",
      "error",
    ];

    const csvRows = [headers.join(",")];

    for (const result of results) {
      const row = [
        result.modelId,
        result.provider,
        result.backendType,
        result.context.genderIdentity,
        result.context.ageGroup,
        result.context.disease ?? "",
        result.context.stageOfChange ?? "",
        result.context.educationLevel,
        result.context.language,
        result.context.preferredNotificationTime,
        result.genderContext,
        result.ageContext,
        result.diseaseContext,
        result.stageContext,
        result.educationContext,
        result.languageContext,
        result.notificationTimeContext,
        result.fullPrompt,
        result.llmResponse,
        result.latencyMs?.toString() ?? "",
        result.error ?? "",
      ].map((value): string => this.escapeCSVValue(value));

      csvRows.push(row.join(","));
    }

    fs.writeFileSync(filename, csvRows.join("\n"), "utf8");
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async checkPythonServiceHealth(): Promise<boolean> {
    try {
      const testBackend = new HuggingFacePythonBackend(
        {
          id: "test",
          provider: "huggingface",
          displayName: "test",
          enabled: true,
        },
        this.pythonServiceUrl,
      );
      return await testBackend.checkHealth();
    } catch {
      return false;
    }
  }

  setModelsToTest(models: ModelConfig[]): void {
    this.modelsToTest = models;
  }

  private async prepareModelsForRun(): Promise<void> {
    if (this.modelsToTest.length === 0) {
      throw new Error(
        "No models configured for testing. Use --model, --models, or --provider to select models.",
      );
    }

    const hasHuggingFaceModels = this.modelsToTest.some(
      (m) => m.provider === "huggingface",
    );
    if (!hasHuggingFaceModels) {
      return;
    }

    if (await this.checkPythonServiceHealth()) {
      return;
    }

    console.warn(
      `Warning: Python service at ${this.pythonServiceUrl} is not available. Hugging Face provider models will be skipped.`,
    );
    this.modelsToTest = this.modelsToTest.filter(
      (m) => m.provider !== "huggingface",
    );
    if (this.modelsToTest.length === 0) {
      throw new Error(
        "No models available for testing. Python service is required for huggingface-provider models.",
      );
    }
  }

  private selectPermutations(
    allPermutations: TestContext[],
    maxPermutations: number | undefined,
    randomize: boolean,
  ): TestContext[] {
    if (!maxPermutations) {
      return allPermutations;
    }
    const candidates =
      randomize ? this.shuffleArray(allPermutations) : allPermutations;
    return candidates.slice(0, maxPermutations);
  }

  private buildModelIdsLabel(): string {
    if (this.modelsToTest.length === 1) {
      return this.modelsToTest[0].id.replace(/\//g, "-");
    }
    if (this.modelsToTest.length <= 3) {
      return this.modelsToTest.map((m) => m.id.split("/").pop()).join("_");
    }
    const providers = [...new Set(this.modelsToTest.map((m) => m.provider))];
    return providers.length === 1 ?
        `${providers[0]}_${this.modelsToTest.length}models`
      : `multi-provider_${this.modelsToTest.length}models`;
  }

  private buildFilenameSuffix(options: {
    fromProvidedContexts: boolean;
    maxPermutations?: number;
    randomize: boolean;
    requireStageOfChange: boolean;
    requireComorbidity: boolean;
  }): string {
    if (options.fromProvidedContexts) {
      return "_from-json";
    }
    const requirements = `${options.requireStageOfChange ? "_require-stage" : ""}${options.requireComorbidity ? "_require-comorbidity" : ""}`;
    if (options.maxPermutations) {
      return `_sample_${options.maxPermutations}${options.randomize ? "_random" : ""}${requirements}`;
    }
    return `_full${requirements}`;
  }

  async runAllPermutations(
    maxPermutations?: number,
    randomize = false,
    outputDir?: string,
    requireStageOfChange = false,
    requireComorbidity = false,
    providedContexts?: TestContext[],
  ): Promise<void> {
    await this.prepareModelsForRun();

    const allPermutations =
      providedContexts ??
      this.generateAllPermutations(requireStageOfChange, requireComorbidity);

    const permutationsToTest = this.selectPermutations(
      allPermutations,
      providedContexts === undefined ? maxPermutations : undefined,
      randomize,
    );

    console.log(
      `${providedContexts ? "Loaded" : "Generated"} ${allPermutations.length} total ${providedContexts ? "contexts" : "permutations"}`,
    );
    console.log(
      `Testing ${permutationsToTest.length} ${providedContexts ? "contexts" : "permutations"}${!providedContexts && randomize ? " (randomly selected)" : ""}`,
    );
    console.log(
      `Testing ${this.modelsToTest.length} model(s): ${this.modelsToTest.map((m) => m.id).join(", ")}`,
    );

    let completed = 0;
    const totalTests = this.modelsToTest.length * permutationsToTest.length;

    // Run models sequentially
    for (const modelConfig of this.modelsToTest) {
      console.log(
        `\nTesting model: ${modelConfig.id} (${modelConfig.provider})`,
      );

      let backend: ModelBackend;
      try {
        backend = BackendFactory.create(
          modelConfig,
          this.openAIApiKey,
          this.pythonServiceUrl,
          this.secureGPTApiKey,
          this.geminiApiKey,
        );
      } catch (error) {
        console.error(
          `Failed to create backend for ${modelConfig.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      }

      // Test each permutation with this model
      for (const context of permutationsToTest) {
        console.log(
          `Processing permutation ${completed + 1}/${totalTests} (model: ${modelConfig.id})...`,
        );
        const result = await this.generateNudgesForContext(
          context,
          backend,
          modelConfig,
        );
        this.results.push(result);
        completed++;

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const modelIds = this.buildModelIdsLabel();
    const suffix = this.buildFilenameSuffix({
      fromProvidedContexts: providedContexts !== undefined,
      maxPermutations,
      randomize,
      requireStageOfChange,
      requireComorbidity,
    });

    // Use provided output directory or fall back to default (two levels up from dist/)
    const dataDir =
      outputDir ?
        path.resolve(outputDir)
      : path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          "../../data/generated",
        );

    fs.mkdirSync(dataDir, { recursive: true });
    const outputPath = path.join(
      dataDir,
      `nudge_permutations_results_${modelIds}${suffix}.csv`,
    );
    this.writeResultsToCSV(this.results, outputPath);
    console.log(`\nResults written to ${outputPath}`);
  }
}

const parseCLIArgs = (): {
  maxPermutations?: number;
  randomize: boolean;
  requireStageOfChange: boolean;
  requireComorbidity: boolean;
  modelIds?: string[];
  provider?: string;
  pythonServiceUrl?: string;
  outputDir?: string;
  contextsJsonPath?: string;
} => {
  const args = process.argv.slice(2);
  const result: {
    maxPermutations?: number;
    randomize: boolean;
    requireStageOfChange: boolean;
    requireComorbidity: boolean;
    modelIds?: string[];
    provider?: string;
    pythonServiceUrl?: string;
    outputDir?: string;
    contextsJsonPath?: string;
  } = {
    randomize: false,
    requireStageOfChange: false,
    requireComorbidity: false,
  };

  if (args.includes("--sample")) {
    const index = args.indexOf("--sample");
    result.maxPermutations = parseInt(args[index + 1]) || 10;
  }

  if (args.includes("--random")) {
    result.randomize = true;
  }

  if (args.includes("--require-stage-of-change")) {
    result.requireStageOfChange = true;
  }

  if (args.includes("--require-comorbidity")) {
    result.requireComorbidity = true;
  }

  if (args.includes("--model")) {
    const index = args.indexOf("--model");
    result.modelIds = [args[index + 1]];
  }

  if (args.includes("--models")) {
    const index = args.indexOf("--models");
    result.modelIds = args[index + 1].split(",").map((id) => id.trim());
  }

  if (args.includes("--provider")) {
    const index = args.indexOf("--provider");
    result.provider = args[index + 1];
  }

  if (args.includes("--python-service-url")) {
    const index = args.indexOf("--python-service-url");
    result.pythonServiceUrl = args[index + 1];
  }

  if (args.includes("--output")) {
    const index = args.indexOf("--output");
    result.outputDir = args[index + 1];
  }

  if (args.includes("--contexts-json")) {
    const index = args.indexOf("--contexts-json");
    result.contextsJsonPath = args[index + 1];
  }

  return result;
};

const parseContextsFromJson = (jsonPath: string): TestContext[] => {
  const resolvedPath = path.resolve(jsonPath);
  const raw = fs.readFileSync(resolvedPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(
      `Expected an array of contexts in ${resolvedPath}, but got ${typeof parsed}`,
    );
  }

  const contexts: TestContext[] = parsed.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(
        `Context at index ${index} in ${resolvedPath} must be an object`,
      );
    }

    const context = value as Record<string, unknown>;
    for (const key of REQUIRED_CONTEXT_KEYS) {
      if (!(key in context)) {
        throw new Error(
          `Missing required key '${key}' in context at index ${index} in ${resolvedPath}`,
        );
      }
    }

    const requiredStringFields: Array<keyof Omit<TestContext, "disease">> = [
      "genderIdentity",
      "ageGroup",
      "stageOfChange",
      "educationLevel",
      "language",
      "preferredWorkoutTypes",
      "preferredNotificationTime",
    ];

    for (const field of requiredStringFields) {
      const fieldValue = context[field];
      if (typeof fieldValue !== "string" || fieldValue.trim() === "") {
        throw new Error(
          `Field '${field}' must be a non-empty string in context at index ${index} in ${resolvedPath}`,
        );
      }
    }

    const diseaseValue = context.disease;
    if (
      diseaseValue !== null &&
      (typeof diseaseValue !== "string" || diseaseValue.trim() === "")
    ) {
      throw new Error(
        `Field 'disease' must be null or a non-empty string in context at index ${index} in ${resolvedPath}`,
      );
    }

    return {
      genderIdentity: context.genderIdentity as string,
      ageGroup: context.ageGroup as string,
      disease: diseaseValue as Disease | null,
      stageOfChange: context.stageOfChange as StageOfChange,
      educationLevel: context.educationLevel as EducationLevel,
      language: context.language as string,
      preferredWorkoutTypes: context.preferredWorkoutTypes as string,
      preferredNotificationTime: context.preferredNotificationTime as string,
    };
  });

  return contexts;
};

const selectModels = (
  cliArgs: ReturnType<typeof parseCLIArgs>,
): ModelConfig[] => {
  let models = MODEL_CONFIGS.filter((m) => m.enabled);

  // Filter by provider
  if (cliArgs.provider && cliArgs.provider !== "all") {
    models = models.filter((m) => m.provider === cliArgs.provider);
  }

  // Filter by specific model IDs
  if (cliArgs.modelIds) {
    models = models.filter((m) => cliArgs.modelIds?.includes(m.id) ?? false);
  }

  // Default: if no filters, use OpenAI only (backward compatible)
  if (!cliArgs.provider && !cliArgs.modelIds) {
    models = models.filter((m) => m.provider === "openai");
  }

  return models;
};

const main = async () => {
  const cliArgs = parseCLIArgs();
  const openAIApiKey = process.env.OPENAI_API_KEY;
  const secureGPTApiKey = process.env.SECUREGPT_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const pythonServiceUrl = cliArgs.pythonServiceUrl ?? "http://localhost:8000";

  const modelsToTest = selectModels(cliArgs);

  if (modelsToTest.length === 0) {
    console.error(
      "No models selected for testing. Use --model, --models, or --provider to select models.",
    );
    process.exit(1);
  }

  const needsOpenAI = modelsToTest.some((m) => m.provider === "openai");
  if (needsOpenAI && !openAIApiKey) {
    console.error(
      "OPENAI_API_KEY environment variable is required for OpenAI models",
    );
    process.exit(1);
  }

  const needsSecureGPT = modelsToTest.some((m) => m.provider === "securegpt");
  if (needsSecureGPT && !secureGPTApiKey) {
    console.error(
      "SECUREGPT_API_KEY environment variable is required for SecureGPT models",
    );
    process.exit(1);
  }

  const needsGemini = modelsToTest.some((m) => m.provider === "gemini");
  if (needsGemini && !geminiApiKey) {
    console.error(
      "GEMINI_API_KEY environment variable is required for Gemini models",
    );
    process.exit(1);
  }

  if (cliArgs.maxPermutations) {
    console.log(
      `Starting nudge permutation testing (sample mode: ${cliArgs.maxPermutations} permutations${cliArgs.randomize ? ", randomly selected" : ""})...`,
    );
  } else {
    console.log(
      "Starting nudge permutation testing (full mode: all permutations)...",
    );
  }

  const tester = new NudgePermutationTester(
    openAIApiKey,
    pythonServiceUrl,
    secureGPTApiKey,
    geminiApiKey,
  );
  if (cliArgs.contextsJsonPath && cliArgs.maxPermutations) {
    console.warn(
      "Warning: --sample is ignored when --contexts-json is provided.",
    );
  }
  if (cliArgs.contextsJsonPath && cliArgs.randomize) {
    console.warn(
      "Warning: --random is ignored when --contexts-json is provided.",
    );
  }
  const providedContexts =
    cliArgs.contextsJsonPath ?
      parseContextsFromJson(cliArgs.contextsJsonPath)
    : undefined;

  tester.setModelsToTest(modelsToTest);
  await tester.runAllPermutations(
    cliArgs.maxPermutations,
    cliArgs.randomize,
    cliArgs.outputDir,
    cliArgs.requireStageOfChange,
    cliArgs.requireComorbidity,
    providedContexts,
  );
  console.log("Testing complete!");
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
