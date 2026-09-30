import { defineConfig } from 'vitest/config';

// `npm run sheet` renders a PNG contact sheet of Pips instead of running the tests.
export default defineConfig({
  test: { include: process.env.PIP_SHEET ? [process.env.PIP_SHEET_FILE ?? 'scripts/contact-sheet.test.ts'] : ['tests/**/*.test.ts'] },
});
