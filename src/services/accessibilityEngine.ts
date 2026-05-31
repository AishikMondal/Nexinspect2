export interface AccessibilityViolation {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  target: string;
  message: string;
  element: string;
  contrastRatio?: number;
  apcaScore?: number;
}

export function groupViolations(violations: AccessibilityViolation[]): {
  critical: AccessibilityViolation[];
  serious: AccessibilityViolation[];
  moderate: AccessibilityViolation[];
  minor: AccessibilityViolation[];
} {
  const groups = {
    critical: [] as AccessibilityViolation[],
    serious: [] as AccessibilityViolation[],
    moderate: [] as AccessibilityViolation[],
    minor: [] as AccessibilityViolation[],
  };

  violations.forEach((violation) => {
    const impact = violation.impact || "minor";
    if (groups[impact]) {
      groups[impact].push(violation);
    } else {
      groups.minor.push(violation);
    }
  });

  return groups;
}

export function getWcagCompliance(ratio: number, isLargeText: boolean): {
  aa: boolean;
  aaa: boolean;
  statusText: string;
} {
  const aaMin = isLargeText ? 3.0 : 4.5;
  const aaaMin = isLargeText ? 4.5 : 7.0;

  const aa = ratio >= aaMin;
  const aaa = ratio >= aaaMin;

  let statusText = "Fail";
  if (aaa) {
    statusText = "Pass (AAA)";
  } else if (aa) {
    statusText = "Pass (AA)";
  }

  return { aa, aaa, statusText };
}

export function getApcaCompliance(lc: number, isBodyText: boolean): {
  compliant: boolean;
  rating: string;
} {
  // APCA guidelines (simplified):
  // Lc 75 is preferred for body text (under 18px / 14pt)
  // Lc 60 is preferred for content text (above 18px / bold)
  // Lc 45 is minimum for large display text
  if (isBodyText) {
    if (lc >= 75) return { compliant: true, rating: "Preferred (Lc 75+)" };
    if (lc >= 60) return { compliant: true, rating: "Acceptable (Lc 60+)" };
    return { compliant: false, rating: "Low Contrast (Lc < 60)" };
  } else {
    if (lc >= 60) return { compliant: true, rating: "Preferred (Lc 60+)" };
    if (lc >= 45) return { compliant: true, rating: "Acceptable (Lc 45+)" };
    return { compliant: false, rating: "Low Contrast (Lc < 45)" };
  }
}
