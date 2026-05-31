import React, { useState } from "react";
import type { AccessibilityViolation } from "../../services/accessibilityEngine";
import { groupViolations } from "../../services/accessibilityEngine";
import { getAccessibilityFix } from "../../services/insightEngine";
import { createGeminiNanoSession } from "../../services/geminiNano";
import type { AIState } from "../../types/ai";

interface IssueTreeProps {
  violations: AccessibilityViolation[];
  aiState: AIState;
}

const impactColors: Record<string, string> = {
  critical: "var(--accent-pink)",
  serious: "var(--accent-yellow)",
  moderate: "var(--accent-purple)",
  minor: "var(--text-secondary)",
};

const userImpactLabels: Record<string, string> = {
  critical: "Blocks assistive tech users completely",
  serious: "Significantly degrades the experience",
  moderate: "Creates confusion for some users",
  minor: "Minor inconvenience",
};

export const IssueTree: React.FC<IssueTreeProps> = ({ violations, aiState }) => {
  const groups = groupViolations(violations);
  const [expandedGroup, setExpandedGroup] = useState<string | null>("critical");
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);
  
  // Real-time dynamic fixes loaded via Gemini Nano
  const [dynamicFixes, setDynamicFixes] = useState<Record<string, {
    whyItMatters: string;
    howItAffectsUsers: string;
    fixCode: string;
    loading?: boolean;
  }>>({});

  const handleIssueExpand = async (issueKey: string, item: AccessibilityViolation) => {
    const isOpen = expandedIssue === issueKey;
    if (isOpen) {
      setExpandedIssue(null);
      return;
    }
    setExpandedIssue(issueKey);

    // If already loaded or loading, or AI is not available, don't trigger again
    if (dynamicFixes[issueKey] || !aiState.isAvailable) {
      return;
    }

    // Set loading state
    setDynamicFixes((prev) => ({
      ...prev,
      [issueKey]: {
        whyItMatters: "",
        howItAffectsUsers: "",
        fixCode: "",
        loading: true,
      },
    }));

    try {
      const session = await createGeminiNanoSession(
        "You are Nexinspect WCAG 2.1 AA Accessibility Expert. Generate precise, element-specific diagnostics in JSON."
      );
      const prompt = `Analyze this accessibility violation found on the webpage:
- Violation Rule ID: ${item.id}
- Message: ${item.message}
- Offending HTML Element: ${item.target}

Generate a highly specific, real-time diagnostic and corrected HTML code for this exact offending element. Do not use generic placeholders. Incorporate the element's actual source attributes (like its existing id, src, classes) but correct the accessibility gap (e.g. add descriptive alt text, associate correct labels, fix contrast, etc.).
Respond STRICTLY in valid JSON format. Do not add any backticks, markdown code blocks, or conversational words outside the JSON. The JSON response must look exactly like this:
{
  "whyItMatters": "A concise explanation of why this specific element failing this rule matters.",
  "howItAffectsUsers": "How this specific element's failure affects screen readers or keyboard users.",
  "fixCode": "The exact corrected HTML snippet for the offending element."
}`;

      const rawResponse = await session.prompt(prompt);
      session.destroy();

      let cleaned = rawResponse.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }

      const parsed = JSON.parse(cleaned);
      if (parsed.whyItMatters && parsed.howItAffectsUsers && parsed.fixCode) {
        setDynamicFixes((prev) => ({
          ...prev,
          [issueKey]: {
            whyItMatters: parsed.whyItMatters,
            howItAffectsUsers: parsed.howItAffectsUsers,
            fixCode: parsed.fixCode,
            loading: false,
          },
        }));
      } else {
        throw new Error("Missing keys in AI JSON response");
      }
    } catch (err) {
      console.error("Failed to generate dynamic accessibility fix:", err);
      const staticFix = getAccessibilityFix(item.id, item.element, item.target);
      setDynamicFixes((prev) => ({
        ...prev,
        [issueKey]: {
          whyItMatters: staticFix.whyItMatters,
          howItAffectsUsers: staticFix.howItAffectsUsers,
          fixCode: staticFix.fixCode,
          loading: false,
        },
      }));
    }
  };

  const categories = [
    { id: "critical", label: "Critical", items: groups.critical },
    { id: "serious",  label: "Serious",  items: groups.serious  },
    { id: "moderate", label: "Moderate", items: groups.moderate },
    { id: "minor",    label: "Minor",    items: groups.minor    },
  ];

  const copyCode = (code: string, key: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedIdx(key);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  if (violations.length === 0) {
    return (
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: "28px", marginBottom: "8px" }}>✅</div>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--accent-cyan)" }}>No Accessibility Violations Found</div>
        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>This page meets WCAG 2.1 requirements for checked criteria</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {categories.map((cat) => {
        if (cat.items.length === 0) return null;
        const isGroupOpen = expandedGroup === cat.id;
        const color = impactColors[cat.id];

        return (
          <div key={cat.id} style={{ border: `1px solid ${color}30`, borderRadius: "10px", overflow: "hidden" }}>
            {/* Group Header */}
            <div
              onClick={() => setExpandedGroup(isGroupOpen ? null : cat.id)}
              style={{ background: `${color}10`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderLeft: `4px solid ${color}` }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {cat.label}
                </span>
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                  — {userImpactLabels[cat.id]}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ background: color, color: "#fff", borderRadius: "12px", padding: "1px 8px", fontSize: "10px", fontWeight: 700 }}>
                  {cat.items.length}
                </span>
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{isGroupOpen ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* Issues List */}
            {isGroupOpen && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {cat.items.map((item, idx) => {
                  const issueKey = `${cat.id}-${idx}`;
                  const isOpen = expandedIssue === issueKey;
                  const staticFix = getAccessibilityFix(item.id, item.element, item.target, item.contrastRatio);
                  
                  // Use dynamic fix if available and not loading, otherwise fallback to static template
                  const currentFix = dynamicFixes[issueKey];
                  const isLoading = currentFix?.loading;
                  
                  const displayWhy = isLoading 
                    ? "Generating precise real-time diagnostic via Gemini Nano..." 
                    : (currentFix?.whyItMatters || staticFix.whyItMatters);
                  
                  const displayHow = isLoading 
                    ? "Analyzing user experience impact..." 
                    : (currentFix?.howItAffectsUsers || staticFix.howItAffectsUsers);
                    
                  const displayCode = isLoading 
                    ? "<!-- Compiling elements and generating real-time fix... -->" 
                    : (currentFix?.fixCode || staticFix.fixCode);

                  return (
                    <div
                      key={idx}
                      style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: isOpen ? "rgba(255,255,255,0.025)" : "transparent", transition: "background 0.2s" }}
                    >
                      {/* Issue Row */}
                      <div
                        onClick={() => handleIssueExpand(issueKey, item)}
                        style={{ padding: "10px 14px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
                            {item.message.split(".")[0]}
                          </span>
                          <span style={{ fontSize: "9px", color: color, border: `1px solid ${color}`, borderRadius: "4px", padding: "1px 5px", whiteSpace: "nowrap" }}>
                            {staticFix.wcagCriteria.split(" ")[0]} {staticFix.wcagCriteria.split(" ")[1]}
                          </span>
                        </div>
                        <div style={{ fontSize: "9px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", wordBreak: "break-all", opacity: 0.7 }}>
                          Target: {item.target.substring(0, 80)}{item.target.length > 80 ? "…" : ""}
                        </div>
                        <div style={{ fontSize: "9px", color: "var(--accent-cyan)", marginTop: "2px" }}>
                          {isOpen ? "▲ Hide fix" : "▼ Show fix & why this matters"}
                        </div>
                      </div>

                      {/* Expanded Fix Panel */}
                      {isOpen && (
                        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          {/* WHY It Matters */}
                          <div style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: "8px", padding: "10px 12px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", color: "var(--accent-cyan)", marginBottom: "6px", letterSpacing: "0.08em" }}>
                              💡 Why This Matters
                            </div>
                            <p style={{ margin: 0, fontSize: "11px", color: "var(--text-primary)", lineHeight: "1.6" }}>{displayWhy}</p>
                          </div>

                          {/* User Impact */}
                          <div style={{ background: `${color}08`, border: `1px solid ${color}30`, borderRadius: "8px", padding: "10px 12px" }}>
                            <div style={{ fontSize: "9px", fontWeight: 800, textTransform: "uppercase", color, marginBottom: "6px", letterSpacing: "0.08em" }}>
                              👤 How It Affects Real Users
                            </div>
                            <p style={{ margin: 0, fontSize: "11px", color: "var(--text-primary)", lineHeight: "1.6" }}>{displayHow}</p>
                          </div>

                          {/* Fix Code */}
                          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border-color)" }}>
                              <span style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", color: "var(--accent-purple)", letterSpacing: "0.08em" }}>
                                🔧 Suggested Fix
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); if (!isLoading) copyCode(displayCode, issueKey); }}
                                disabled={isLoading}
                                style={{ fontSize: "9px", padding: "2px 8px", background: copiedIdx === issueKey ? "rgba(0,212,255,0.2)" : "transparent", border: `1px solid ${copiedIdx === issueKey ? "var(--accent-cyan)" : "var(--border-color)"}`, borderRadius: "4px", color: copiedIdx === issueKey ? "var(--accent-cyan)" : "var(--text-secondary)", cursor: isLoading ? "not-allowed" : "pointer" }}
                              >
                                {copiedIdx === issueKey ? "✓ Copied!" : "Copy"}
                              </button>
                            </div>
                            <pre style={{ margin: 0, padding: "10px", fontSize: "10px", color: isLoading ? "var(--text-secondary)" : "var(--accent-cyan)", fontFamily: "var(--font-mono)", overflowX: "auto", lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                              {displayCode}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
