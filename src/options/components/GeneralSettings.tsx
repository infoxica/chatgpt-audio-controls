import React from "react";
import { Gauge, Volume2, FastForward, Check } from "lucide-react";
import { SPEED_PRESETS } from "../../shared/constants";
import { ExtensionSettings } from "../../shared/types";

interface GeneralSettingsProps {
  settings: ExtensionSettings;
  onUpdateSettings: (newSettings: Partial<ExtensionSettings>) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  settings,
  onUpdateSettings,
}) => {
  return (
    <div className="settings-section">
      <div className="card">
        <div className="card-title">
          <Gauge size={16} color="var(--accent)" />
          <span>Playback Speed Preferences</span>
        </div>
        <p className="card-desc">
          Choose your default playback rate when opening ChatGPT or launching Read Aloud.
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

      <div className="card">
        <div className="card-title">
          <Volume2 size={16} color="var(--accent)" />
          <span>Default Volume Level</span>
        </div>
        <p className="card-desc">
          Preset volume for Read Aloud speech streams.
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

      <div className="card">
        <div className="card-title">
          <FastForward size={16} color="var(--accent)" />
          <span>Skip & Seek Step</span>
        </div>
        <p className="card-desc">
          Number of seconds to skip on single tap of the -10s / +10s buttons or Alt + Left / Alt + Right.
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
              {sec} seconds
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
