import { useTheme } from '../shared/ThemeSelect';
import { FeedbackLink } from "../shared/FeedbackLink";
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
  useTheme(settings.theme);
  const { t } = useTranslation(settings.language);

  useEffect(() => subscribeSettings(setSettings), []);

  useEffect(() => {
    getSettings().then((loaded) => {
      setSettings(loaded);
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

  const [saveError, setSaveError] = useState(false);
  const handleUpdateSettings = async (partial: Partial<ExtensionSettings>) => {
    try { const updated = await saveSettings(partial); setSettings(updated); setSaveError(false); }
    catch { setSaveError(true); }
  };

  return (
    <div className="dashboard-layout">
      <Navbar
        language={settings.language}
        currentSection={section}
        onSelectSection={setSection}
        theme={settings.theme}
        onThemeChange={theme => void handleUpdateSettings({ theme })}
        t={t}
      />

      {saveError && <p role="alert" style={{ padding: 12 }}>{getReleaseCopy(settings.language).savedError}</p>}
      <main className="dashboard-main">
          <FeedbackLink language={settings.language} theme={settings.theme} />
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
