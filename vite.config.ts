import { defineConfig } from 'vite';

// Relative base so the build works on a GitHub Pages project URL (/<repo>/).
// Two pages: the game (index.html) and the Ping Lab tuning page (lab.html).
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: { main: 'index.html', lab: 'lab.html' },
    },
  },
});
