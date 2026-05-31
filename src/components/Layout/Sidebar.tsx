import React from "react";

export type PanelTab =
  | "network"
  | "performance"
  | "security"
  | "lighthouse"
  | "accessibility";

interface SidebarProps {
  activeTab: PanelTab;
  setActiveTab: (tab: PanelTab) => void;
  aiAvailable: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  aiAvailable,
}) => {
  const tabs: { id: PanelTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "network",
      label: "Network",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
        </svg>
      ),
    },
    {
      id: "performance",
      label: "Performance",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    {
      id: "security",
      label: "Security",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      id: "lighthouse",
      label: "Lighthouse",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 22h20L12 2z" />
          <circle cx="12" cy="14" r="3" />
          <path d="M12 5v6" />
        </svg>
      ),
    },
    {
      id: "accessibility",
      label: "Accessibility",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="4" r="2" />
          <path d="M12 6c-3.1 0-6 2.5-6 6 0 1.2.3 2.3.9 3.2L3 22l6.2-3.1c.9.6 2 .9 3.2.9 3.5 0 6-2.9 6-6 0-3.5-2.9-6-6-6z" />
          <path d="M6 12h12" />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        width: "48px",
        height: "100vh",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 0",
        gap: "12px",
        zIndex: 10,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
            style={{
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid transparent",
              background: isActive ? "rgba(108, 99, 255, 0.1)" : "transparent",
              color: isActive ? "var(--accent-purple)" : "var(--text-secondary)",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              position: "relative",
              borderColor: isActive ? "var(--accent-purple)" : "transparent",
              boxShadow: isActive ? "0 0 8px var(--accent-purple-glow)" : "none",
            }}
            className={isActive ? "animate-pulse-glow" : ""}
          >
            {tab.icon}
          </button>
        );
      })}
    </div>
  );
};
