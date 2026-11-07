import labels from './tour.json';
import { resolveLanguage } from './core';
export function tourCopy(language?: string) {
  const [title,back,next,skip] = labels[resolveLanguage(language)];
  return {title,back,next,skip};
}
