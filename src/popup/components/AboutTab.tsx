import React from "react";
import { Sparkles, ShieldCheck, BookOpen, Bug, Globe } from "lucide-react";
import { GithubIcon } from "../../shared/GithubIcon";
import { EXTENSION_VERSION } from "../../shared/constants";
import { TranslationSchema } from "../../shared/i18n";
import { resolveLanguage } from "../../shared/i18n/core";
import { getReleaseCopy } from "../../shared/i18n/release-copy";
import config from "../../../config/release.json";

interface AboutTabProps {
  t: TranslationSchema;
  language: string;
}

export const AboutTab: React.FC<AboutTabProps> = ({ t, language }) => {
  const locale = resolveLanguage(language);
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
        <h2 style={{ fontSize: 14, fontWeight: 700 }}>{t.popup.about.title}</h2>
        <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          {t.common.version}{EXTENSION_VERSION} • {t.popup.about.byInfoxica}
        </span>
        <p style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.4 }}>
          {t.popup.about.description}
        </p>
      </div>

      <div className="section-card">
        <div className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={14} color="var(--accent)" /> {t.popup.about.privacyTitle}
            </span>
            <span className="toggle-desc">{t.popup.about.privacyDesc}</span>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="shortcut-list">
          <a href={`${config.siteUrl}${locale === 'en' ? '' : locale + '/'}`} target="_blank" rel="noreferrer" className="shortcut-row" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="shortcut-name" style={{ display: "flex", alignItems: "center", gap: 6 }}><Globe size={13} /> {getReleaseCopy(language).website}</span>
            <span aria-hidden="true">↗</span>
          </a>
          <a
            href="https://github.com/infoxica/chatgpt-audio-controls"
            target="_blank"
            rel="noreferrer"
            className="shortcut-row"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <span className="shortcut-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <GithubIcon size={13} /> {t.popup.about.githubRepo}
            </span>
            <span className="kbd">{t.common.star}</span>
          </a>

          <a
            href="https://github.com/infoxica/chatgpt-audio-controls#readme"
            target="_blank"
            rel="noreferrer"
            className="shortcut-row"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <span className="shortcut-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <BookOpen size={13} /> {t.popup.about.documentation}
            </span>
            <span className="kbd">{t.common.docs}</span>
          </a>

          <a
            href="https://github.com/infoxica/chatgpt-audio-controls/issues"
            target="_blank"
            rel="noreferrer"
            className="shortcut-row"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <span className="shortcut-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Bug size={13} /> {t.popup.about.reportIssue}
            </span>
            <span className="kbd">{t.common.issues}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
