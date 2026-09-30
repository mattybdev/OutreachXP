import { defineConfig } from 'vitest/config';

// `npm run sheet` renders a PNG contact sheet of Pings instead of running the tests.
export default defineConfig({
  test: { include: process.env.PING_SHEET ? [process.env.PING_SHEET_FILE ?? 'scripts/contact-sheet.test.ts'] : ['tests/**/*.test.ts'] },
});
