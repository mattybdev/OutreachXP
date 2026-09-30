import { defineConfig } from 'vite';
import { pwa } from './scripts/pwa';

// Relative base so the build works on a GitHub Pages project URL (/<repo>/).
// Two pages: the game (index.html) and the Ping Lab tuning page (lab.html).
// The pwa plugin writes the service worker that lets the installed app work offline.
export default defineConfig({
  base: './',
  plugins: [pwa()],
  build: {
    rollupOptions: {
      input: { main: 'index.html', lab: 'lab.html' },
    },
  },
});
