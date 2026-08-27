import React from "react";
import { Sun, Moon, ExternalLink } from "lucide-react";
import { ChatGPTAudioIcon } from "../../shared/ChatGPTAudioIcon";
import { TranslationSchema } from "../../shared/i18n";

interface HeaderProps {
  theme: "dark" | "light" | "system";
  onToggleTheme: () => void;
  onOpenOptions: () => void;
  t: TranslationSchema;
}

export const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme, onOpenOptions, t }) => {
  return (
    <header className="popup-header">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <ChatGPTAudioIcon size={20} />
        </div>
        <div className="brand-info">
          <h1>{t.common.extensionName}</h1>
          <span>{t.common.extensionSubtitle}</span>
        </div>
      </div>
      <div className="header-actions">
        <button
          className="icon-button"
          onClick={onToggleTheme}
          title={`${t.popup.header.switchTheme} (${theme})`}
          aria-label={t.popup.header.switchTheme}
        >
          {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        <button
          className="icon-button"
          onClick={onOpenOptions}
          title={t.popup.header.openOptions}
          aria-label={t.popup.header.openOptions}
        >
          <ExternalLink size={15} />
        </button>
      </div>
    </header>
  );
};
