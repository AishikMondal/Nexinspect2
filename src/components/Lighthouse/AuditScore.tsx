import React from "react";

interface AuditScoreProps {
  score: number;
  label: string;
}

export const AuditScore: React.FC<AuditScoreProps> = ({ score, label }) => {
  const radius = 24;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (s: number) => {
    if (s >= 90) return "var(--accent-cyan)";
    if (s >= 50) return "var(--accent-yellow)";
    return "var(--accent-pink)";
  };

  const color = getScoreColor(score);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ position: "relative", width: `${radius * 2}px`, height: `${radius * 2}px` }}>
        <svg height={radius * 2} width={radius * 2}>
          {/* Background track */}
          <circle
            stroke="rgba(255, 255, 255, 0.05)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Glowing track */}
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + " " + circumference}
            style={{ strokeDashoffset, transition: "stroke-dashoffset 0.8s ease-in-out" }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            strokeLinecap="round"
          />
        </svg>
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "12px",
            fontWeight: 800,
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {score}
        </span>
      </div>
      <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "center" }}>
        {label}
      </span>
    </div>
  );
};
