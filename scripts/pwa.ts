// Build step for the installable app: writes sw.js with the list of files to save for offline use.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

/** Every file under `dir`, as forward-slash paths relative to it. */
export function listFiles(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path, root) : [relative(root, path).split('\\').join('/')];
  });
}

/** The files the service worker saves: the built pages and assets plus the public folder. */
export function precacheList(bundleFiles: string[], publicFiles: string[]): string[] {
  const skip = (f: string) => f === 'sw.js' || f.endsWith('.map');
  return [...new Set([...bundleFiles, ...publicFiles])].filter((f) => !skip(f)).sort();
}

/** Fill in the service worker template. The version changes whenever any saved file changes. */
export function buildServiceWorker(template: string, files: string[], contentHash: string): string {
  const version = createHash('sha256').update(contentHash).update(files.join('\n')).digest('hex').slice(0, 12);
  return template.replace('__VERSION__', JSON.stringify(version)).replace('__FILES__', JSON.stringify(files));
}

export function pwa(): Plugin {
  let publicDir = '';
  return {
    name: 'outreachxp-pwa',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    generateBundle(_options, bundle) {
      const publicFiles = publicDir ? listFiles(publicDir) : [];
      const files = precacheList(Object.keys(bundle), publicFiles);
      const hash = createHash('sha256');
      for (const [name, item] of Object.entries(bundle).sort(([a], [b]) => a.localeCompare(b))) {
        hash.update(name).update(item.type === 'chunk' ? item.code : item.source);
      }
      for (const f of publicFiles) hash.update(f).update(readFileSync(join(publicDir, f)));
      const template = readFileSync(new URL('../src/pwa/sw.template.js', import.meta.url), 'utf8');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: buildServiceWorker(template, files, hash.digest('hex')) });
    },
  };
}
