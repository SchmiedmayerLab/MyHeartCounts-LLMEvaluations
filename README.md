<!--

This source file is part of the My Heart Counts LLM Evaluations open-source project

SPDX-FileCopyrightText: 2025-2026 Stanford University and the project authors (see CONTRIBUTORS.md)

SPDX-License-Identifier: MIT

-->

# My Heart Counts LLM Evaluations

[![Build and Test](https://github.com/SchmiedmayerLab/MyHeartCounts-LLMEvaluations/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/SchmiedmayerLab/MyHeartCounts-LLMEvaluations/actions/workflows/build-and-test.yml)
[![CodeQL](https://github.com/SchmiedmayerLab/MyHeartCounts-LLMEvaluations/actions/workflows/codeql.yml/badge.svg)](https://github.com/SchmiedmayerLab/MyHeartCounts-LLMEvaluations/actions/workflows/codeql.yml)
[![REUSE status](https://api.reuse.software/badge/github.com/SchmiedmayerLab/MyHeartCounts-LLMEvaluations)](https://api.reuse.software/info/github.com/SchmiedmayerLab/MyHeartCounts-LLMEvaluations)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)

Motivational nudge generation, testing, and evaluation suite for the My Heart Counts cardiovascular health study. Motivational nudges are sent as daily push notifications to users to motivate them to exercise and get moving.

The iOS Application can be found in the [SchmiedmayerLab/MyHeartCounts-iOS](https://github.com/SchmiedmayerLab/MyHeartCounts-iOS) repository, the Firebase backend for the iOS Application can be found in the [SchmiedmayerLab/MyHeartCounts-Firebase](https://github.com/SchmiedmayerLab/MyHeartCounts-Firebase) repository, and the repository for the data analysis side of this study can be found over at [SchmiedmayerLab/MyHeartCounts-DataAnalysis](https://github.com/SchmiedmayerLab/MyHeartCounts-DataAnalysis).

The study itself with its contents is defined in [SchmiedmayerLab/MyHeartCounts-StudyDefinitions](https://github.com/SchmiedmayerLab/MyHeartCounts-StudyDefinitions).

## Nudge Generation

See [nudge-generation/README.md](nudge-generation/README.md) for documentation on nudge generation via various language models (GPT, Gemini, local Hugging Face models, etc.).

## Nudge Evaluation

See [nudge-evaluation/README.md](nudge-evaluation/README.md) for the linguistic analysis of generated nudges and [nudge-evaluation/llm-as-judge/README.md](nudge-evaluation/llm-as-judge/README.md) for the LLM-as-judge pipeline.

## Custom Survey Service

See [custom-survey-service/README.md](custom-survey-service/README.md) for the web application used to collect human evaluations of the generated nudges.

## Contributing

Contributions to this project are welcome. Please make sure to read the [contribution guidelines](https://github.com/SchmiedmayerLab/.github/blob/main/CONTRIBUTING.md) and the [contributor covenant code of conduct](https://github.com/SchmiedmayerLab/.github/blob/main/CODE_OF_CONDUCT.md) first. You can find a list of contributors in the [CONTRIBUTORS.md](CONTRIBUTORS.md) file.

## License

This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for more information.

## Citation

If you use this software, please cite it using the metadata in [CITATION.cff](CITATION.cff), which GitHub surfaces through the [*Cite this repository*](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-citation-files) button.

## Our Research

For more information, visit the [Schmiedmayer Lab GitHub organization](https://github.com/SchmiedmayerLab).

![Schmiedmayer Lab](https://raw.githubusercontent.com/SchmiedmayerLab/.github/main/assets/footer-light.png#gh-light-mode-only)
![Schmiedmayer Lab](https://raw.githubusercontent.com/SchmiedmayerLab/.github/main/assets/footer-dark.png#gh-dark-mode-only)
