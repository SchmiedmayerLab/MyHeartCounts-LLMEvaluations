//
// This source file is part of the My Heart Counts LLM Evaluations open-source project
//
// SPDX-FileCopyrightText: 2025-2026 Stanford University and the project authors (see CONTRIBUTORS.md)
//
// SPDX-License-Identifier: MIT
//

import Link from "next/link";

export default function SurveyConfirmationPage() {
  return (
    <main>
      <div className="card">
        <h1>Thanks for completing the survey</h1>
        <p>Your responses were submitted successfully.</p>
        <Link href="/login" className="button">
          Start another session
        </Link>
      </div>
    </main>
  );
}
