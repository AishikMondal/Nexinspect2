// Wrapper for Chrome's experimental LanguageModel API (Gemini Nano)
export interface GeminiNanoSession {
  prompt: (text: string) => Promise<string>;
  destroy: () => void;
}

export async function checkGeminiNanoAvailability(): Promise<{
  available: boolean;
  status: "available" | "unavailable";
  error?: string;
}> {
  try {
    // 1. Check window.ai first
    const winAI = (window as any).ai;
    if (!winAI) {
      return { available: false, status: "unavailable", error: "window.ai is not defined. Ensure you are on Chrome 127+ with Gemini Nano enabled." };
    }

    // 2. Check languageModel namespace
    const lm = winAI.languageModel || (winAI as any).assistant;
    if (!lm) {
      // Check if window.ai can be called directly
      if (typeof winAI.create === "function") {
        return { available: true, status: "available" };
      }
      return { available: false, status: "unavailable", error: "LanguageModel API is missing from window.ai." };
    }

    // 3. Query capabilities
    const capabilities = await lm.capabilities();
    if (capabilities && capabilities.available !== "no") {
      return { available: true, status: "available" };
    }

    return { 
      available: false, 
      status: "unavailable", 
      error: `Gemini Nano is not ready. Available state: ${capabilities?.available || "unknown"}` 
    };
  } catch (e: any) {
    return { available: false, status: "unavailable", error: e.message || "Failed to check Gemini Nano capabilities." };
  }
}

export async function createGeminiNanoSession(systemPrompt?: string): Promise<GeminiNanoSession> {
  const winAI = (window as any).ai;
  if (!winAI) {
    throw new Error("window.ai is not available.");
  }

  const lm = winAI.languageModel || (winAI as any).assistant || winAI;
  
  const options: any = {};
  if (systemPrompt) {
    options.systemPrompt = systemPrompt;
  }

  // Create session
  let session: any;
  if (typeof lm.create === "function") {
    session = await lm.create(options);
  } else {
    throw new Error("Unable to locate create method on LanguageModel API.");
  }

  return {
    prompt: async (text: string) => {
      try {
        const result = await session.prompt(text);
        return result;
      } catch (e: any) {
        console.error("Gemini Nano prompting error:", e);
        throw new Error(`AI prompt failed: ${e.message || e}`);
      }
    },
    destroy: () => {
      if (session && typeof session.destroy === "function") {
        session.destroy();
      }
    }
  };
}

// Prompt templates for different panels
export const prompts = {
  slowRequest: (url: string, method: string, type: string, size: string, duration: string, ttfb: string, download: string) => `
Analyze this slow network request and explain what could be causing the delay and how to fix it. Keep it under 150 words.
Request Details:
- URL: ${url}
- Method: ${method}
- Type: ${type}
- Size: ${size}
- Total Duration: ${duration}
- TTFB: ${ttfb}
- Download Phase: ${download}

Respond in concise, professional markdown list:
1. Potential Bottleneck (explain TTFB vs network latency based on timings)
2. Recommended Fixes (compression, caching, lazy loading, CDN, database indexing, etc.)
  `,

  performanceDiagnosis: (fcp: string, lcp: string, cls: string, ttfb: string, inp: string, longTasksCount: number) => `
Analyze these Core Web Vitals and generate a diagnostic summary. Highlight the primary performance issues and suggest concrete fixes. Keep it under 150 words.
Metrics:
- First Contentful Paint (FCP): ${fcp}
- Largest Contentful Paint (LCP): ${lcp}
- Cumulative Layout Shift (CLS): ${cls}
- Time to First Byte (TTFB): ${ttfb}
- Interaction to Next Paint (INP): ${inp}
- Long JS Tasks Detected: ${longTasksCount}

Structure your response:
### Analysis
[1-2 sentences on critical metrics exceeding recommended thresholds]
### Recommendations
[Bullet list of top 3 action items]
  `,

  securityRisks: (grade: string, score: number, insecureHeaders: string[], cookiesCount: number, exposedSecretsCount: number) => `
Analyze these security findings and explain the exposure risks. Keep it under 150 words.
Security Profile:
- Security Grade: ${grade} (Score: ${score}/100)
- Missing/Insecure Headers: ${insecureHeaders.join(", ") || "None"}
- Insecure/HTTP-only Cookie Violations: ${cookiesCount}
- Exposed Secrets (AWS keys, etc.): ${exposedSecretsCount}

Structure your response:
### Vulnerability Analysis
[Identify the most severe risk: e.g. XSS, Clickjacking, credential leaks]
### Actions
[Provide 2-3 immediate mitigations]
  `,

  accessibilityFixes: (violationCount: number, criticalViolations: string[], colorContrastCount: number) => `
Generate fix suggestions for the following accessibility violations found on the page. Keep it under 150 words.
Accessibility Audit Details:
- Total Violations: ${violationCount}
- Low Color Contrast Elements: ${colorContrastCount}
- Sample Critical Issues:
${criticalViolations.map((v, i) => `${i + 1}. ${v}`).join("\n")}

Respond with:
### Critical Remediations
[Give concrete, code-level examples of how to fix these violations, e.g., adding labels, fixing contrast color codes, or alt tags]
  `,

  pageHealthSummary: (perf: number, acc: number, bp: number, seo: number) => `
You are DevTools Pro AI. Give a quick, punchy "Page Health" summary based on these audit scores (0-100 scale). Keep it under 100 words.
Scores:
- Performance: ${perf}/100
- Accessibility: ${acc}/100
- Best Practices: ${bp}/100
- SEO: ${seo}/100

Format:
**Overview:** [One-sentence health status]
**Key Priority:** [Which area to fix first and what needs immediate attention]
  `
};
export {}
