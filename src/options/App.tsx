import React, { useEffect, useState } from "react";
import { Navbar, DashboardSection } from "./components/Navbar";
import { GeneralSettings } from "./components/GeneralSettings";
import { ShortcutsGuide } from "./components/ShortcutsGuide";
import { FaqSection } from "./components/FaqSection";
import { getSettings, saveSettings } from "../shared/storage";
import { DEFAULT_SETTINGS } from "../shared/constants";
import { ExtensionSettings } from "../shared/types";
import "./styles/options.css";

export const App: React.FC = () => {
  const [section, setSection] = useState<DashboardSection>("settings");
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");

  useEffect(() => {
    getSettings().then((loaded) => {
      setSettings(loaded);
      if (loaded.theme) setTheme(loaded.theme);
      applyTheme(loaded.theme);
    });

    try {
      const rawTheme = localStorage.getItem("cgpt-ra-theme-cache");
      if (rawTheme) {
        const parsed = JSON.parse(rawTheme);
        if (parsed.chatTheme) {
          document.documentElement.setAttribute("data-chat-theme", parsed.chatTheme);
        }
      }
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.get(["cgpt-ra-theme-cache"], (res) => {
          if (res?.["cgpt-ra-theme-cache"]?.chatTheme) {
            document.documentElement.setAttribute("data-chat-theme", res["cgpt-ra-theme-cache"].chatTheme);
          }
        });

        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
          if (changes["cgpt-ra-theme-cache"]?.newValue?.chatTheme) {
            document.documentElement.setAttribute(
              "data-chat-theme",
              changes["cgpt-ra-theme-cache"].newValue.chatTheme
            );
          }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => {
          chrome.storage.onChanged.removeListener(handleStorageChange);
        };
      }
    } catch (_) {}
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

  return (
    <div className="dashboard-layout">
      <Navbar
        currentSection={section}
        onSelectSection={setSection}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <main className="dashboard-main">
        <header className="main-header">
          <div className="header-title-block">
            <h1>
              {section === "settings" && "Audio & Playback Preferences"}
              {section === "shortcuts" && "Keyboard Shortcuts & Gestures"}
              {section === "faq" && "FAQ & Troubleshooting"}
            </h1>
            <p>
              {section === "settings" && "Configure playback speed presets, default volume, and features."}
              {section === "shortcuts" && "Master quick hotkeys for effortless playback manipulation."}
              {section === "faq" && "Detailed technical guide, security, and support answers."}
            </p>
          </div>
        </header>

        {section === "settings" && (
          <GeneralSettings settings={settings} onUpdateSettings={handleUpdateSettings} />
        )}
        {section === "shortcuts" && <ShortcutsGuide />}
        {section === "faq" && <FaqSection />}
      </main>
    </div>
  );
};
