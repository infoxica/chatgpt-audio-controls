import React from "react";
import { Keyboard, MousePointerClick } from "lucide-react";
import { SHORTCUTS } from "../../shared/constants";

export const ShortcutsDrawer: React.FC = () => {
  return (
    <div className="popup-body">
      <div className="section-card">
        <div className="section-title">
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Keyboard size={13} /> Keyboard Shortcuts
          </span>
        </div>
        <div className="shortcut-list">
          {SHORTCUTS.map((s) => (
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
            <MousePointerClick size={13} /> Mouse & Touch Gestures
          </span>
        </div>
        <div className="shortcut-list">
          <div className="shortcut-row">
            <span className="shortcut-name">Smooth Audio Scrub</span>
            <span className="kbd" style={{ fontSize: 9.5 }}>Hold ◀10 / 10▶</span>
          </div>
          <div className="shortcut-row">
            <span className="shortcut-name">Instant Response Read</span>
            <span className="kbd" style={{ fontSize: 9.5 }}>Click 🔈 button</span>
          </div>
          <div className="shortcut-row">
            <span className="shortcut-name">Direct Download</span>
            <span className="kbd" style={{ fontSize: 9.5 }}>Click 📥 button</span>
          </div>
        </div>
      </div>
    </div>
  );
};
