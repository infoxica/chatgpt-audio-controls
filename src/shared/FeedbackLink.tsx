import { feedbackURL } from './feedback';
import { getReleaseCopy } from './i18n/release-copy';

export function FeedbackLink({ language }: { language: string }) {
  const url = feedbackURL(language, 'installed');
  return url ? <a className="feedback-link" href={url} target="_blank" rel="noreferrer">{getReleaseCopy(language).send} ↗</a> : null;
}
