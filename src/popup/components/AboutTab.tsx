import type { ThemePreference } from '../../shared/ThemeSelect';
import { SupportCard } from "../../shared/SupportCard";
import React from "react";
import { Sparkles, ShieldCheck, BookOpen, Bug, Globe, CirclePlay, ArrowUpRight } from "lucide-react";
import { tourCopy } from '../../shared/i18n/tour';
import { GithubIcon } from "../../shared/GithubIcon";
import { EXTENSION_VERSION } from "../../shared/constants";
import { TranslationSchema } from "../../shared/i18n";
import { websiteURL } from "../../shared/website";
import { getReleaseCopy } from "../../shared/i18n/release-copy";


interface AboutTabProps {
  t: TranslationSchema;
  language: string;
  theme: ThemePreference;
}

export const AboutTab: React.FC<AboutTabProps> = ({ t, language, theme }) => {
  return (
    <div className="popup-body popup-about">
      <div className="section-card about-intro" style={{ textAlign: "center", alignItems: "center", padding: "18px 14px" }}>
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
        <h2 style={{ fontSize: 19, fontWeight: 400 }}>{t.popup.about.title}</h2>
        <span style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
          {t.common.version}{EXTENSION_VERSION} • {t.popup.about.byInfoxica}
        </span>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.55 }}>
          {getReleaseCopy(language).siteIntro}
        </p>
        <a href="../tour/index.html" target="_blank" rel="noreferrer" className="feature-tour-link">
          <CirclePlay size={18} aria-hidden="true" />{tourCopy(language).title}<ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>

      <SupportCard language={language} theme={theme} surface="popup" />

      <div className="section-card">
        <div className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={14} color="var(--accent)" /> {t.popup.about.privacyTitle}
            </span>
            <span className="toggle-desc">{getReleaseCopy(language).privacyBody}</span>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="shortcut-list">

          <a href={websiteURL(language, 'popup')} target="_blank" rel="noreferrer" className="shortcut-row" style={{ textDecoration: "none", color: "inherit" }}>
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
