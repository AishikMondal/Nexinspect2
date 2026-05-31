import type { NetworkRequest } from "../types/network";

export interface AuditResultItem {
  id: string;
  title: string;
  description: string;
  score: number; // 0, 0.5, or 1
  displayValue: string;
  category: "performance" | "accessibility" | "best-practices" | "seo";
  recommendation: string;
}

export interface AuditReport {
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  items: AuditResultItem[];
}

export function runPerformanceAudit(
  vitals: {
    fcp?: number;
    lcp?: number;
    cls?: number;
    ttfb?: number;
    inp?: number;
  },
  accessibilityIssues: any[],
  securityIssues: any[],
  structureIssues: any[],
  domMetrics: {
    totalDOMNodes: number;
    inlineScripts: number;
    externalScripts: number;
    stylesheets: number;
    title: string;
    metaDescription: string;
    hasH1: boolean;
  },
  networkRequests: NetworkRequest[]
): AuditReport {
  const items: AuditResultItem[] = [];

  // ==================== 1. PERFORMANCE AUDITS ====================
  let perfPoints = 0;
  let perfCount = 0;

  // LCP
  if (vitals.lcp !== undefined && vitals.lcp > 0) {
    perfCount++;
    const score = vitals.lcp <= 2500 ? 1 : vitals.lcp <= 4000 ? 0.5 : 0;
    perfPoints += score * 100;
    items.push({
      id: "lcp",
      title: "Largest Contentful Paint (LCP)",
      description: "LCP measures when the main content of a page has likely loaded.",
      score,
      displayValue: `${(vitals.lcp / 1000).toFixed(2)}s`,
      category: "performance",
      recommendation: score === 1 ? "Excellent loading performance." : "Optimize image loading, remove render-blocking resources, or improve server response times.",
    });
  }

  // FCP
  if (vitals.fcp !== undefined && vitals.fcp > 0) {
    perfCount++;
    const score = vitals.fcp <= 1800 ? 1 : vitals.fcp <= 3000 ? 0.5 : 0;
    perfPoints += score * 100;
    items.push({
      id: "fcp",
      title: "First Contentful Paint (FCP)",
      description: "FCP marks the time at which the first text or image is painted.",
      score,
      displayValue: `${(vitals.fcp / 1000).toFixed(2)}s`,
      category: "performance",
      recommendation: score === 1 ? "Fast initial paint." : "Reduce render-blocking CSS/JS, optimize web font loading, and compress resources.",
    });
  }

  // CLS
  if (vitals.cls !== undefined) {
    perfCount++;
    const score = vitals.cls <= 0.1 ? 1 : vitals.cls <= 0.25 ? 0.5 : 0;
    perfPoints += score * 100;
    items.push({
      id: "cls",
      title: "Cumulative Layout Shift (CLS)",
      description: "CLS measures the visual stability of a page during load.",
      score,
      displayValue: vitals.cls.toFixed(3),
      category: "performance",
      recommendation: score === 1 ? "Stable visual layout." : "Ensure all images and embeds have explicit width/height dimensions. Avoid inserting dynamic content above existing text.",
    });
  }

  // TTFB
  if (vitals.ttfb !== undefined && vitals.ttfb > 0) {
    perfCount++;
    const score = vitals.ttfb <= 800 ? 1 : vitals.ttfb <= 1800 ? 0.5 : 0;
    perfPoints += score * 100;
    items.push({
      id: "ttfb",
      title: "Time to First Byte (TTFB)",
      description: "TTFB measures the delay between requesting a page and the start of the response.",
      score,
      displayValue: `${vitals.ttfb}ms`,
      category: "performance",
      recommendation: score === 1 ? "Fast server response." : "Optimize backend operations, database queries, and leverage CDN caching.",
    });
  }

  // DOM Size
  const domScore = domMetrics.totalDOMNodes <= 800 ? 1 : domMetrics.totalDOMNodes <= 1500 ? 0.5 : 0;
  items.push({
    id: "dom-size",
    title: "DOM Node Count",
    description: "A large DOM tree increases memory usage and layout cost.",
    score: domScore,
    displayValue: `${domMetrics.totalDOMNodes} nodes`,
    category: "performance",
    recommendation: domScore === 1 ? "Optimal DOM size." : "Simplify page layouts, remove unnecessary wrapper elements, and paginate or lazy-load long lists.",
  });

  // Calculate overall performance score
  let performanceScore = perfCount > 0 ? Math.round(perfPoints / perfCount) : 100;
  // Apply a small deduction for very large DOM sizes
  if (domScore === 0.5) performanceScore = Math.max(0, performanceScore - 5);
  if (domScore === 0) performanceScore = Math.max(0, performanceScore - 15);

  // ==================== 2. ACCESSIBILITY AUDITS ====================
  let accessibilityScore = 100;
  const criticalAcc = accessibilityIssues.filter(x => x.impact === "critical").length;
  const seriousAcc = accessibilityIssues.filter(x => x.impact === "serious").length;
  const otherAcc = accessibilityIssues.length - criticalAcc - seriousAcc;

  // Deduct points
  accessibilityScore -= criticalAcc * 15;
  accessibilityScore -= seriousAcc * 8;
  accessibilityScore -= otherAcc * 3;
  accessibilityScore = Math.max(0, accessibilityScore);

  items.push({
    id: "image-alt",
    title: "Image Alt Attributes",
    description: "Screen readers require alternative text to describe image content.",
    score: criticalAcc === 0 ? 1 : 0,
    displayValue: criticalAcc === 0 ? "All images have Alt text" : `${criticalAcc} images missing Alt text`,
    category: "accessibility",
    recommendation: criticalAcc === 0 ? "Images are fully described." : "Add descriptive, non-empty alt=\"...\" attributes to all meaningful <img> tags.",
  });

  items.push({
    id: "color-contrast",
    title: "Text Color Contrast",
    description: "Text must have sufficient contrast against background colors for readability.",
    score: otherAcc === 0 ? 1 : otherAcc <= 3 ? 0.5 : 0,
    displayValue: otherAcc === 0 ? "Compliant contrast" : `${otherAcc} low contrast elements`,
    category: "accessibility",
    recommendation: otherAcc === 0 ? "Good readability contrast." : "Adjust text and background colors to meet WCAG AA standards (minimum 4.5:1 ratio for normal text).",
  });

  // ==================== 3. BEST PRACTICES AUDITS ====================
  let bestPracticesScore = 100;
  
  // HTTPS
  const isHttps = (() => {
    try { return window.location.protocol === "https:"; } catch { return false; }
  })();
  if (!isHttps) {
    bestPracticesScore -= 30;
  }
  items.push({
    id: "https",
    title: "Secure HTTPS Connection",
    description: "Ensure all data is encrypted during transit via SSL/TLS.",
    score: isHttps ? 1 : 0,
    displayValue: isHttps ? "Using HTTPS" : "Insecure HTTP",
    category: "best-practices",
    recommendation: isHttps ? "Connection is secure." : "Set up an SSL certificate and redirect all HTTP traffic to HTTPS.",
  });

  // Exposed API Keys
  const exposedCount = securityIssues.length;
  if (exposedCount > 0) {
    bestPracticesScore -= Math.min(40, exposedCount * 15);
  }
  items.push({
    id: "exposed-credentials",
    title: "No Exposed Credentials",
    description: "Exposing private API keys or tokens in clients risks security breaches.",
    score: exposedCount === 0 ? 1 : 0,
    displayValue: exposedCount === 0 ? "No leaked secrets" : `${exposedCount} secrets leaked`,
    category: "best-practices",
    recommendation: exposedCount === 0 ? "Secure source code." : "Immediately revoke any leaked tokens and move credential loading to a secure backend/proxy layer.",
  });

  // Trackers
  const trackerCount = networkRequests.filter(r => r.url.includes("analytics") || r.url.includes("telemetry") || r.url.includes("tracker")).length;
  if (trackerCount > 5) {
    bestPracticesScore -= 10;
  }
  items.push({
    id: "third-party-trackers",
    title: "Third-Party Trackers",
    description: "Excessive tracking scripts degrade page performance and raise privacy concerns.",
    score: trackerCount <= 5 ? 1 : trackerCount <= 10 ? 0.5 : 0,
    displayValue: `${trackerCount} analytics/tracker calls`,
    category: "best-practices",
    recommendation: trackerCount <= 5 ? "Minimal third-party scripts." : "Audit telemetry systems, combine tracking payloads, or defer script loading to speed up execution.",
  });

  bestPracticesScore = Math.max(0, bestPracticesScore);

  // ==================== 4. SEO AUDITS ====================
  let seoScore = 100;

  // Title tag
  const titlePresent = !!domMetrics.title && domMetrics.title.trim().length > 0;
  if (!titlePresent) seoScore -= 25;
  items.push({
    id: "seo-title",
    title: "Page Title Tag",
    description: "Title tags are crucial for search indexing and user browser tabs.",
    score: titlePresent ? 1 : 0,
    displayValue: titlePresent ? "Title tag present" : "Missing Title tag",
    category: "seo",
    recommendation: titlePresent ? `Title: "${domMetrics.title}"` : "Add a descriptive, concise <title> tag inside the <head> element.",
  });

  // Meta description
  const metaDescPresent = !!domMetrics.metaDescription && domMetrics.metaDescription.trim().length > 0;
  if (!metaDescPresent) seoScore -= 25;
  items.push({
    id: "seo-meta-desc",
    title: "Meta Description",
    description: "Meta descriptions are shown in search engine snippets below the title.",
    score: metaDescPresent ? 1 : 0,
    displayValue: metaDescPresent ? "Meta description present" : "Missing Meta description",
    category: "seo",
    recommendation: metaDescPresent ? "Description configured." : "Add a <meta name=\"description\" content=\"...\"> tag containing 140-160 characters describing the page.",
  });

  // Heading hierarchy
  const skippedHeadingsCount = structureIssues.filter(x => x.id === "heading-skipped").length;
  if (skippedHeadingsCount > 0) seoScore -= 15;
  items.push({
    id: "seo-headings",
    title: "Heading Ordering",
    description: "Search engines and screen readers rely on ordered H1-H6 structures to index semantics.",
    score: skippedHeadingsCount === 0 ? 1 : 0.5,
    displayValue: skippedHeadingsCount === 0 ? "Ordered structure" : `${skippedHeadingsCount} heading skips`,
    category: "seo",
    recommendation: skippedHeadingsCount === 0 ? "Semantically correct headings." : "Re-order heading tags sequentially (e.g. do not skip directly from an H1 to an H3).",
  });

  // H1 tag presence
  if (!domMetrics.hasH1) seoScore -= 15;
  items.push({
    id: "seo-h1-presence",
    title: "Single H1 Title",
    description: "A page should contain exactly one main H1 heading to denote the primary topic.",
    score: domMetrics.hasH1 ? 1 : 0,
    displayValue: domMetrics.hasH1 ? "H1 present" : "No H1 heading found",
    category: "seo",
    recommendation: domMetrics.hasH1 ? "Main title found." : "Add a single <h1> heading displaying the main title of the page.",
  });

  seoScore = Math.max(0, seoScore);

  return {
    performanceScore,
    accessibilityScore,
    bestPracticesScore,
    seoScore,
    items,
  };
}
