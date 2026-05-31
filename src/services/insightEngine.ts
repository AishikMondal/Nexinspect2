import type { NetworkRequest } from "../types/network";
import type { PerformanceData } from "../types/performance";
import type { SecurityReport } from "../types/security";
import { formatBytes } from "./networkCapture";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface WhyInsight {
  metric: string;
  value: string;
  rating: "good" | "warning" | "critical";
  why: string;
  rootCauses: string[];
  uxImpact: { level: "low" | "medium" | "high"; description: string };
  fix?: string; // code or actionable suggestion
}

export interface NetworkIntelligence {
  duplicates: { url: string; count: number; wastedBytes: number }[];
  blockingRequests: { url: string; size: number; type: string }[];
  largeChunks: { url: string; size: number; note: string }[];
  wastedDownloads: { url: string; size: number; reason: string }[];
  thirdPartyRisk: { domain: string; count: number; risk: "low" | "medium" | "high" }[];
  summary: string[];
}

export interface BehavioralData {
  deadClicks: { x: number; y: number; target: string; count: number }[];
  rageClicks: { x: number; y: number; target: string; timestamp: number }[];
  scrollHesitations: number;
  inputFrustrations: { field: string; backspaceCount: number }[];
}

// ─────────────────────────────────────────────
// Performance WHY + Root Cause Engine
// ─────────────────────────────────────────────

export function buildPerformanceInsights(
  data: PerformanceData,
  requests: NetworkRequest[]
): WhyInsight[] {
  const insights: WhyInsight[] = [];

  const { vitals, longTasks, renderBlocking, unusedCode } = data;

  // TTFB
  if (vitals.TTFB) {
    const v = vitals.TTFB.value;
    const rootCauses: string[] = [];
    if (v > 1800) rootCauses.push("Server response is slow — possible backend bottleneck or cold start");
    if (v > 800) rootCauses.push("DNS resolution or TLS handshake adding latency");
    const docRequest = requests.find((r) => r.type === "document");
    if (docRequest && docRequest.size > 50000)
      rootCauses.push(`Main document is ${formatBytes(docRequest.size)} — consider server-side compression`);
    if (rootCauses.length === 0) rootCauses.push("Backend responding quickly — no server bottleneck detected");

    insights.push({
      metric: "TTFB",
      value: `${v}ms`,
      rating: vitals.TTFB.rating as any,
      why: "Time to First Byte measures how long the browser waits before receiving the first byte of a response. It reflects server speed, network latency, and CDN effectiveness.",
      rootCauses,
      uxImpact: {
        level: v > 1800 ? "high" : v > 800 ? "medium" : "low",
        description: v > 1800
          ? "Users experience a blank/loading screen for extended time — high bounce risk"
          : v > 800
          ? "Perceived slowness on load — users may question reliability"
          : "Server response is fast — no perceived delay at connection",
      },
      fix: v > 800
        ? `// Add Cache-Control to express response\nres.setHeader('Cache-Control', 'public, max-age=31536000');\n\n// Or use a CDN edge — e.g., Cloudflare Workers:\nexport default {\n  fetch: (req) => fetch(req) // cached at edge\n};`
        : undefined,
    });
  }

  // LCP
  if (vitals.LCP) {
    const v = vitals.LCP.value;
    const rootCauses: string[] = [];
    const largeImages = requests.filter((r) => r.type === "image" && r.size > 100000);
    if (largeImages.length > 0)
      rootCauses.push(`${largeImages.length} unoptimized image(s) detected (${formatBytes(largeImages[0].size)} largest)`);
    if (renderBlocking.length > 0)
      rootCauses.push(`${renderBlocking.length} render-blocking resource(s) delaying initial render`);
    if (longTasks.length > 0)
      rootCauses.push(`${longTasks.length} long JS task(s) blocking the main thread`);
    if (rootCauses.length === 0) rootCauses.push("LCP element loaded efficiently — no obvious bottleneck");

    insights.push({
      metric: "LCP",
      value: `${v}ms`,
      rating: vitals.LCP.rating as any,
      why: "Largest Contentful Paint marks when the biggest visible element (hero image, heading) renders. It's the best proxy for 'when does the page feel loaded'.",
      rootCauses,
      uxImpact: {
        level: v > 4000 ? "high" : v > 2500 ? "medium" : "low",
        description: v > 4000
          ? "Users see a blank or incomplete page for too long — critical abandonment risk"
          : v > 2500
          ? "Page loads but feels sluggish — conversion impact is measurable"
          : "Page paints quickly — excellent perceived performance",
      },
      fix: v > 2500
        ? `<!-- Add width/height + lazy loading + webp -->
<img
  src="hero.webp"
  width={1200}
  height={630}
  loading="eager"
  fetchpriority="high"
  decoding="async"
  alt="Hero image"
/>`
        : undefined,
    });
  }

  // CLS
  if (vitals.CLS) {
    const v = vitals.CLS.value;
    const rootCauses: string[] = [];
    const unSizedImages = requests.filter((r) => r.type === "image");
    if (unSizedImages.length > 0)
      rootCauses.push("Images or embeds likely missing explicit width/height dimensions");
    if (data.layoutShifts.length > 0)
      rootCauses.push(`${data.layoutShifts.length} layout shift event(s) detected — possibly ads or dynamic content`);
    if (rootCauses.length === 0) rootCauses.push("Layout is stable — no significant shifting detected");

    insights.push({
      metric: "CLS",
      value: `${v.toFixed(3)}`,
      rating: vitals.CLS.rating as any,
      why: "Cumulative Layout Shift measures how much the page jumps around during load. Every unexpected shift frustrates users and breaks their reading flow.",
      rootCauses,
      uxImpact: {
        level: v > 0.25 ? "high" : v > 0.1 ? "medium" : "low",
        description: v > 0.25
          ? "Users experience major layout instability — buttons shift, text reflows, accidental taps likely"
          : v > 0.1
          ? "Noticeable page jitter — disrupts reading and form interactions"
          : "Layout is visually stable — great user experience",
      },
      fix: v > 0.1
        ? `/* Reserve space for dynamic content */
.banner-slot {
  min-height: 90px; /* reserve ad space */
  aspect-ratio: 728/90;
}

/* Always define image dimensions */
img { width: 100%; height: auto; aspect-ratio: 16/9; }`
        : undefined,
    });
  }

  // INP
  if (vitals.INP) {
    const v = vitals.INP.value;
    const rootCauses: string[] = [];
    if (longTasks.length > 0) rootCauses.push(`${longTasks.length} long JS task(s) block the main thread during interaction`);
    const heavyJS = requests.filter((r) => r.type === "script" && r.size > 200000);
    if (heavyJS.length > 0) rootCauses.push(`${heavyJS.length} heavy JS bundle(s) parsed synchronously`);
    if (rootCauses.length === 0) rootCauses.push("Interactions respond quickly — main thread is not blocked");

    insights.push({
      metric: "INP",
      value: `${v}ms`,
      rating: vitals.INP.rating as any,
      why: "Interaction to Next Paint measures how quickly the page responds to clicks, taps, and key presses. It directly reflects how 'snappy' the UI feels.",
      rootCauses,
      uxImpact: {
        level: v > 500 ? "high" : v > 200 ? "medium" : "low",
        description: v > 500
          ? "Interactions feel broken or laggy — users may think buttons are non-functional"
          : v > 200
          ? "Slight input delay noticeable — degrades perceived responsiveness"
          : "UI feels instant and responsive — excellent interactivity",
      },
      fix: v > 200
        ? `// Defer non-critical work with scheduler
import { unstable_scheduleCallback } from 'scheduler';

// Or use React.memo + useTransition for heavy renders:
const [isPending, startTransition] = useTransition();
startTransition(() => {
  setComplexState(newValue); // doesn't block UI
});`
        : undefined,
    });
  }

  return insights;
}

// ─────────────────────────────────────────────
// Network Intelligence Engine
// ─────────────────────────────────────────────

export function buildNetworkIntelligence(requests: NetworkRequest[]): NetworkIntelligence {
  // Duplicate requests
  const urlCounts = new Map<string, { count: number; size: number }>();
  requests.forEach((r) => {
    const key = r.url.split("?")[0]; // ignore query params
    const existing = urlCounts.get(key);
    if (existing) {
      existing.count++;
      existing.size += r.size;
    } else {
      urlCounts.set(key, { count: 1, size: r.size });
    }
  });

  const duplicates = Array.from(urlCounts.entries())
    .filter(([, v]) => v.count > 1)
    .map(([url, v]) => ({
      url,
      count: v.count,
      wastedBytes: v.size - (v.size / v.count), // all extra copies are waste
    }))
    .sort((a, b) => b.wastedBytes - a.wastedBytes);

  // Blocking requests (scripts/stylesheets > 50KB)
  const blockingRequests = requests
    .filter((r) => (r.type === "script" || r.type === "stylesheet") && r.size > 50000)
    .map((r) => ({ url: r.url, size: r.size, type: r.type }))
    .sort((a, b) => b.size - a.size);

  // Large JS chunks > 200KB
  const largeChunks = requests
    .filter((r) => r.type === "script" && r.size > 200000)
    .map((r) => ({
      url: r.url,
      size: r.size,
      note: r.size > 500000
        ? "Critically large — likely needs code splitting"
        : "Large chunk — consider lazy loading",
    }));

  // Wasted downloads (images > 500KB, or failed requests)
  const wastedDownloads = [
    ...requests
      .filter((r) => r.type === "image" && r.size > 500000)
      .map((r) => ({ url: r.url, size: r.size, reason: "Oversized image — serve WebP + responsive sizes" })),
    ...requests
      .filter((r) => r.status >= 400)
      .map((r) => ({ url: r.url, size: r.size, reason: `HTTP ${r.status} error — failed request consuming time` })),
  ];

  // Third-party risk scoring
  const thirdPartyDomains = new Map<string, number>();
  requests.forEach((r) => {
    try {
      const domain = new URL(r.url).hostname;
      const currentDomain = typeof window !== "undefined" ? window.location.hostname : "";
      if (!domain.includes(currentDomain) && currentDomain !== "") {
        thirdPartyDomains.set(domain, (thirdPartyDomains.get(domain) || 0) + 1);
      }
    } catch {}
  });

  const knownTrackers = ["google-analytics", "doubleclick", "facebook.net", "hotjar", "segment", "mixpanel", "amplitude"];
  const thirdPartyRisk = Array.from(thirdPartyDomains.entries()).map(([domain, count]) => {
    const isTracker = knownTrackers.some((t) => domain.includes(t));
    return {
      domain,
      count,
      risk: isTracker ? "high" as const : count > 10 ? "medium" as const : "low" as const,
    };
  }).sort((a, b) => b.count - a.count).slice(0, 10);

  // Smart summaries
  const summary: string[] = [];
  if (duplicates.length > 0)
    summary.push(`⚠ ${duplicates.length} duplicate request(s) detected — wasting ${formatBytes(duplicates.reduce((a, d) => a + d.wastedBytes, 0))}`);
  if (largeChunks.length > 0)
    summary.push(`⚠ ${largeChunks.length} JS chunk(s) over 200KB loaded — possible over-bundling`);
  if (blockingRequests.length > 0)
    summary.push(`⚠ ${blockingRequests.length} render-blocking resource(s) delaying paint`);
  if (wastedDownloads.filter((w) => w.reason.includes("Oversized")).length > 0)
    summary.push(`⚠ Oversized images detected — serve WebP with srcset`);
  const trackers = thirdPartyRisk.filter((t) => t.risk === "high");
  if (trackers.length > 0)
    summary.push(`⚠ ${trackers.length} known tracker(s) detected — privacy risk`);

  return { duplicates, blockingRequests, largeChunks, wastedDownloads, thirdPartyRisk, summary };
}

// ─────────────────────────────────────────────
// Accessibility Fix Suggestions
// ─────────────────────────────────────────────

export interface AccessibilityFix {
  id: string;
  impact: string;
  message: string;
  target: string;
  element: string;
  wcagCriteria: string;
  whyItMatters: string;
  howItAffectsUsers: string;
  fixCode: string;
}

export function getAccessibilityFix(
  violationId: string,
  element: string,
  target: string,
  contrastRatio?: number
): AccessibilityFix {
  const targetSnippet = target.length > 60 ? target.substring(0, 60) + "…" : target;

  const fixes: Record<string, Omit<AccessibilityFix, "id" | "target" | "element" | "impact" | "message">> = {
    "alt-missing": {
      wcagCriteria: "WCAG 1.1.1 Non-text Content (Level A)",
      whyItMatters: `This <${element}> element on the page has no alt attribute. Screen readers will announce it as 'image' with no context, leaving blind users unable to determine what it depicts.`,
      howItAffectsUsers: `VoiceOver, NVDA and TalkBack users will skip or misinterpret this image. SEO is also impacted — search engines cannot index unlabeled images. Element: ${targetSnippet}`,
      fixCode: `<!-- Add a descriptive alt to this specific element -->
<!-- Original: ${targetSnippet} -->

<!-- If the image conveys information: -->
<img src="..." alt="Describe what the image shows" />

<!-- If purely decorative: -->
<img src="..." alt="" role="presentation" />`,
    },
    "label-missing": {
      wcagCriteria: "WCAG 3.3.2 Labels or Instructions (Level A)",
      whyItMatters: `This ${element} form control is missing an accessible label. Screen readers will announce it as 'edit text' or 'combo box' with no indication of what data is expected.`,
      howItAffectsUsers: `Screen reader users cannot identify this field's purpose. Voice Control users (Dragon NaturallySpeaking) cannot activate it by name. Element: ${targetSnippet}`,
      fixCode: `<!-- Fix this specific unlabelled ${element} -->
<!-- Original: ${targetSnippet} -->

<!-- Option 1: Use a visible label linked via for/id -->
<label for="field-id">Field Name</label>
<${element} id="field-id" />

<!-- Option 2: aria-label for icon-only or compact UI -->
<${element} aria-label="Descriptive field name" />`,
    },
    "contrast-low": {
      wcagCriteria: "WCAG 1.4.3 Contrast (Minimum) (Level AA)",
      whyItMatters: `This ${element} element has a contrast ratio of ${contrastRatio != null ? contrastRatio.toFixed(2) + ":1" : "below minimum"} — the WCAG AA minimum is 4.5:1 for normal text and 3:1 for large text. At this level, text is difficult or impossible to read in poor conditions.`,
      howItAffectsUsers: `Users with low vision, color blindness (~8% of men), cataracts, or those in bright sunlight cannot comfortably read this text. Element: ${targetSnippet}`,
      fixCode: `/* Fix contrast for this ${element} element */
/* Measured ratio: ${contrastRatio != null ? contrastRatio.toFixed(2) + ":1" : "unknown"} — minimum required: 4.5:1 */
/* Check at: https://webaim.org/resources/contrastchecker/ */

/* For light backgrounds — use near-black text: */
${element} { color: #1a1a2e; } /* ~19:1 on white */

/* For dark backgrounds — use near-white text: */
${element} { color: #e2e8f0; } /* ~13:1 on #0f172a */`,
    },
    "button-empty": {
      wcagCriteria: "WCAG 4.1.2 Name, Role, Value (Level A)",
      whyItMatters: `This <${element}> has no accessible name — no visible text, aria-label, title, or aria-labelledby. Screen readers will only announce it as 'button', leaving users unable to determine its action.`,
      howItAffectsUsers: `Blind users cannot determine what this button does. Keyboard-only users tabbing through controls will hit this button with no label. Element: ${targetSnippet}`,
      fixCode: `<!-- Fix this unlabeled ${element} -->
<!-- Original: ${targetSnippet} -->

<!-- Option 1: Add visible label text -->
<button>Submit form</button>

<!-- Option 2: Icon button — use aria-label -->
<button aria-label="Close dialog">
  <svg aria-hidden="true">...</svg>
</button>`,
    },
    "link-empty": {
      wcagCriteria: "WCAG 2.4.4 Link Purpose (Level A)",
      whyItMatters: `This <a> link has no accessible text — no inner text, aria-label, or title. Screen readers announce it as 'link' with no destination context.`,
      howItAffectsUsers: `Blind users browsing a list of 'link, link, link' cannot determine destinations or make navigation choices. Element: ${targetSnippet}`,
      fixCode: `<!-- Fix this empty link -->
<!-- Original: ${targetSnippet} -->

<!-- Option 1: Add descriptive link text -->
<a href="/products">View all products</a>

<!-- Option 2: Icon link — use aria-label -->
<a href="/settings" aria-label="Account settings">
  <svg aria-hidden="true">...</svg>
</a>`,
    },
    "heading-skipped": {
      wcagCriteria: "WCAG 1.3.1 Info and Relationships (Level A)",
      whyItMatters: `This heading jumps levels (e.g. H1→H3), breaking the logical document outline. Screen reader users rely on heading hierarchy to understand and navigate page structure.`,
      howItAffectsUsers: `Keyboard users press H to jump between headings. A skipped level creates a false gap — users may think they've missed content. Element: ${targetSnippet}`,
      fixCode: `<!-- Fix the heading level jump -->
<!-- Original: ${targetSnippet} -->

<!-- Use sequential levels — never skip -->
<h1>Page Title</h1>
<h2>Main Section</h2>
<h3>Sub-section</h3>`,
    },
  };

  const fixData = fixes[violationId] || {
    wcagCriteria: "WCAG 2.1",
    whyItMatters: `This ${element} element has an accessibility violation (rule: ${violationId}) that may block assistive technology users.`,
    howItAffectsUsers: "Users relying on screen readers, keyboard navigation, or other assistive technologies may be unable to access this content.",
    fixCode: `<!-- Review WCAG 2.1 guidelines for rule: ${violationId} -->
<!-- Affected element: ${targetSnippet} -->
<!-- https://www.w3.org/WAI/WCAG21/quickref/ -->`,
  };

  return {
    id: violationId,
    target,
    element,
    impact: "",
    message: "",
    ...fixData,
  };
}
