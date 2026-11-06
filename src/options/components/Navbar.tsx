import { ThemeSelect, ThemePreference } from '../../shared/ThemeSelect';
import React from "react";
import { Sliders, Keyboard, HelpCircle, Globe, CirclePlay } from "lucide-react";
import { tourCopy } from '../../shared/i18n/tour';
import { GithubIcon } from "../../shared/GithubIcon";
import { ChatGPTAudioIcon } from "../../shared/ChatGPTAudioIcon";
import { TranslationSchema } from "../../shared/i18n";
import { websiteURL } from "../../shared/website";
import { getReleaseCopy } from "../../shared/i18n/release-copy";


export type DashboardSection = "settings" | "shortcuts" | "faq";

interface NavbarProps {
  currentSection: DashboardSection;
  onSelectSection: (sec: DashboardSection) => void;
  theme: "dark" | "light" | "system";
  onThemeChange: (theme: ThemePreference) => void;
  t: TranslationSchema;
  language: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSection,
  onSelectSection,
  theme,
  onThemeChange,
  t,
  language,
}) => {
  const navItems: { id: DashboardSection; label: string; icon: React.ReactNode }[] = [
    { id: "settings", label: t.options.nav.preferences, icon: <Sliders size={16} /> },
    { id: "shortcuts", label: t.options.nav.shortcuts, icon: <Keyboard size={16} /> },
    { id: "faq", label: t.options.nav.faq, icon: <HelpCircle size={16} /> },
  ];

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon-lg">
          <ChatGPTAudioIcon size={26} />
        </div>
        <div>
          <h2>{t.options.nav.dashboardTitle}</h2>
          <span>{t.options.nav.dashboardSubtitle}</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-link ${currentSection === item.id ? "active" : ""}`}
            onClick={() => onSelectSection(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <ThemeSelect value={theme} onChange={onThemeChange} language={language} />
        <a href="../tour/index.html" target="_blank" rel="noreferrer" className="btn-outline" style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}>
          <CirclePlay size={16} aria-hidden="true" /><span>{tourCopy(language).title}</span>
        </a>
        <a href={websiteURL(language, 'sidebar')} target="_blank" rel="noreferrer" className="btn-outline" style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}>
          <Globe size={14} /><span>{getReleaseCopy(language).website}</span>
        </a>

        <a
          href="https://github.com/infoxica/chatgpt-audio-controls"
          target="_blank"
          rel="noreferrer"
          className="btn-outline"
          style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}
        >
          <GithubIcon size={14} />
          <span>{t.options.nav.githubRepo}</span>
        </a>
      </div>
    </aside>
  );
};
