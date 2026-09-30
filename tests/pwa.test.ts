import { describe, expect, it } from 'vitest';
import { buildServiceWorker, precacheList } from '../scripts/pwa';

describe('service worker build', () => {
  it('saves pages, assets and public files, but not itself or source maps', () => {
    const files = precacheList(['index.html', 'assets/main-abc.js', 'assets/main-abc.js.map', 'sw.js'], ['favicon.svg', 'icons/icon-192.png', 'index.html']);
    expect(files).toEqual(['assets/main-abc.js', 'favicon.svg', 'icons/icon-192.png', 'index.html']);
  });

  it('fills in the template, with a version that changes when the files change', () => {
    const template = 'const VERSION = __VERSION__;\nconst FILES = __FILES__;';
    const a = buildServiceWorker(template, ['index.html'], 'hash-1');
    const b = buildServiceWorker(template, ['index.html'], 'hash-2');
    expect(a).toMatch(/^const VERSION = "[0-9a-f]{12}";\nconst FILES = \["index.html"\];$/);
    expect(a).not.toEqual(b);
    expect(buildServiceWorker(template, ['index.html'], 'hash-1')).toEqual(a);
  });
});
