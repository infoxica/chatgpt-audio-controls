import React from "react";
import { Keyboard, MousePointer, Sparkles } from "lucide-react";
import { SHORTCUTS } from "../../shared/constants";

export const ShortcutsGuide: React.FC = () => {
  return (
    <div className="settings-section">
      <div className="card">
        <div className="card-title">
          <Keyboard size={16} color="var(--accent)" />
          <span>Keyboard Shortcuts Reference</span>
        </div>
        <p className="card-desc">
          Accelerate your workflow with ergonomic single-hand and YouTube-standard playback hotkeys.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          {SHORTCUTS.map((s) => (
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
          <span>Mouse & Hold Scrub Gestures</span>
        </div>
        <p className="card-desc">
          Hold down either the ◀10s or 10s▶ buttons to smoothly scrub through long voice answers with dynamic acceleration:
        </p>

        <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>
          <li><strong>0.3s Hold:</strong> Enters smooth scrubbing mode (4× normal speed).</li>
          <li><strong>1.5s Hold:</strong> Accelerates to 10× seeking rate.</li>
          <li><strong>3.0s Hold:</strong> High-speed jump rate at 25× rate.</li>
          <li><strong>Release:</strong> Seamlessly locks to the desired position.</li>
        </ul>
      </div>
    </div>
  );
};
