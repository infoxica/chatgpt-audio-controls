import React, { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { TabNav, TabType } from "./components/TabNav";
import { QuickControls } from "./components/QuickControls";
import { StatusCard } from "./components/StatusCard";
import { ShortcutsDrawer } from "./components/ShortcutsDrawer";
import { AboutTab } from "./components/AboutTab";
import { getSettings, saveSettings } from "../shared/storage";
import { DEFAULT_SETTINGS } from "../shared/constants";
import { ExtensionSettings } from "../shared/types";
import { ExternalLink, Sparkles } from "lucide-react";
import "./styles/popup.css";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("controls");
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");

  useEffect(() => {
    getSettings().then((loaded) => {
      setSettings(loaded);
      if (loaded.theme) setTheme(loaded.theme);
      applyTheme(loaded.theme);
    });
  }, []);

  const applyTheme = (t: "dark" | "light" | "system") => {
    const isDark =
      t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  };

  const handleToggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    handleUpdateSettings({ theme: next });
  };

  const handleUpdateSettings = async (partial: Partial<ExtensionSettings>) => {
    const updated = await saveSettings(partial);
    setSettings(updated);
  };

  const handleOpenChatGPT = () => {
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url: "https://chatgpt.com" });
    } else {
      window.open("https://chatgpt.com", "_blank");
    }
  };

  const handleOpenOptions = () => {
    if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open("../options/index.html", "_blank");
    }
  };

  return (
    <div className="popup-container">
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenOptions={handleOpenOptions}
      />

      <TabNav activeTab={activeTab} onSelectTab={setActiveTab} />

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {activeTab === "controls" && (
          <QuickControls settings={settings} onUpdateSettings={handleUpdateSettings} />
        )}
        {activeTab === "status" && <StatusCard />}
        {activeTab === "shortcuts" && <ShortcutsDrawer />}
        {activeTab === "about" && <AboutTab />}
      </main>

      <footer className="popup-footer">
        <button className="primary-btn" onClick={handleOpenChatGPT}>
          <Sparkles size={14} /> Open ChatGPT
        </button>
        <div className="secondary-links">
          <span>v1.0.0</span>
          <button
            onClick={handleOpenOptions}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: 10.5,
            }}
          >
            Dashboard <ExternalLink size={10} />
          </button>
        </div>
      </footer>
    </div>
  );
};
