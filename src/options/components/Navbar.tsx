import { Sliders, PlayCircle, Keyboard, HelpCircle, Volume2, Moon, Sun } from "lucide-react";
import { GithubIcon } from "../../shared/GithubIcon";

export type DashboardSection = "settings" | "demo" | "shortcuts" | "faq";

interface NavbarProps {
  currentSection: DashboardSection;
  onSelectSection: (sec: DashboardSection) => void;
  theme: "dark" | "light" | "system";
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSection,
  onSelectSection,
  theme,
  onToggleTheme,
}) => {
  const navItems: { id: DashboardSection; label: string; icon: React.ReactNode }[] = [
    { id: "settings", label: "Preferences", icon: <Sliders size={16} /> },
    { id: "demo", label: "Interactive Player", icon: <PlayCircle size={16} /> },
    { id: "shortcuts", label: "Shortcuts & Gestures", icon: <Keyboard size={16} /> },
    { id: "faq", label: "FAQ & Troubleshooting", icon: <HelpCircle size={16} /> },
  ];

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon-lg">
          <Volume2 size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h2>ChatGPT Audio</h2>
          <span>Dashboard & Setup</span>
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
          <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
        </button>

        <a
          href="https://github.com/infoxica/chatgpt-audio-controls"
          target="_blank"
          rel="noreferrer"
          className="btn-outline"
          style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}
        >
          <GithubIcon size={14} />
          <span>GitHub Repo</span>
        </a>
      </div>
    </aside>
  );
};
