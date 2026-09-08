import React from "react";
import { Sliders, Keyboard, Info } from "lucide-react";
import { TranslationSchema } from "../../shared/i18n";

export type TabType = "controls" | "shortcuts" | "about";

interface TabNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  t: TranslationSchema;
}

export const TabNav: React.FC<TabNavProps> = ({ activeTab, onSelectTab, t }) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "controls", label: t.popup.tabs.controls, icon: <Sliders size={13} /> },
    { id: "shortcuts", label: t.popup.tabs.shortcuts, icon: <Keyboard size={13} /> },
    { id: "about", label: t.popup.tabs.about, icon: <Info size={13} /> },
  ];

  return (
    <nav className="tabs-nav" aria-label={t.common.extensionName}>
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
