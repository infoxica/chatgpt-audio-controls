import React from "react";
import { Keyboard, MousePointer } from "lucide-react";
import { TranslationSchema } from "../../shared/i18n";

interface ShortcutsGuideProps {
  t: TranslationSchema;
}

export const ShortcutsGuide: React.FC<ShortcutsGuideProps> = ({ t }) => {
  const shortcutEntries = [
    {
      id: "play-pause",
      action: t.shortcuts.playPause.action,
      description: t.shortcuts.playPause.description,
      keys: ["Space / K"],
    },
    {
      id: "seek-back",
      action: t.shortcuts.seekBack.action,
      description: t.shortcuts.seekBack.description,
      keys: ["Alt", "←"],
    },
    {
      id: "seek-forward",
      action: t.shortcuts.seekForward.action,
      description: t.shortcuts.seekForward.description,
      keys: ["Alt", "→"],
    },
    {
      id: "speed-decrease",
      action: t.shortcuts.speedDecrease.action,
      description: t.shortcuts.speedDecrease.description,
      keys: ["Shift", "<"],
    },
    {
      id: "speed-increase",
      action: t.shortcuts.speedIncrease.action,
      description: t.shortcuts.speedIncrease.description,
      keys: ["Shift", ">"],
    },
  ];

  return (
    <div className="settings-section">
      <div className="card">
        <div className="card-title">
          <Keyboard size={16} color="var(--accent)" />
          <span>{t.options.shortcutsGuide.title}</span>
        </div>
        <p className="card-desc">
          {t.options.shortcutsGuide.desc}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          {shortcutEntries.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--bg-card)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.action}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {s.description}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {s.keys.map((k, i) => (
                  <span key={i} className="kbd" style={{ padding: "4px 8px", fontSize: 11 }}>
                    {k}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <MousePointer size={16} color="var(--accent)" />
          <span>{t.options.shortcutsGuide.gesturesTitle}</span>
        </div>
        <p className="card-desc">
          {t.options.shortcutsGuide.gesturesDesc}
        </p>

        <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
          <li><strong>0.3s:</strong> {t.options.shortcutsGuide.gestureHold03}</li>
          <li><strong>1.5s:</strong> {t.options.shortcutsGuide.gestureHold15}</li>
          <li><strong>3.0s:</strong> {t.options.shortcutsGuide.gestureHold30}</li>
          <li><strong>Release:</strong> {t.options.shortcutsGuide.gestureRelease}</li>
        </ul>
      </div>
    </div>
  );
};
