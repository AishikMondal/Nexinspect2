import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true,
  run_at: "document_idle",
};

// ─────────────────────────────────────────────
// CORE WEB VITALS & PERFORMANCE
// ─────────────────────────────────────────────
let fcp = 0, lcp = 0, cls = 0, ttfb = 0, inp = 0;
const longTasks: any[] = [];
const layoutShifts: any[] = [];

try {
  const paintObs = new PerformanceObserver((list) => {
    list.getEntries().forEach((e) => { if (e.name === "first-contentful-paint") fcp = Math.round(e.startTime); });
  });
  paintObs.observe({ type: "paint", buffered: true });

  const lcpObs = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    lcp = Math.round(entries[entries.length - 1].startTime);
  });
  lcpObs.observe({ type: "largest-contentful-paint", buffered: true });

  const clsObs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as any[]) {
      if (!entry.hadRecentInput) {
        cls += entry.value;
        layoutShifts.push({
          id: Math.random().toString(36).substring(2),
          startTime: Math.round(entry.startTime),
          score: entry.value,
          sources: entry.sources?.map((s: any) => s.node?.nodeName || "element") || [],
        });
      }
    }
  });
  clsObs.observe({ type: "layout-shift", buffered: true });

  const ltObs = new PerformanceObserver((list) => {
    list.getEntries().forEach((e) => {
      longTasks.push({ id: Math.random().toString(36).substring(2), startTime: Math.round(e.startTime), duration: Math.round(e.duration), attribution: e.attribution?.[0]?.name || "Script" });
    });
  });
  ltObs.observe({ type: "longtask", buffered: true });

  const inpObs = new PerformanceObserver((list) => {
    list.getEntries().forEach((e) => { if (e.duration > inp) inp = Math.round(e.duration); });
  });
  inpObs.observe({ type: "event", buffered: true });

  const navEntries = performance.getEntriesByType("navigation");
  if (navEntries.length > 0) {
    const nav = navEntries[0] as PerformanceNavigationTiming;
    ttfb = Math.round(nav.responseStart - nav.requestStart);
  }
} catch (e) {
  console.warn("PerformanceObserver:", e);
}

// ─────────────────────────────────────────────
// BEHAVIORAL INTELLIGENCE
// ─────────────────────────────────────────────
interface ClickRecord { x: number; y: number; target: string; timestamp: number; }

const clickHistory: ClickRecord[] = [];
const inputEdits: Map<string, number> = new Map(); // field identifier → backspace count
let scrollPauses = 0;
let lastScrollY = 0;
let scrollPauseTimer: any = null;

// Track all clicks
document.addEventListener("click", (e) => {
  const target = e.target as Element;
  const tag = target?.tagName?.toLowerCase() || "unknown";
  const id = target?.id ? `#${target.id}` : "";
  const cls_ = target?.className && typeof target.className === "string" ? `.${target.className.split(" ")[0]}` : "";
  clickHistory.push({ x: e.clientX, y: e.clientY, target: `${tag}${id}${cls_}`, timestamp: Date.now() });
  if (clickHistory.length > 200) clickHistory.shift();
}, { passive: true });

// Track scroll hesitation (stops > 500ms mid-scroll)
window.addEventListener("scroll", () => {
  const currentY = window.scrollY;
  if (Math.abs(currentY - lastScrollY) > 50) {
    lastScrollY = currentY;
    if (scrollPauseTimer) clearTimeout(scrollPauseTimer);
    scrollPauseTimer = setTimeout(() => { scrollPauses++; }, 500);
  }
}, { passive: true });

// Track input frustration (backspace count per field)
document.addEventListener("keydown", (e) => {
  if (e.key === "Backspace") {
    const target = e.target as HTMLInputElement;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
      const key = target.id || target.name || target.placeholder || "field";
      inputEdits.set(key, (inputEdits.get(key) || 0) + 1);
    }
  }
}, { passive: true });

// ─────────────────────────────────────────────
// ACCESSIBILITY ANALYSIS
// ─────────────────────────────────────────────
function getLuminance(r: number, g: number, b: number): number {
  return [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
}

function getContrastRatio(c1: number[], c2: number[]): number {
  const l1 = getLuminance(c1[0], c1[1], c1[2]);
  const l2 = getLuminance(c2[0], c2[1], c2[2]);
  return parseFloat(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2));
}

function parseRgb(s: string): number[] | null {
  const m = s.match(/\d+/g);
  return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : null;
}

// ─────────────────────────────────────────────
// SECURITY ANALYSIS
// ─────────────────────────────────────────────
function runSecurityAnalysis(): any[] {
  const issues: any[] = [];

  // 1. Exposed API keys / secrets in page source
  const credentialPatterns = [
    { type: "AWS API Key", regex: /AKIA[0-9A-Z]{16}/g, severity: "critical" },
    { type: "Firebase API Key", regex: /AIzaSy[0-9A-Za-z\-_]{35}/g, severity: "critical" },
    { type: "GitHub PAT", regex: /ghp_[0-9a-zA-Z]{36}/g, severity: "critical" },
    { type: "Stripe Secret Key", regex: /sk_live_[0-9a-zA-Z]{24}/g, severity: "critical" },
    { type: "JWT Token in HTML", regex: /eyJhbGciOi[0-9a-zA-Z\-_]+\.[0-9a-zA-Z\-_]+/g, severity: "high" },
    { type: "SendGrid API Key", regex: /SG\.[0-9A-Za-z\-_]{22}\.[0-9A-Za-z\-_]{43}/g, severity: "critical" },
    { type: "Generic Private Key", regex: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g, severity: "critical" },
  ];
  const bodyText = document.documentElement.outerHTML;
  credentialPatterns.forEach(({ type, regex, severity }) => {
    regex.lastIndex = 0;
    let m; let count = 0;
    while ((m = regex.exec(bodyText)) !== null && count < 2) {
      count++;
      const masked = m[0].substring(0, 6) + "…" + m[0].substring(m[0].length - 4);
      issues.push({ type: "exposed-key", subtype: type, severity, value: masked, location: "HTML source" });
    }
  });

  // 2. Dangerous localStorage / sessionStorage usage
  try {
    const dangerousStorageKeys = ["token", "jwt", "password", "secret", "api_key", "apikey", "auth", "session", "credential"];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (dangerousStorageKeys.some((k) => key.toLowerCase().includes(k))) {
        const val = localStorage.getItem(key) || "";
        const preview = val.substring(0, 20) + (val.length > 20 ? "…" : "");
        issues.push({ type: "storage-risk", subtype: "Sensitive data in localStorage", severity: "high", value: `Key: "${key}" = "${preview}"`, location: "localStorage" });
      }
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)!;
      if (dangerousStorageKeys.some((k) => key.toLowerCase().includes(k))) {
        const val = sessionStorage.getItem(key) || "";
        const preview = val.substring(0, 20) + (val.length > 20 ? "…" : "");
        issues.push({ type: "storage-risk", subtype: "Sensitive data in sessionStorage", severity: "medium", value: `Key: "${key}" = "${preview}"`, location: "sessionStorage" });
      }
    }
  } catch {}

  // 3. Unsafe innerHTML usage (detect via script analysis)
  const scripts = document.querySelectorAll("script:not([src])");
  scripts.forEach((s) => {
    if (s.textContent?.includes("innerHTML") || s.textContent?.includes("document.write")) {
      issues.push({ type: "unsafe-dom", subtype: "Unsafe DOM manipulation detected", severity: "medium", value: "innerHTML or document.write found in inline script", location: "Inline script" });
    }
  });

  // 4. Fingerprinting / tracker detection
  const trackingScripts = [
    { domain: "google-analytics.com", name: "Google Analytics" },
    { domain: "googletagmanager.com", name: "Google Tag Manager" },
    { domain: "doubleclick.net", name: "DoubleClick (Google Ads)" },
    { domain: "facebook.net", name: "Facebook Pixel" },
    { domain: "connect.facebook.net", name: "Facebook SDK" },
    { domain: "hotjar.com", name: "Hotjar (session recording)" },
    { domain: "fullstory.com", name: "FullStory (session recording)" },
    { domain: "mixpanel.com", name: "Mixpanel" },
    { domain: "segment.com", name: "Segment" },
    { domain: "amplitude.com", name: "Amplitude" },
    { domain: "clarity.ms", name: "Microsoft Clarity (heatmaps)" },
    { domain: "smartlook.com", name: "Smartlook (session recording)" },
  ];
  document.querySelectorAll("script[src]").forEach((s) => {
    const src = s.getAttribute("src") || "";
    trackingScripts.forEach((tracker) => {
      if (src.includes(tracker.domain)) {
        issues.push({ type: "tracker", subtype: tracker.name, severity: "info", value: src.substring(0, 80), location: "Script src" });
      }
    });
  });

  return issues;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Returns true if an element is visually hidden / excluded from the a11y tree */
function isHidden(el: Element): boolean {
  // Check aria-hidden on ancestors
  let node: Element | null = el;
  while (node && node !== document.body) {
    if (node.getAttribute("aria-hidden") === "true") return true;
    node = node.parentElement;
  }

  const style = window.getComputedStyle(el);
  if (style.display === "none") return true;
  if (style.visibility === "hidden") return true;
  if (parseFloat(style.opacity) === 0) return true;

  // Off-screen clip trick (e.g. sr-only class)
  const rect = (el as HTMLElement).getBoundingClientRect?.();
  if (rect && rect.width === 0 && rect.height === 0) return true;

  // Check ancestors for display:none
  let parent = el.parentElement;
  while (parent && parent !== document.body) {
    const ps = window.getComputedStyle(parent);
    if (ps.display === "none" || ps.visibility === "hidden") return true;
    parent = parent.parentElement;
  }

  return false;
}

/** Get the accessible name of an element following ARIA spec order */
function getAccessibleName(el: Element): string {
  // aria-labelledby takes highest priority
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const names = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim() || "").join(" ").trim();
    if (names) return names;
  }
  // aria-label
  const ariaLabel = el.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;
  // title
  const title = el.getAttribute("title")?.trim();
  if (title) return title;
  // Inner text (excluding hidden children)
  const text = (el as HTMLElement).innerText?.trim();
  if (text) return text;
  // SVG title child
  const svgTitle = el.querySelector("title")?.textContent?.trim();
  if (svgTitle) return svgTitle;
  // img child with non-empty alt
  const imgAlt = (el.querySelector("img[alt]") as HTMLImageElement)?.alt?.trim();
  if (imgAlt) return imgAlt;
  return "";
}

// ─────────────────────────────────────────────
// FULL DOM ANALYSIS
// ─────────────────────────────────────────────
function runAnalysis() {
  const accessibilityIssues: any[] = [];
  const structureIssues: any[] = [];

  // ── 1. IMAGES: missing alt attribute only (empty alt="" is valid for decorative) ──
  document.querySelectorAll("img").forEach((img) => {
    if (isHidden(img)) return;
    if (!img.hasAttribute("alt")) {
      // No alt attribute at all — a real violation
      accessibilityIssues.push({
        id: "alt-missing",
        impact: "critical",
        target: img.outerHTML.substring(0, 150),
        message: "Image has no alt attribute — screen readers announce the filename or 'image'. Fails WCAG 1.1.1.",
        element: "img",
      });
    }
    // Note: alt="" is intentionally valid per WCAG (decorative image) — not flagged
  });

  // ── 2. HEADING HIERARCHY: skip hidden headings ──
  let lastLevel = 0;
  document.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((h) => {
    if (isHidden(h)) return;
    const level = parseInt(h.tagName[1]);
    if (lastLevel > 0 && level - lastLevel > 1) {
      structureIssues.push({
        id: "heading-skipped",
        impact: "moderate",
        target: h.outerHTML.substring(0, 100),
        message: `Heading level skipped: H${lastLevel} → H${level}. Fails WCAG 1.3.1.`,
      });
    }
    lastLevel = level;
  });

  // ── 3. FORM LABELS: check visible, relevant controls only ──
  document.querySelectorAll("input, select, textarea").forEach((input) => {
    if (isHidden(input)) return;
    const type = input.getAttribute("type")?.toLowerCase();
    if (["hidden", "submit", "button", "reset", "image"].includes(type || "")) return;

    const id = input.getAttribute("id");
    let hasLabel = false;

    // Explicit label via for/id
    if (id && document.querySelector(`label[for="${id}"]`)?.textContent?.trim()) hasLabel = true;
    // Wrapped in label
    if (!hasLabel && input.closest("label")) hasLabel = true;
    // aria-label / aria-labelledby
    if (!hasLabel && input.getAttribute("aria-label")?.trim()) hasLabel = true;
    if (!hasLabel && input.getAttribute("aria-labelledby")) {
      const ids = input.getAttribute("aria-labelledby")!.split(/\s+/);
      if (ids.some((i) => document.getElementById(i)?.textContent?.trim())) hasLabel = true;
    }
    // title as fallback (valid per WCAG Technique H65)
    if (!hasLabel && input.getAttribute("title")?.trim()) hasLabel = true;
    // placeholder alone is NOT sufficient per WCAG (disappears on focus), so we don't count it

    if (!hasLabel) {
      accessibilityIssues.push({
        id: "label-missing",
        impact: "serious",
        target: input.outerHTML.substring(0, 150),
        message: `Form control ${input.tagName.toLowerCase()}${type ? ` [type=${type}]` : ""} has no accessible label. Fails WCAG 3.3.2.`,
        element: input.tagName.toLowerCase(),
      });
    }
  });

  // ── 4. BUTTONS: use full accessible-name algorithm ──
  document.querySelectorAll("button, [role='button']").forEach((btn) => {
    if (isHidden(btn)) return;
    const name = getAccessibleName(btn);
    if (!name) {
      accessibilityIssues.push({
        id: "button-empty",
        impact: "critical",
        target: btn.outerHTML.substring(0, 150),
        message: "Button has no accessible name — screen readers announce 'button' with no context. Fails WCAG 4.1.2.",
        element: btn.tagName.toLowerCase(),
      });
    }
  });

  // ── 5. LINKS: use full accessible-name algorithm ──
  document.querySelectorAll("a[href]").forEach((a) => {
    if (isHidden(a)) return;
    const name = getAccessibleName(a);
    if (!name) {
      accessibilityIssues.push({
        id: "link-empty",
        impact: "serious",
        target: a.outerHTML.substring(0, 150),
        message: "Link has no accessible text — screen readers announce 'link' with no destination. Fails WCAG 2.4.4.",
        element: "a",
      });
    }
  });

  // ── 6. COLOR CONTRAST: strict visibility guards ──
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node: Element) => {
      // Skip if hidden by any means
      if (isHidden(node)) return NodeFilter.FILTER_REJECT;
      // Only check elements with direct text content
      const hasDirectText = Array.from(node.childNodes).some(
        (c) => c.nodeType === Node.TEXT_NODE && c.textContent?.trim()
      );
      return hasDirectText ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  let contrastChecked = 0;
  while (walker.nextNode() && contrastChecked < 60) {
    const elem = walker.currentNode as HTMLElement;
    const style = window.getComputedStyle(elem);
    const color = style.color;
    let bg = style.backgroundColor;

    // Walk up to find real (non-transparent) background
    if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
      let parent = elem.parentElement;
      while (parent && parent !== document.body) {
        const ps = window.getComputedStyle(parent);
        if (ps.backgroundColor !== "rgba(0, 0, 0, 0)" && ps.backgroundColor !== "transparent") {
          bg = ps.backgroundColor;
          break;
        }
        parent = parent.parentElement;
      }
    }

    // Skip if background is still transparent (can't measure)
    if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") continue;

    const cRgb = parseRgb(color);
    const bgRgb = parseRgb(bg);
    if (!cRgb || !bgRgb) continue;

    // Skip if text and background are identical (e.g., white-on-white placeholder)
    if (cRgb[0] === bgRgb[0] && cRgb[1] === bgRgb[1] && cRgb[2] === bgRgb[2]) continue;

    const ratio = getContrastRatio(cRgb, bgRgb);
    const fontSize = parseFloat(style.fontSize);
    const isBold = parseInt(style.fontWeight) >= 700;
    // WCAG large text: ≥18pt (24px) OR ≥14pt bold (18.67px)
    const isLarge = fontSize >= 24 || (fontSize >= 18.67 && isBold);
    const minRatio = isLarge ? 3.0 : 4.5;

    // Only flag meaningful failures (ratio < 0.9× threshold to avoid floating point edge cases)
    if (ratio < minRatio - 0.05) {
      contrastChecked++;
      accessibilityIssues.push({
        id: "contrast-low",
        impact: ratio < 3.0 ? "critical" : "serious",
        target: elem.outerHTML.substring(0, 100),
        message: `Contrast ${ratio.toFixed(2)}:1 (required ${minRatio}:1 for ${isLarge ? "large" : "normal"} text). Text: ${color}, Background: ${bg}. Fails WCAG 1.4.3.`,
        element: elem.tagName.toLowerCase(),
        contrastRatio: ratio,
      });
    }
  }

  // Security scan
  const securityIssues = runSecurityAnalysis();

  // Behavioral data
  const now = Date.now();
  const recentWindow = 3000;

  const rageClicks: any[] = [];
  const clickGroups = new Map<string, ClickRecord[]>();
  clickHistory.forEach((c) => {
    if (now - c.timestamp < recentWindow) {
      const existing = clickGroups.get(c.target) || [];
      existing.push(c);
      clickGroups.set(c.target, existing);
    }
  });
  clickGroups.forEach((clicks, target) => {
    if (clicks.length >= 3) rageClicks.push({ x: clicks[0].x, y: clicks[0].y, target, timestamp: clicks[0].timestamp, count: clicks.length });
  });

  const deadClicks: any[] = [];
  const interactiveTags = new Set(["a", "button", "input", "select", "textarea", "label", "summary"]);
  const deadClickMap = new Map<string, number>();
  clickHistory.slice(-50).forEach((c) => {
    const tag = c.target.split("#")[0].split(".")[0];
    if (!interactiveTags.has(tag) && !["svg", "path", "canvas"].includes(tag)) {
      deadClickMap.set(c.target, (deadClickMap.get(c.target) || 0) + 1);
    }
  });
  deadClickMap.forEach((count, target) => {
    if (count >= 2) deadClicks.push({ target, count, x: 0, y: 0 });
  });

  const inputFrustrations = Array.from(inputEdits.entries())
    .filter(([, count]) => count >= 5)
    .map(([field, backspaceCount]) => ({ field, backspaceCount }));

  const totalDOMNodes = document.getElementsByTagName("*").length;
  const scriptTags = document.querySelectorAll("script");
  const inlineScripts = Array.from(scriptTags).filter((s) => !s.hasAttribute("src")).length;

  return {
    accessibilityIssues,
    securityIssues,
    structureIssues,
    behavioralData: {
      rageClicks,
      deadClicks,
      scrollHesitations: scrollPauses,
      inputFrustrations,
    },
    domMetrics: {
      totalDOMNodes,
      inlineScripts,
      externalScripts: scriptTags.length - inlineScripts,
      stylesheets: document.querySelectorAll("link[rel='stylesheet']").length,
      title: document.title,
      metaDescription: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
      hasH1: document.querySelectorAll("h1").length > 0,
    },
  };
}

// ─────────────────────────────────────────────
// REAL-TIME DOM CHANGE DETECTION
// ─────────────────────────────────────────────
let lastAnalysisResult: any = null;
let mutationDebounceTimer: any = null;

// Run analysis and cache the result
function runAndCacheAnalysis() {
  lastAnalysisResult = {
    fcp, lcp, cls, ttfb, inp, longTasks, layoutShifts,
    ...runAnalysis(),
  };
}

// Run once at startup after DOM settles
setTimeout(runAndCacheAnalysis, 500);

// Watch for DOM mutations and re-run analysis (debounced)
try {
  const observer = new MutationObserver(() => {
    if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
    mutationDebounceTimer = setTimeout(runAndCacheAnalysis, 800);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class", "hidden", "aria-hidden", "aria-label", "alt"],
  });
} catch (e) {
  console.warn("MutationObserver setup failed:", e);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "RUN_DOM_ANALYSIS") {
    // Return cached result if available (fresh from MutationObserver-driven update)
    // Otherwise run immediately
    if (lastAnalysisResult) {
      sendResponse(lastAnalysisResult);
    } else {
      runAndCacheAnalysis();
      sendResponse(lastAnalysisResult);
    }
  }
  return true;
});

