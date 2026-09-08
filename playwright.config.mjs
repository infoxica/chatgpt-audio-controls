import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/browser', testMatch: '**/*.pw.mjs', timeout: 45000, workers: 1, reporter: 'list', outputDir: 'build/browser-results' });
