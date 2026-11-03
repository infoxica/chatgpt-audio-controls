import copy from './coffee.json';
import { resolveLanguage } from './core';
export const coffeeCopy = (language?: string): string => copy[resolveLanguage(language) as keyof typeof copy] || copy.en;
