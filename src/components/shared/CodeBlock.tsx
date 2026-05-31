import React, { useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  maxHeight?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = "json",
  maxHeight = "200px",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={handleCopy}
        style={{
          position: "absolute",
          top: "6px",
          right: "6px",
          background: "rgba(108, 99, 255, 0.15)",
          border: "1px solid var(--accent-purple)",
          borderRadius: "3px",
          color: "var(--text-primary)",
          fontSize: "9px",
          padding: "2px 6px",
          cursor: "pointer",
          zIndex: 5,
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre
        className="cyber-code-block"
        style={{ maxHeight, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
};
