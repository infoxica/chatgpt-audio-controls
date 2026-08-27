import React from "react";
import { Keyboard, MousePointerClick } from "lucide-react";
import { TranslationSchema } from "../../shared/i18n";

interface ShortcutsDrawerProps {
  t: TranslationSchema;
}

export const ShortcutsDrawer: React.FC<ShortcutsDrawerProps> = ({ t }) => {
  const shortcutEntries = [
    {
      id: "play-pause",
      action: t.shortcuts.playPause.action,
      keys: ["Space / K"],
    },
    {
      id: "seek-back",
      action: t.shortcuts.seekBack.action,
      keys: ["Alt", "←"],
    },
    {
      id: "seek-forward",
      action: t.shortcuts.seekForward.action,
      keys: ["Alt", "→"],
    },
    {
      id: "speed-decrease",
      action: t.shortcuts.speedDecrease.action,
      keys: ["Shift", "<"],
    },
    {
      id: "speed-increase",
      action: t.shortcuts.speedIncrease.action,
      keys: ["Shift", ">"],
    },
  ];

  return (
    <div className="popup-body">
      <div className="section-card">
        <div className="section-title">
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Keyboard size={13} /> {t.popup.shortcuts.title}
          </span>
        </div>
        <div className="shortcut-list">
          {shortcutEntries.map((s) => (
            <div key={s.id} className="shortcut-row">
              <div className="shortcut-info">
                <div className="shortcut-name">{s.action}</div>
              </div>
              <div className="key-combo">
                {s.keys.map((k, i) => (
                  <span key={i} className="kbd">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-card">
        <div className="section-title">
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <MousePointerClick size={13} /> {t.popup.shortcuts.gesturesTitle}
          </span>
        </div>
        <div className="shortcut-list">
          <div className="shortcut-row">
            <span className="shortcut-name">{t.popup.shortcuts.smoothAudioScrub}</span>
            <span className="kbd" style={{ fontSize: 9.5 }}>{t.popup.shortcuts.holdScrubKey}</span>
          </div>
          <div className="shortcut-row">
            <span className="shortcut-name">{t.popup.shortcuts.instantResponseRead}</span>
            <span className="kbd" style={{ fontSize: 9.5 }}>{t.popup.shortcuts.clickSpeechKey}</span>
          </div>
          <div className="shortcut-row">
            <span className="shortcut-name">{t.popup.shortcuts.directDownload}</span>
            <span className="kbd" style={{ fontSize: 9.5 }}>{t.popup.shortcuts.clickDownloadKey}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
