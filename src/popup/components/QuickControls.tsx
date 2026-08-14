import React from "react";
import { Volume2, VolumeX, Gauge, Zap } from "lucide-react";
import { SPEED_PRESETS } from "../../shared/constants";
import { ExtensionSettings } from "../../shared/types";

interface QuickControlsProps {
  settings: ExtensionSettings;
  onUpdateSettings: (newSettings: Partial<ExtensionSettings>) => void;
}

export const QuickControls: React.FC<QuickControlsProps> = ({ settings, onUpdateSettings }) => {
  const handleSpeedChange = (speed: number) => {
    onUpdateSettings({ defaultSpeed: speed });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdateSettings({ defaultVolume: val });
  };

  const toggleMute = () => {
    if (settings.defaultVolume > 0) {
      onUpdateSettings({ defaultVolume: 0 });
    } else {
      onUpdateSettings({ defaultVolume: 1 });
    }
  };

  return (
    <div className="popup-body">
      {/* Speed Presets */}
      <div className="section-card">
        <div className="section-title">
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Gauge size={13} /> Default Playback Speed
          </span>
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>{settings.defaultSpeed}×</span>
        </div>
        <div className="speed-grid">
          {SPEED_PRESETS.map((s) => (
            <button
              key={s}
              className={`speed-chip ${settings.defaultSpeed === s ? "active" : ""}`}
              onClick={() => handleSpeedChange(s)}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Volume Control */}
      <div className="section-card">
        <div className="section-title">
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {settings.defaultVolume > 0 ? <Volume2 size={13} /> : <VolumeX size={13} />} Default Volume
          </span>
          <span className="volume-badge">{Math.round(settings.defaultVolume * 100)}%</span>
        </div>
        <div className="volume-control-wrap">
          <button
            className="icon-button"
            onClick={toggleMute}
            title={settings.defaultVolume > 0 ? "Mute" : "Unmute"}
          >
            {settings.defaultVolume > 0 ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.defaultVolume}
            onChange={handleVolumeChange}
            className="custom-range"
            aria-label="Volume Slider"
          />
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="section-card">
        <div className="section-title">
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Zap size={13} /> Smart Integrations
          </span>
        </div>

        <div className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-label">Inline Speech Buttons</span>
            <span className="toggle-desc">Adds 1-click Read Aloud beside response Copy</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.enableInlineButtons}
              onChange={(e) => onUpdateSettings({ enableInlineButtons: e.target.checked })}
            />
            <span className="slider-toggle" />
          </label>
        </div>

        <div className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-label">Global Shortcuts</span>
            <span className="toggle-desc">Enable Alt+P, Alt+Arrows & speed keys</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.enableShortcuts}
              onChange={(e) => onUpdateSettings({ enableShortcuts: e.target.checked })}
            />
            <span className="slider-toggle" />
          </label>
        </div>

        <div className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-label">Smooth Scrubbing</span>
            <span className="toggle-desc">Accelerate seeking by holding ◀10 or 10▶</span>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.smoothScrubbing}
              onChange={(e) => onUpdateSettings({ smoothScrubbing: e.target.checked })}
            />
            <span className="slider-toggle" />
          </label>
        </div>
      </div>
    </div>
  );
};
