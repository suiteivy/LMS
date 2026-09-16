// ---------------------------------------------------------------------------
// Shared performance-label utility — derives label from grading scale, never hardcoded
// ---------------------------------------------------------------------------

export interface GradingScaleRow {
  id?: string;
  name?: string;
  letter_grade: string;
  min_score: number;
  max_score: number;
  gpa_points: number;
  points?: number;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
}

export interface PerformanceResult {
  label: string;
  color: string;         // tailwind text class (dark-aware)
  bg: string;            // tailwind bg class  (dark-aware)
  borderColor: string;   // tailwind border class (dark-aware)
  isPassing: boolean;
  letterGrade: string;
  gpaPoints: number;
}

/**
 * Resolve a performance label from a percentage and the institution's grading
 * scale rows.  Labels are NEVER hardcoded — they come from the scale's own
 * letter grades and gpa_points.
 *
 * When no scale rows are provided, a sensible fallback mapping is used so
 * the UI always has something to show.
 */
export function getPerformanceLabel(
  percentage: number,
  scaleRows: GradingScaleRow[],
): PerformanceResult {
  // ---- 1.  Find the matching grade entry from the scale --------------------
  if (scaleRows.length > 0) {
    const sorted = [...scaleRows].sort((a, b) => b.min_score - a.min_score);
    for (const row of sorted) {
      if (percentage >= row.min_score && percentage <= row.max_score) {
        return deriveFromScaleRow(row);
      }
    }
    // If percentage is above the highest max_score, use the top grade
    const top = sorted[0];
    if (percentage > top.max_score) {
      return deriveFromScaleRow(top);
    }
    // If below the lowest min_score, use the bottom grade
    const bottom = sorted[sorted.length - 1];
    if (percentage < bottom.min_score) {
      return deriveFromScaleRow(bottom);
    }
  }

  // ---- 2.  Fallback when no scale rows exist — pure percentage mapping -----
  return fallbackFromPercentage(percentage);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveFromScaleRow(row: GradingScaleRow): PerformanceResult {
  const letter = (row.letter_grade || "").trim();
  const gpa = Number(row.points ?? row.gpa_points ?? 0);
  const isPassing = gpa > 0 || !isFailingGrade(letter);

  // Prioritize institution-defined description; if missing and letter is already a word/phrase, use it directly
  const label = (row.description && row.description.trim().length > 0)
    ? row.description.trim()
    : (letter.length > 2 ? letter : labelFromLetter(letter, gpa));
  const colors = colorFromLetter(letter, gpa);

  return {
    label,
    ...colors,
    isPassing,
    letterGrade: letter,
    gpaPoints: gpa,
  };
}

function isFailingGrade(letter: string): boolean {
  const l = letter.toUpperCase().trim();
  return l === "F" || l === "E" || l.includes("FAIL") || l.includes("BELOW") || l.includes("UNSATISFACTORY");
}

/** Map a letter grade or achievement word to a human-readable performance label. */
function labelFromLetter(letter: string, gpa: number): string {
  const l = letter.toUpperCase().trim();

  // 1. Direct letter or semantic word matches
  if (
    l.startsWith("A") ||
    l.includes("EXCELLENT") ||
    l.includes("EXCEEDING") ||
    l.includes("DISTINCTION") ||
    l.includes("OUTSTANDING") ||
    l.includes("MASTERY")
  ) return "Excellent";

  if (
    l.startsWith("B") ||
    l.includes("GOOD") ||
    l.includes("MEETING") ||
    l.includes("PROFICIENT") ||
    l.includes("MERIT") ||
    l.includes("VERY GOOD") ||
    l.includes("CREDIT")
  ) return "Good";

  if (
    l.startsWith("C") ||
    l.includes("SATISFACTORY") ||
    l.includes("AVERAGE") ||
    l.includes("APPROACHING") ||
    l.includes("DEVELOPING") ||
    l.includes("BASIC") ||
    l.includes("FAIR") ||
    l === "PASS"
  ) return "Satisfactory";

  if (
    l.startsWith("D") ||
    l.includes("IMPROVEMENT") ||
    l.includes("EMERGING")
  ) return "Needs Improvement";

  if (
    l === "F" ||
    l === "E" ||
    l.includes("FAIL") ||
    l.includes("BELOW") ||
    l.includes("UNSATISFACTORY")
  ) return "Failing";

  // Unknown label — derive from gpa if available
  if (gpa >= 3.5) return "Excellent";
  if (gpa >= 2.5) return "Good";
  if (gpa >= 1.5) return "Satisfactory";
  if (gpa > 0) return "Needs Improvement";
  return letter || "Failing";
}

/** Map a letter grade, achievement word, or GPA to tailwind color classes. */
export function colorFromLetter(letter: string, gpa?: number): {
  color: string;
  bg: string;
  borderColor: string;
} {
  const l = letter.toUpperCase().trim();

  // Top / Excellent / Exceeding Expectation
  if (
    l.startsWith("A") ||
    l.includes("EXCELLENT") ||
    l.includes("EXCEEDING") ||
    l.includes("DISTINCTION") ||
    l.includes("OUTSTANDING") ||
    l.includes("MASTERY")
  ) {
    return {
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800",
    };
  }

  // Good / Meeting Expectation / Proficient / Merit
  if (
    l.startsWith("B") ||
    l.includes("GOOD") ||
    l.includes("MEETING") ||
    l.includes("PROFICIENT") ||
    l.includes("MERIT") ||
    l.includes("VERY GOOD") ||
    l.includes("CREDIT")
  ) {
    return {
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
    };
  }

  // Satisfactory / Approaching Expectation / Average / Pass
  if (
    l.startsWith("C") ||
    l.includes("SATISFACTORY") ||
    l.includes("AVERAGE") ||
    l.includes("APPROACHING") ||
    l.includes("DEVELOPING") ||
    l.includes("BASIC") ||
    l.includes("FAIR") ||
    l === "PASS"
  ) {
    return {
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      borderColor: "border-amber-200 dark:border-amber-800",
    };
  }

  // Needs Improvement / Below Average
  if (
    l.startsWith("D") ||
    l.includes("IMPROVEMENT") ||
    l.includes("EMERGING")
  ) {
    return {
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/30",
      borderColor: "border-orange-200 dark:border-orange-800",
    };
  }

  // Failing / Below Expectation / Unsatisfactory
  if (
    l === "F" ||
    l === "E" ||
    l.includes("FAIL") ||
    l.includes("BELOW") ||
    l.includes("UNSATISFACTORY")
  ) {
    return {
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/30",
      borderColor: "border-red-200 dark:border-red-800",
    };
  }

  // Fallback to GPA points if available
  if (typeof gpa === "number") {
    if (gpa >= 3.5) {
      return {
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-50 dark:bg-green-950/30",
        borderColor: "border-green-200 dark:border-green-800",
      };
    }
    if (gpa >= 2.5) {
      return {
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-950/30",
        borderColor: "border-blue-200 dark:border-blue-800",
      };
    }
    if (gpa >= 1.5) {
      return {
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-950/30",
        borderColor: "border-amber-200 dark:border-amber-800",
      };
    }
    if (gpa > 0) {
      return {
        color: "text-orange-600 dark:text-orange-400",
        bg: "bg-orange-50 dark:bg-orange-950/30",
        borderColor: "border-orange-200 dark:border-orange-800",
      };
    }
  }

  // Default neutral/muted fallback
  return {
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800/40",
    borderColor: "border-gray-300 dark:border-gray-700",
  };
}

/** Fallback when no grading scale rows exist — purely percentage-based. */
function fallbackFromPercentage(percentage: number): PerformanceResult {
  if (percentage >= 80)
    return {
      label: "Excellent",
      ...colorFromLetter("A"),
      isPassing: true,
      letterGrade: "A",
      gpaPoints: 4.0,
    };
  if (percentage >= 70)
    return {
      label: "Good",
      ...colorFromLetter("B"),
      isPassing: true,
      letterGrade: "B",
      gpaPoints: 3.0,
    };
  if (percentage >= 60)
    return {
      label: "Satisfactory",
      ...colorFromLetter("C"),
      isPassing: true,
      letterGrade: "C",
      gpaPoints: 2.0,
    };
  if (percentage >= 50)
    return {
      label: "Needs Improvement",
      ...colorFromLetter("D"),
      isPassing: true,
      letterGrade: "D",
      gpaPoints: 1.0,
    };
  return {
    label: "Failing",
    ...colorFromLetter("F"),
    isPassing: false,
    letterGrade: "F",
    gpaPoints: 0,
  };
}

// ---------------------------------------------------------------------------
// GPA-based variant (used in GPA hero cards where we have GPA not %)
// ---------------------------------------------------------------------------

/**
 * Resolve a performance label from a GPA value (0–4.0) and optional scale rows.
 * Used by GPA hero cards where the primary metric is GPA, not percentage.
 */
export function getPerformanceFromGpa(
  gpa: number,
  scaleRows: GradingScaleRow[] = [],
): PerformanceResult {
  // If we have scale rows, convert GPA → letter grade via the scale
  if (scaleRows.length > 0) {
    const sorted = [...scaleRows].sort((a, b) => b.gpa_points - a.gpa_points);
    for (const row of sorted) {
      if (gpa >= row.gpa_points) {
        // Estimate percentage from min_score of this range
        const mid = (row.min_score + row.max_score) / 2;
        return deriveFromScaleRow({ ...row, min_score: mid, max_score: mid });
      }
    }
  }

  // Fallback GPA mapping
  if (gpa >= 3.7)
    return {
      label: "Excellent",
      ...colorFromLetter("A"),
      isPassing: true,
      letterGrade: "A",
      gpaPoints: gpa,
    };
  if (gpa >= 3.0)
    return {
      label: "Good",
      ...colorFromLetter("B"),
      isPassing: true,
      letterGrade: "B",
      gpaPoints: gpa,
    };
  if (gpa >= 2.0)
    return {
      label: "Satisfactory",
      ...colorFromLetter("C"),
      isPassing: true,
      letterGrade: "C",
      gpaPoints: gpa,
    };
  if (gpa > 0)
    return {
      label: "Needs Improvement",
      ...colorFromLetter("D"),
      isPassing: true,
      letterGrade: "D",
      gpaPoints: gpa,
    };
  return {
    label: "Failing",
    ...colorFromLetter("F"),
    isPassing: false,
    letterGrade: "F",
    gpaPoints: 0,
  };
}
