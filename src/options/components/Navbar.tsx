import React from "react";
import { Sliders, Keyboard, HelpCircle, Moon, Sun } from "lucide-react";
import { GithubIcon } from "../../shared/GithubIcon";
import { ChatGPTAudioIcon } from "../../shared/ChatGPTAudioIcon";
import { TranslationSchema } from "../../shared/i18n";

export type DashboardSection = "settings" | "shortcuts" | "faq";

interface NavbarProps {
  currentSection: DashboardSection;
  onSelectSection: (sec: DashboardSection) => void;
  theme: "dark" | "light" | "system";
  onToggleTheme: () => void;
  t: TranslationSchema;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSection,
  onSelectSection,
  theme,
  onToggleTheme,
  t,
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
        <button className="btn-outline" onClick={onToggleTheme} style={{ width: "100%", justifyContent: "center" }}>
          {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          <span>{theme === "light" ? t.options.nav.darkMode : t.options.nav.lightMode}</span>
        </button>

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
