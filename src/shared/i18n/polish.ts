import copy from './polish.json';
import { resolveLanguage } from './core';
export function polishCopy(language?: string): typeof copy.en {
  return copy[resolveLanguage(language) as keyof typeof copy] || copy.en;
}
