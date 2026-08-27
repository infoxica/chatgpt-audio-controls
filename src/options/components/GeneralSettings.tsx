import React from "react";
import { Gauge, Volume2, FastForward, Check, Globe } from "lucide-react";
import { SPEED_PRESETS, SUPPORTED_LANGUAGES } from "../../shared/constants";
import { ExtensionSettings, SupportedLanguage } from "../../shared/types";
import { TranslationSchema, detectBrowserLanguage } from "../../shared/i18n";

interface GeneralSettingsProps {
  settings: ExtensionSettings;
  onUpdateSettings: (newSettings: Partial<ExtensionSettings>) => void;
  t: TranslationSchema;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  settings,
  onUpdateSettings,
  t,
}) => {
  const detectedCode = detectBrowserLanguage();
  const detectedLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === detectedCode);
  const currentLang = settings.language || "auto";

  return (
    <div className="settings-section">
      {/* Language & Localization */}
      <div className="card">
        <div className="card-title">
          <Globe size={16} color="var(--accent)" />
          <span>{t.options.general.languageTitle}</span>
        </div>
        <p className="card-desc">
          {t.options.general.languageDesc}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, marginTop: 8 }}>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = currentLang === lang.code;
            const isAuto = lang.code === "auto";

            return (
              <button
                key={lang.code}
                onClick={() => onUpdateSettings({ language: lang.code as SupportedLanguage })}
                className={`btn-outline ${isSelected ? "active" : ""}`}
                style={{
                  borderColor: isSelected ? "var(--accent)" : undefined,
                  background: isSelected ? "var(--accent-light)" : undefined,
                  color: isSelected ? "var(--accent)" : undefined,
                  fontWeight: isSelected ? 700 : 500,
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  height: "auto",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 13 }}>{lang.nativeName}</span>
                  <span style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 400 }}>
                    {isAuto && detectedLangObj
                      ? `${t.options.general.languageDetected}: ${detectedLangObj.nativeName}`
                      : lang.label}
                  </span>
                </div>
                {isSelected && <Check size={14} color="var(--accent)" style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Playback Speed Preferences */}
      <div className="card">
        <div className="card-title">
          <Gauge size={16} color="var(--accent)" />
          <span>{t.options.general.speedTitle}</span>
        </div>
        <p className="card-desc">
          {t.options.general.speedDesc}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {SPEED_PRESETS.map((speed) => (
            <button
              key={speed}
              onClick={() => onUpdateSettings({ defaultSpeed: speed })}
              className={`btn-outline ${settings.defaultSpeed === speed ? "active" : ""}`}
              style={{
                borderColor: settings.defaultSpeed === speed ? "var(--accent)" : undefined,
                background: settings.defaultSpeed === speed ? "var(--accent)" : undefined,
                color: settings.defaultSpeed === speed ? "#ffffff" : undefined,
                minWidth: 54,
                justifyContent: "center",
              }}
            >
              {settings.defaultSpeed === speed && <Check size={12} />}
              {speed}×
            </button>
          ))}
        </div>
      </div>

      {/* Default Volume Level */}
      <div className="card">
        <div className="card-title">
          <Volume2 size={16} color="var(--accent)" />
          <span>{t.options.general.volumeTitle}</span>
        </div>
        <p className="card-desc">
          {t.options.general.volumeDesc}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.defaultVolume}
            onChange={(e) => onUpdateSettings({ defaultVolume: parseFloat(e.target.value) })}
            className="custom-range"
            style={{ flex: 1, maxWidth: 360 }}
          />
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, minWidth: 44 }}>
            {Math.round(settings.defaultVolume * 100)}%
          </span>
        </div>
      </div>

      {/* Skip & Seek Step */}
      <div className="card">
        <div className="card-title">
          <FastForward size={16} color="var(--accent)" />
          <span>{t.options.general.seekTitle}</span>
        </div>
        <p className="card-desc">
          {t.options.general.seekDesc}
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          {[5, 10, 15, 30].map((sec) => (
            <button
              key={sec}
              onClick={() => onUpdateSettings({ tapSeekSeconds: sec })}
              className="btn-outline"
              style={{
                borderColor: settings.tapSeekSeconds === sec ? "var(--accent)" : undefined,
                background: settings.tapSeekSeconds === sec ? "var(--accent-light)" : undefined,
                color: settings.tapSeekSeconds === sec ? "var(--accent)" : undefined,
                minWidth: 70,
                justifyContent: "center",
              }}
            >
              {sec} {t.options.general.secondsUnit}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
