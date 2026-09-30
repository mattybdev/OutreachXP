// Data: backup/restore, settings, and a link to the Ping Lab. All data stays in this browser.

import { formatDate, isValidISODate, todayISO } from '../../game/dates';
import { parseState } from '../../game/storage';
import { emptyState } from '../../game/types';
import { plural, type AppContext } from '../context';
import { installMode, promptInstall, storagePersisted } from '../pwa';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function renderData(ctx: AppContext): string {
  const { settings, contacts, events, seasons } = ctx.state;
  return `<div class="data">
    <section class="panel">
      <h1>Your data</h1>
      <p>Everything is saved in <strong>this browser only</strong>. Nothing is sent to a server. Export a backup now and then, and to move to another computer or browser.</p>
      <p class="body2">${plural(seasons.length, 'season')} · ${plural(contacts.length, 'contact')} · ${plural(events.length, 'logged action')}</p>
      <div class="button-row">
        <button class="btn btn-primary" type="button" data-action="export">Export backup</button>
        <label class="btn btn-secondary file-btn">Import backup<input type="file" accept="application/json,.json" data-action="import" /></label>
      </div>
    </section>
    ${renderInstall()}
    <section class="panel">
      <h2>Follow-up reminders</h2>
      <form id="settings-form" class="grid-2" novalidate>
        <label class="field"><span>Remind me after (days without a reply)</span><input type="number" name="min" min="1" max="30" value="${settings.followUpMinDays}" /></label>
        <label class="field"><span>On-time bonus until (days)</span><input type="number" name="max" min="1" max="60" value="${settings.followUpMaxDays}" /></label>
        <p class="form-error" role="alert"></p>
        <div><button class="btn btn-secondary" type="submit">Save</button></div>
      </form>
    </section>
    <section class="panel">
      <h2>Active days and holidays</h2>
      <p class="body2">Your Ping’s meters only drain on active days. Streaks count weeks with outreach; a week where every active day is marked as time off never breaks a streak.</p>
      <div class="weekdays" role="group" aria-label="Active days">${WEEKDAYS.map((d, i) => `<label class="check">
          <input type="checkbox" data-weekday="${i}" ${settings.activeDays.includes(i) ? 'checked' : ''} /> <span>${d}</span></label>`).join('')}</div>
      <h3>Holidays and time off</h3>
      ${settings.holidays.length
        ? `<ul class="holiday-list">${settings.holidays.map((h) => `<li><span>${formatDate(h)}</span><button class="link-button" type="button" data-remove-holiday="${h}">Remove</button></li>`).join('')}</ul>`
        : '<p class="body2">None yet.</p>'}
      <form id="holiday-form" class="inline-form" novalidate>
        <label class="field"><span>Add a day off</span><input type="date" name="holiday" required /></label>
        <button class="btn btn-secondary" type="submit">Add</button>
      </form>
    </section>
    <section class="panel">
      <h2>Tools</h2>
      <p><a href="./lab.html">Open the Ping Lab</a> <span class="body2">to preview how Ping grows with different stats.</span></p>
    </section>
    <section class="panel danger">
      <h2>Reset</h2>
      <p class="body2">Deletes every season, contact and logged action in this browser. Export a backup first.</p>
      <button class="btn btn-secondary" type="button" data-action="reset">Delete all data</button>
    </section>
  </div>`;
}

function renderInstall(): string {
  const mode = installMode();
  const persisted = storagePersisted();
  const body = {
    installed: `<p>You’re using the installed app. It works offline, and its icon shows how many follow-ups are due.</p>`,
    prompt: `<p>Install OutreachXP to open it from your home screen, dock or app list and use it offline. Your data stays the same.</p>
      <div class="button-row"><button class="btn btn-primary" type="button" data-action="install">Install app</button></div>`,
    ios: `<ol class="install-steps">
        <li>Tap <strong>Share</strong> (the square with an arrow) in Safari’s toolbar.</li>
        <li>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
      </ol>
      <p class="body2">On iPhone and iPad the installed app keeps its own copy of your data, separate from Safari’s. Export a backup here first, then import it in the app.</p>`,
    manual: `<p>Look for <strong>Install</strong> or <strong>Add to Home Screen</strong> in your browser’s menu or address bar. Chrome and Edge can install it on computers and Android, and Safari can on iPhone, iPad and Mac (<strong>File → Add to Dock</strong>).</p>`,
  }[mode];
  const storage = persisted === true
    ? '<p class="body2">✓ This browser has agreed to keep your data even if the device runs low on space.</p>'
    : persisted === false
      ? '<p class="body2">This browser may clear saved data if the device runs low on space. Installing the app usually prevents that, but backups are the safest bet.</p>'
      : '';
  return `<section class="panel">
      <h2>Install the app</h2>
      ${body}
      ${storage}
    </section>`;
}

export function bindData(root: HTMLElement, ctx: AppContext): void {
  root.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'install') promptInstall().then(() => ctx.navigate('data'));
    if (action === 'export') {
      const blob = new Blob([JSON.stringify(ctx.state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `outreachxp-backup-${todayISO()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    if (action === 'reset' && confirm('Delete all OutreachXP data in this browser? This cannot be undone.')) {
      ctx.commit(emptyState());
      ctx.toast('All data deleted.');
      ctx.navigate('season');
    }
  });

  root.querySelector<HTMLInputElement>('[data-action="import"]')?.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const next = parseState(JSON.parse(await file.text()));
      if (!confirm(`Replace all current data with this backup (${plural(next.contacts.length, 'contact')}, ${plural(next.events.length, 'logged action')})?`)) return;
      ctx.commit(next);
      ctx.toast('Backup restored.');
      ctx.navigate(next.currentSeasonId ? 'home' : 'season');
    } catch (err) {
      ctx.toast(err instanceof SyntaxError ? 'That file isn’t valid JSON.' : (err as Error).message, 'error');
    }
  });

  root.querySelectorAll<HTMLInputElement>('[data-weekday]').forEach((box) => box.addEventListener('change', () => {
    const days = [...root.querySelectorAll<HTMLInputElement>('[data-weekday]')].filter((b) => b.checked).map((b) => Number(b.dataset.weekday));
    if (!days.length) {
      box.checked = true;
      ctx.toast('Keep at least one active day.', 'error');
      return;
    }
    ctx.commit({ ...ctx.state, settings: { ...ctx.state.settings, activeDays: days } });
    ctx.toast('Active days saved.');
  }));
  root.addEventListener('click', (e) => {
    const day = (e.target as HTMLElement).closest<HTMLElement>('[data-remove-holiday]')?.dataset.removeHoliday;
    if (!day) return;
    ctx.commit({ ...ctx.state, settings: { ...ctx.state.settings, holidays: ctx.state.settings.holidays.filter((h) => h !== day) } });
  });
  const holidayForm = root.querySelector<HTMLFormElement>('#holiday-form')!;
  holidayForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const day = String(new FormData(holidayForm).get('holiday') ?? '');
    if (!isValidISODate(day)) return ctx.toast('Pick a date first.', 'error');
    const holidays = [...new Set([...ctx.state.settings.holidays, day])].sort();
    ctx.commit({ ...ctx.state, settings: { ...ctx.state.settings, holidays } });
    ctx.toast(`${formatDate(day)} marked as a day off.`);
  });

  const form = root.querySelector<HTMLFormElement>('#settings-form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const min = Number(data.get('min')), max = Number(data.get('max'));
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min || max > 60) {
      form.querySelector('.form-error')!.textContent = 'Use whole days, with the bonus window at least as long as the reminder.';
      return;
    }
    ctx.commit({ ...ctx.state, settings: { ...ctx.state.settings, followUpMinDays: min, followUpMaxDays: max } });
    ctx.toast('Settings saved.');
  });
}
