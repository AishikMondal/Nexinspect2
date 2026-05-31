import React from "react";
import type { CertDetails } from "../../types/security";

interface CertificateInfoProps {
  cert?: CertDetails;
}

export const CertificateInfo: React.FC<CertificateInfoProps> = ({ cert }) => {
  if (!cert) {
    return (
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "16px",
          fontFamily: "var(--font-sans)",
          fontSize: "11px",
          color: "var(--text-secondary)",
          fontStyle: "italic",
          textAlign: "center",
        }}
      >
        No TLS certificate captured. The site may be loaded over insecure connection or not captured yet.
      </div>
    );
  }

  const items = [
    { label: "Protocol", value: cert.protocol },
    { label: "Cipher Suite", value: cert.cipherSuite },
    { label: "Key Length", value: `${cert.keyLength} bits` },
    { label: "Subject", value: cert.subject },
    { label: "Issuer", value: cert.issuer },
    { label: "Valid From", value: cert.validFrom },
    { label: "Valid To", value: cert.validTo },
  ];

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--accent-cyan)",
        boxShadow: "0 0 6px rgba(0, 212, 255, 0.15)",
        borderRadius: "8px",
        padding: "16px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <h4
        style={{
          margin: "0 0 12px 0",
          fontSize: "11px",
          textTransform: "uppercase",
          color: "var(--accent-cyan)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>TLS / Cryptographic Certificate</span>
      </h4>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11px",
              paddingBottom: "6px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.02)",
            }}
          >
            <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
            <span
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                maxWidth: "70%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "right",
              }}
              title={item.value}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
