import React from "react";
import { Volume2, Sun, Moon, ExternalLink } from "lucide-react";

interface HeaderProps {
  theme: "dark" | "light" | "system";
  onToggleTheme: () => void;
  onOpenOptions: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme, onOpenOptions }) => {
  return (
    <header className="popup-header">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <Volume2 size={16} strokeWidth={2.5} />
        </div>
        <div className="brand-info">
          <h1>ChatGPT Audio</h1>
          <span>Controls & Read Aloud</span>
        </div>
      </div>
      <div className="header-actions">
        <button
          className="icon-button"
          onClick={onToggleTheme}
          title={`Switch Theme (Current: ${theme})`}
          aria-label="Toggle Theme"
        >
          {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        <button
          className="icon-button"
          onClick={onOpenOptions}
          title="Open Dashboard & Settings"
          aria-label="Settings"
        >
          <ExternalLink size={15} />
        </button>
      </div>
    </header>
  );
};
