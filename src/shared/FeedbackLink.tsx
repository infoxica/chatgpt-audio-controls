import type { ThemePreference } from './ThemeSelect';
import { feedbackURL } from './feedback';
import { getReleaseCopy } from './i18n/release-copy';

export function FeedbackLink({ language, theme = 'system' }: { language: string; theme?: ThemePreference }) {
  const url = feedbackURL(language, 'installed', undefined, theme);
  return url ? <a className="feedback-link" href={url} target="_blank" rel="noreferrer">{getReleaseCopy(language).send} ↗</a> : null;
}
