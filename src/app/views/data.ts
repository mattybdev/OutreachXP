// Data: backup/restore, settings, and a link to the Ping Lab. All data stays in this browser.

import { todayISO } from '../../game/dates';
import { parseState } from '../../game/storage';
import { emptyState } from '../../game/types';
import { plural, type AppContext } from '../context';

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

export function bindData(root: HTMLElement, ctx: AppContext): void {
  root.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
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

  const form = root.querySelector<HTMLFormElement>('#settings-form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const min = Number(data.get('min')), max = Number(data.get('max'));
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min || max > 60) {
      form.querySelector('.form-error')!.textContent = 'Use whole days, with the bonus window at least as long as the reminder.';
      return;
    }
    ctx.commit({ ...ctx.state, settings: { followUpMinDays: min, followUpMaxDays: max } });
    ctx.toast('Settings saved.');
  });
}
