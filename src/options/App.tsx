import { getReleaseCopy } from "../shared/i18n/release-copy";
import React, { useEffect, useState } from "react";
import { Navbar, DashboardSection } from "./components/Navbar";
import { GeneralSettings } from "./components/GeneralSettings";
import { ShortcutsGuide } from "./components/ShortcutsGuide";
import { FaqSection } from "./components/FaqSection";
import { getSettings, saveSettings, subscribeSettings } from "../shared/storage";
import { DEFAULT_SETTINGS } from "../shared/constants";
import { ExtensionSettings } from "../shared/types";
import { useTranslation } from "../shared/i18n";
import "./styles/options.css";

export const App: React.FC = () => {
  const [section, setSection] = useState<DashboardSection>("settings");
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const { t } = useTranslation(settings.language);

  useEffect(() => subscribeSettings(setSettings), []);

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

  const applyTheme = (tTheme: "dark" | "light" | "system") => {
    const isDark =
      tTheme === "dark" || (tTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  };

  const handleToggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    handleUpdateSettings({ theme: next });
  };

  const [saveError, setSaveError] = useState(false);
  const handleUpdateSettings = async (partial: Partial<ExtensionSettings>) => {
    try { const updated = await saveSettings(partial); setSettings(updated); setSaveError(false); }
    catch { setSaveError(true); }
  };

  return (
    <div className="dashboard-layout">
      <Navbar
        currentSection={section}
        onSelectSection={setSection}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        t={t}
      />

      {saveError && <p role="alert" style={{ padding: 12 }}>{getReleaseCopy(settings.language).savedError}</p>}
      <main className="dashboard-main">
        <header className="main-header">
          <div className="header-title-block">
            <h1>
              {section === "settings" && t.options.headers.preferencesTitle}
              {section === "shortcuts" && t.options.headers.shortcutsTitle}
              {section === "faq" && t.options.headers.faqTitle}
            </h1>
            <p>
              {section === "settings" && t.options.headers.preferencesDesc}
              {section === "shortcuts" && t.options.headers.shortcutsDesc}
              {section === "faq" && t.options.headers.faqDesc}
            </p>
          </div>
        </header>

        {section === "settings" && (
          <GeneralSettings settings={settings} onUpdateSettings={handleUpdateSettings} t={t} />
        )}
        {section === "shortcuts" && <ShortcutsGuide language={settings.language} t={t} />}
        {section === "faq" && <FaqSection t={t} language={settings.language} />}
      </main>
    </div>
  );
};
