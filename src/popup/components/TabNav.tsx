import React from "react";
import { Sliders, Keyboard, Info, Activity } from "lucide-react";

export type TabType = "controls" | "status" | "shortcuts" | "about";

interface TabNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const TabNav: React.FC<TabNavProps> = ({ activeTab, onSelectTab }) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "controls", label: "Controls", icon: <Sliders size={13} /> },
    { id: "status", label: "Status", icon: <Activity size={13} /> },
    { id: "shortcuts", label: "Keys", icon: <Keyboard size={13} /> },
    { id: "about", label: "About", icon: <Info size={13} /> },
  ];

  return (
    <nav className="tabs-nav" aria-label="Extension Navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => onSelectTab(tab.id)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};
