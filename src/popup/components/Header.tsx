import { ThemeSelect, ThemePreference } from '../../shared/ThemeSelect';
import React from "react";
import { ExternalLink } from "lucide-react";
import { ChatGPTAudioIcon } from "../../shared/ChatGPTAudioIcon";
import { TranslationSchema } from "../../shared/i18n";

interface HeaderProps {
  theme: "dark" | "light" | "system";
  onThemeChange: (theme: ThemePreference) => void;
  language: string;
  onOpenOptions: () => void;
  t: TranslationSchema;
}

export const Header: React.FC<HeaderProps> = ({ theme, onThemeChange, language, onOpenOptions, t }) => {
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
        <ThemeSelect value={theme} onChange={onThemeChange} language={language} />
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
