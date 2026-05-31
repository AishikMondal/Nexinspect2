import type { CertDetails, CookieAudit, HeaderAudit, SecurityReport } from "../types/security";

export function analyzeSecurity(
  headers: Record<string, string>,
  certificate: CertDetails | undefined,
  mixedContent: string[],
  exposedKeys: any[],
  rawCookieHeaders: string[] // List of Set-Cookie header strings
): SecurityReport {
  const headerAudits: HeaderAudit[] = [];
  let score = 100;

  // 1. Content Security Policy (CSP)
  const csp = headers["content-security-policy"] || "";
  const cspPresent = csp.trim().length > 0;
  if (!cspPresent) score -= 25;
  headerAudits.push({
    name: "Content-Security-Policy (CSP)",
    present: cspPresent,
    value: csp,
    status: cspPresent ? "secure" : "insecure",
    description: cspPresent
      ? "Content Security Policy is defined, helping prevent Cross-Site Scripting (XSS) attacks."
      : "No Content Security Policy found. Enables risks for CSS injection, clickjacking, and XSS.",
  });

  // 2. Strict Transport Security (HSTS)
  const hsts = headers["strict-transport-security"] || "";
  const hstsPresent = hsts.trim().length > 0;
  const isHstsSecure = hstsPresent && hsts.toLowerCase().includes("max-age=");
  if (!hstsPresent) {
    score -= 20;
  } else if (!isHstsSecure) {
    score -= 5;
  }
  headerAudits.push({
    name: "Strict-Transport-Security (HSTS)",
    present: hstsPresent,
    value: hsts,
    status: isHstsSecure ? "secure" : hstsPresent ? "warning" : "insecure",
    description: isHstsSecure
      ? "HSTS is configured correctly, enforcing HTTPS connections."
      : hstsPresent
      ? "HSTS is present but has configuration issues (e.g. missing max-age)."
      : "HSTS is missing. Users can access this site over insecure connections.",
  });

  // 3. X-Frame-Options
  const xfo = headers["x-frame-options"] || "";
  const xfoPresent = xfo.trim().length > 0;
  const isXfoSecure = xfoPresent && (xfo.toUpperCase().includes("DENY") || xfo.toUpperCase().includes("SAMEORIGIN"));
  if (!xfoPresent) {
    score -= 15;
  } else if (!isXfoSecure) {
    score -= 5;
  }
  headerAudits.push({
    name: "X-Frame-Options",
    present: xfoPresent,
    value: xfo,
    status: isXfoSecure ? "secure" : xfoPresent ? "warning" : "insecure",
    description: isXfoSecure
      ? `X-Frame-Options is set to "${xfo}", protecting against clickjacking.`
      : xfoPresent
      ? "X-Frame-Options is configured with an invalid or weak policy."
      : "X-Frame-Options is missing, making the site vulnerable to clickjacking frame embeds.",
  });

  // 4. X-Content-Type-Options
  const xcto = headers["x-content-type-options"] || "";
  const xctoPresent = xcto.trim().length > 0;
  const isXctoSecure = xctoPresent && xcto.toLowerCase().includes("nosniff");
  if (!xctoPresent) {
    score -= 15;
  } else if (!isXctoSecure) {
    score -= 5;
  }
  headerAudits.push({
    name: "X-Content-Type-Options",
    present: xctoPresent,
    value: xcto,
    status: isXctoSecure ? "secure" : xctoPresent ? "warning" : "insecure",
    description: isXctoSecure
      ? "X-Content-Type-Options is set to 'nosniff', preventing MIME-type sniffing."
      : "X-Content-Type-Options is missing or incorrect, allowing browsers to guess file types.",
  });

  // 5. Referrer-Policy
  const refPol = headers["referrer-policy"] || "";
  const refPolPresent = refPol.trim().length > 0;
  const isRefPolSecure = refPolPresent && !refPol.toLowerCase().includes("unsafe-url");
  if (!refPolPresent) {
    score -= 10;
  } else if (!isRefPolSecure) {
    score -= 5;
  }
  headerAudits.push({
    name: "Referrer-Policy",
    present: refPolPresent,
    value: refPol,
    status: isRefPolSecure ? "secure" : refPolPresent ? "warning" : "insecure",
    description: isRefPolSecure
      ? `Referrer Policy is set to '${refPol}', managing leaked data securely.`
      : refPolPresent
      ? "Referrer Policy allows sharing full referrer links across insecure domains."
      : "No Referrer Policy defined, defaulting browser referrer control to defaults.",
  });

  // Parse Cookie Headers for Security
  const cookies: CookieAudit[] = [];
  rawCookieHeaders.forEach((cookieHeader) => {
    // A Set-Cookie header looks like: "cookieName=value; Path=/; Secure; HttpOnly; SameSite=Strict"
    const parts = cookieHeader.split(";").map((p) => p.trim());
    if (parts.length === 0) return;

    const firstPart = parts[0];
    const equalsIdx = firstPart.indexOf("=");
    if (equalsIdx === -1) return;

    const name = firstPart.substring(0, equalsIdx);
    const flags = parts.slice(1).map((f) => f.toLowerCase());

    const secure = flags.includes("secure");
    const httpOnly = flags.includes("httponly");
    const sameSiteFlag = parts.find((p) => p.toLowerCase().startsWith("samesite="));
    const sameSite = sameSiteFlag ? sameSiteFlag.split("=")[1] : "None";

    let cookieStatus: "secure" | "warning" | "insecure" = "secure";
    if (!secure || !httpOnly) {
      cookieStatus = !secure && !httpOnly ? "insecure" : "warning";
      score -= 5; // deduct for insecure cookies
    }

    cookies.push({
      name,
      domain: "",
      secure,
      httpOnly,
      sameSite,
      status: cookieStatus,
    });
  });

  // Final scoring clamps
  score = Math.max(0, score);

  let grade = "F";
  if (score >= 95) grade = "A+";
  else if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";

  // Scan mixed content or deduplicate tracker items
  const trackersList: string[] = []; // will populate on front-end
  
  return {
    certificate,
    headerReport: {
      grade,
      score,
      headers: headerAudits,
    },
    cookies,
    mixedContent,
    trackersCount: 0,
    trackersList,
    fingerprintingDetected: false,
    exposedKeys,
  };
}
