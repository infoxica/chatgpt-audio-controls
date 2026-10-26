import { useTheme } from '../shared/ThemeSelect';
import config from "../../config/release.json";
import { resolveLanguage } from "../shared/i18n/core";
import { QuickStart } from "../shared/QuickStart";
import { getReleaseCopy } from "../shared/i18n/release-copy";
import React, { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { TabNav, TabType } from "./components/TabNav";
import { QuickControls } from "./components/QuickControls";
import { ShortcutsDrawer } from "./components/ShortcutsDrawer";
import { AboutTab } from "./components/AboutTab";
import { getSettings, saveSettings, subscribeSettings } from "../shared/storage";
import { DEFAULT_SETTINGS, EXTENSION_VERSION } from "../shared/constants";
import { ExtensionSettings } from "../shared/types";
import { useTranslation } from "../shared/i18n";
import { ExternalLink, Sparkles } from "lucide-react";
import "./styles/popup.css";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("controls");
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
        language={settings.language}
        theme={settings.theme}
        onThemeChange={theme => void handleUpdateSettings({ theme })}
        onOpenOptions={handleOpenOptions}
        t={t}
      />

      <QuickStart language={settings.language} />
      <TabNav activeTab={activeTab} onSelectTab={setActiveTab} t={t} />

      {saveError && <p role="alert" style={{ padding: 12 }}>{getReleaseCopy(settings.language).savedError}</p>}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {activeTab === "controls" && (
          <QuickControls settings={settings} onUpdateSettings={handleUpdateSettings} t={t} />
        )}
        {activeTab === "shortcuts" && <ShortcutsDrawer language={settings.language} t={t} />}
        {activeTab === "about" && <AboutTab t={t} language={settings.language} theme={settings.theme} />}
      </main>

      <footer className="popup-footer">
        <button className="primary-btn" onClick={handleOpenChatGPT}>
          <Sparkles size={14} /> {t.common.openChatGPT}
        </button>
        <div className="secondary-links">
          <span>{t.common.version}{EXTENSION_VERSION}</span>
          <div className="footer-links"><a href={`${config.siteUrl}${resolveLanguage(settings.language) === "en" ? "" : resolveLanguage(settings.language) + "/"}#help`} target="_blank" rel="noreferrer">{getReleaseCopy(settings.language).help}</a>
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
            {t.common.dashboard} <ExternalLink size={10} />
          </button></div>
        </div>
      </footer>
    </div>
  );
};
