// Installable app support: offline service worker, update prompt, install button and icon badge.

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * How this browser can install the app:
 * installed (running as the app), prompt (we can show the browser's install dialog),
 * ios (Share → Add to Home Screen), or manual (use the browser's menu, if it supports it).
 */
export type InstallMode = 'installed' | 'prompt' | 'ios' | 'manual';

let deferredPrompt: InstallPromptEvent | null = null;
let justInstalled = false;
let registration: ServiceWorkerRegistration | null = null;
let persisted: boolean | null = null;
const DISMISS_KEY = 'outreachxp.installHintDismissed';

export function isStandalone(): boolean {
  return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function installMode(): InstallMode {
  if (isStandalone() || justInstalled) return 'installed';
  if (deferredPrompt) return 'prompt';
  if (isIOS()) return 'ios';
  return 'manual';
}

/** Show the browser's install dialog. Returns true if the player installed the app. */
export async function promptInstall(): Promise<boolean> {
  const event = deferredPrompt;
  if (!event) return false;
  deferredPrompt = null;
  await event.prompt();
  return (await event.userChoice).outcome === 'accepted';
}

export function installHintDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInstallHint(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // Not saved; the hint comes back next visit.
  }
}

/** Whether the browser has promised not to clear our saved data (null while unknown). */
export function storagePersisted(): boolean | null {
  return persisted;
}

/** Show the number of follow-ups due on the installed app's icon, where supported. */
export function setBadge(count: number): void {
  const nav = navigator as { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  if (count > 0) nav.setAppBadge?.(count).catch(() => undefined);
  else nav.clearAppBadge?.().catch(() => undefined);
}

/** Reload into the new version that is waiting. */
export function applyUpdate(): void {
  const waiting = registration?.waiting;
  if (!waiting) return location.reload();
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  waiting.postMessage('skip-waiting');
}

export interface PwaHooks {
  /** A new version has been downloaded and is ready. */
  onUpdateReady(): void;
  /** What install options the browser offers changed (e.g. the app was just installed). */
  onInstallChange(installed: boolean): void;
}

export function initPwa(hooks: PwaHooks): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    hooks.onInstallChange(false);
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    justInstalled = true;
    hooks.onInstallChange(true);
  });

  // Ask the browser not to clear our data under storage pressure; installed apps usually get this.
  navigator.storage?.persist?.()
    .then((ok) => (ok ? true : navigator.storage.persisted()))
    .then((ok) => (persisted = ok))
    .catch(() => undefined);

  // The service worker only exists in the built app, not the dev server.
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    registration = reg;
    // Only an update (not the very first install) needs a reload.
    const ready = () => reg.waiting && navigator.serviceWorker.controller && hooks.onUpdateReady();
    ready();
    reg.addEventListener('updatefound', () => {
      reg.installing?.addEventListener('statechange', ready);
    });
    // Installed apps can stay open for days, so look for a new version whenever they come back.
    let lastCheck = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastCheck < 30 * 60 * 1000) return;
      lastCheck = Date.now();
      reg.update().catch(() => undefined);
    });
  }).catch(() => undefined);
}
