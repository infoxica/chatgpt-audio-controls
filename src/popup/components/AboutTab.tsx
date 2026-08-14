import React from "react";
import { Sparkles, ShieldCheck, BookOpen, Bug } from "lucide-react";
import { GithubIcon } from "../../shared/GithubIcon";

export const AboutTab: React.FC = () => {
  return (
    <div className="popup-body">
      <div className="section-card" style={{ textAlign: "center", alignItems: "center", padding: "18px 14px" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "linear-gradient(135deg, #3968c8, #2d55ad)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            marginBottom: 8,
            boxShadow: "0 4px 12px rgba(16, 163, 127, 0.3)",
          }}
        >
          <Sparkles size={22} />
        </div>
        <h2 style={{ fontSize: 14, fontWeight: 700 }}>ChatGPT Audio Controls</h2>
        <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          v1.0.0 • Open Source by Infoxica
        </span>
        <p style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.4 }}>
          Elevating ChatGPT's voice experience with seamless audio scrubbing, dynamic speed presets, 
          direct audio downloads, and one-click speech triggers.
        </p>
      </div>

      <div className="section-card">
        <div className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={14} color="var(--accent)" /> 100% Privacy Focused
            </span>
            <span className="toggle-desc">No trackers, no telemetry. Everything runs on your machine.</span>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="shortcut-list">
          <a
            href="https://github.com/infoxica/chatgpt-audio-controls"
            target="_blank"
            rel="noreferrer"
            className="shortcut-row"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <span className="shortcut-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <GithubIcon size={13} /> GitHub Repository
            </span>
            <span className="kbd">★ Star</span>
          </a>

          <a
            href="https://github.com/infoxica/chatgpt-audio-controls#readme"
            target="_blank"
            rel="noreferrer"
            className="shortcut-row"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <span className="shortcut-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <BookOpen size={13} /> Documentation
            </span>
            <span className="kbd">Docs</span>
          </a>

          <a
            href="https://github.com/infoxica/chatgpt-audio-controls/issues"
            target="_blank"
            rel="noreferrer"
            className="shortcut-row"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <span className="shortcut-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Bug size={13} /> Report an Issue
            </span>
            <span className="kbd">Issues</span>
          </a>
        </div>
      </div>
    </div>
  );
};
