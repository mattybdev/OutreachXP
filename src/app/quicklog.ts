// Quick Log (GDD §8.1): log a new email or an update in a few taps, with a live XP preview.

import { logNewOutreach, logUpdate } from '../game/actions';
import { todayISO } from '../game/dates';
import { allowedActions, computeSeason } from '../game/engine';
import { EVENT_HINT, EVENT_LABEL, STATUS_LABEL } from '../game/rules';
import { CATEGORIES, CATEGORY_LABEL, type Category, type EventType, type GameState } from '../game/types';
import { categoryChip, esc, relativeDay, threadViews, type AppContext, type QuickLogOptions, type ThreadView } from './context';

interface LogState {
  mode: 'new' | 'update';
  threadId: string | null;
  action: EventType | null;
}

export function openQuickLog(dialog: HTMLDialogElement, getCtx: () => AppContext, options: QuickLogOptions = {}): void {
  const ctx = getCtx();
  const today = todayISO();
  const views = threadViews(ctx.state, today).filter((v) => v.status !== 'closed');
  const ls: LogState = { mode: options.mode ?? 'new', threadId: options.threadId ?? null, action: null };
  const orgs = [...new Set(ctx.state.contacts.map((c) => c.org).filter(Boolean))].sort();

  dialog.innerHTML = `<form id="ql-form" novalidate>
    <header class="modal-head">
      <h2 id="quicklog-title">Log outreach</h2>
      <button class="icon-button" type="button" data-close aria-label="Close">×</button>
    </header>
    <div class="segmented ql-modes" role="radiogroup" aria-label="What are you logging?">
      <button type="button" role="radio" data-mode="new">I sent a new email</button>
      <button type="button" role="radio" data-mode="update" ${views.length ? '' : 'disabled'}>Update a contact</button>
    </div>

    <div data-panel="new">
      <div class="grid-2">
        <label class="field"><span>Name</span><input name="name" autocomplete="off" maxlength="80" placeholder="Dr. Jane Rivera" /></label>
        <label class="field"><span>Organization</span><input name="org" list="ql-orgs" autocomplete="off" maxlength="120" placeholder="State University" /></label>
      </div>
      <datalist id="ql-orgs">${orgs.map((o) => `<option value="${esc(o)}"></option>`).join('')}</datalist>
      <fieldset class="field"><legend>Category</legend>${categoryPicker('category')}</fieldset>
      <div class="grid-2">
        <label class="field"><span>Email <span class="body2">(optional)</span></span><input name="email" type="email" autocomplete="off" maxlength="120" /></label>
        <label class="check"><input type="checkbox" name="personalized" /> <span>Personalized <span class="body2">(not a template blast) +5 XP</span></span></label>
      </div>
    </div>

    <div data-panel="update">
      <div data-picker>
        <input type="search" name="find" placeholder="Find a contact" aria-label="Find a contact" autocomplete="off" />
        <ul class="pick-list" data-list></ul>
      </div>
      <div data-selected></div>
      <div class="actions" data-actions role="radiogroup" aria-label="What happened?"></div>
      <div data-extra="cc" hidden><label class="field"><span>How many people did they CC or forward to?</span><input name="count" type="number" min="1" max="50" value="1" /></label></div>
      <div data-extra="referred" hidden>
        <p class="body2">Who did they introduce you to? They’ll appear in your pipeline as “To contact”, and every step with them earns a 1.25× warm-intro bonus.</p>
        <div class="grid-2">
          <label class="field"><span>Their name</span><input name="refName" autocomplete="off" maxlength="80" /></label>
          <label class="field"><span>Organization</span><input name="refOrg" list="ql-orgs" autocomplete="off" maxlength="120" /></label>
        </div>
        <fieldset class="field"><legend>Category</legend>${categoryPicker('refCategory')}</fieldset>
      </div>
      <div data-extra="sent" hidden><label class="check"><input type="checkbox" name="updPersonalized" /> <span>Personalized <span class="body2">+5 XP</span></span></label></div>
    </div>

    <div class="grid-2">
      <label class="field"><span>When</span><input type="date" name="date" max="${today}" value="${today}" /></label>
      <label class="field"><span>Note <span class="body2">(optional)</span></span><input name="note" maxlength="200" placeholder="Subject line or quick note" /></label>
    </div>
    <div class="ql-preview" aria-live="polite"></div>
    <p class="form-error" role="alert"></p>
    <footer class="modal-foot">
      <button class="btn btn-secondary" type="button" data-close>Cancel</button>
      <button class="btn btn-primary" type="submit">Log it</button>
    </footer>
  </form>`;

  const form = dialog.querySelector<HTMLFormElement>('#ql-form')!;
  const q = <T extends Element>(sel: string) => form.querySelector<T>(sel)!;
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const errorEl = q<HTMLElement>('.form-error');

  const selectedView = (): ThreadView | undefined => views.find((v) => v.thread.id === ls.threadId);

  function pending(): ((s: GameState) => GameState) | null {
    const date = field('date').value;
    const note = field('note').value;
    if (ls.mode === 'new') {
      const category = (form.querySelector<HTMLInputElement>('input[name="category"]:checked')?.value ?? '') as Category;
      if (!field('name').value.trim() || !category) return null;
      return (s) => logNewOutreach(s, {
        name: field('name').value, org: field('org').value, email: field('email').value, category,
        personalized: field('personalized').checked, date, note,
      }, new Date(), today).state;
    }
    const view = selectedView();
    if (!view || !ls.action) return null;
    const action = ls.action;
    const refCategory = (form.querySelector<HTMLInputElement>('input[name="refCategory"]:checked')?.value ?? '') as Category;
    return (s) => logUpdate(s, view.thread.id, action, {
      date, note,
      count: Number(field('count').value),
      personalized: field('updPersonalized').checked,
      referral: action === 'referred' ? { name: field('refName').value, org: field('refOrg').value, category: refCategory } : undefined,
    }, new Date(), today);
  }

  function refresh(): void {
    form.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === ls.mode)));
    q<HTMLElement>('[data-panel="new"]').hidden = ls.mode !== 'new';
    q<HTMLElement>('[data-panel="update"]').hidden = ls.mode !== 'update';
    if (ls.mode === 'update') refreshUpdate();
    refreshPreview();
  }

  function refreshUpdate(): void {
    const view = selectedView();
    q<HTMLElement>('[data-picker]').hidden = !!view;
    if (!view) {
      const term = field('find').value.trim().toLowerCase();
      const matches = views
        .filter((v) => !term || `${v.contact.name} ${v.contact.org}`.toLowerCase().includes(term))
        .sort((a, b) => Number(b.due) - Number(a.due) || (b.lastDate ?? '').localeCompare(a.lastDate ?? ''))
        .slice(0, 8);
      q<HTMLElement>('[data-list]').innerHTML = matches.map((v) => `<li><button type="button" data-pick="${v.thread.id}">
          <strong>${esc(v.contact.name)}</strong> ${categoryChip(v.contact.category)}
          <span class="body2">${esc(v.contact.org)}${v.contact.org ? ' · ' : ''}${v.due ? 'follow-up due' : `${STATUS_LABEL[v.status]}`}</span>
        </button></li>`).join('') || '<li class="body2">No matching contacts.</li>';
      q<HTMLElement>('[data-selected]').innerHTML = '';
      q<HTMLElement>('[data-actions]').innerHTML = '';
    } else {
      q<HTMLElement>('[data-selected]').innerHTML = `<div class="selected">
          <span><strong>${esc(view.contact.name)}</strong> ${categoryChip(view.contact.category)}<br>
          <span class="body2">${esc(view.contact.org)}${view.contact.org ? ' · ' : ''}${STATUS_LABEL[view.status]}${view.lastDate ? `, last action ${relativeDay(view.lastDate)}` : ''}</span></span>
          <button class="link-button" type="button" data-unpick>Change</button>
        </div>`;
      const allowed = allowedActions(view.status);
      if (ls.action && !allowed.includes(ls.action)) ls.action = null;
      if (!ls.action && view.status === 'queued') ls.action = 'sent';
      q<HTMLElement>('[data-actions]').innerHTML = allowed.map((a) => `<button type="button" role="radio" data-act="${a}" aria-checked="${ls.action === a}">
          <strong>${EVENT_LABEL[a]}</strong><span>${EVENT_HINT[a]}</span></button>`).join('');
    }
    for (const extra of ['cc', 'referred', 'sent'] as const) q<HTMLElement>(`[data-extra="${extra}"]`).hidden = ls.action !== extra;
    const refCat = form.querySelector<HTMLInputElement>('input[name="refCategory"]:checked');
    if (ls.action === 'referred' && view && !refCat) {
      form.querySelector<HTMLInputElement>(`input[name="refCategory"][value="${view.contact.category}"]`)!.checked = true;
      if (!field('refOrg').value) field('refOrg').value = view.contact.org;
    }
  }

  function refreshPreview(): void {
    errorEl.textContent = '';
    const preview = q<HTMLElement>('.ql-preview');
    const fn = pending();
    if (!fn) {
      preview.innerHTML = `<span class="body2">${ls.mode === 'new' ? 'Add a name and category to see your XP.' : 'Pick a contact and what happened.'}</span>`;
      return;
    }
    try {
      const state = getCtx().state;
      const next = fn(state);
      const before = new Set(state.events.map((e) => e.id));
      const summary = computeSeason(next, next.currentSeasonId!);
      const added = summary.entries.filter((e) => !before.has(e.event.id));
      const xp = added.reduce((sum, e) => sum + e.xp, 0);
      const parts = added.flatMap((e) => e.parts).filter((p) => p.xp || p.label.includes('limit'));
      preview.innerHTML = `<span class="xp-gain">+${xp} XP</span> <span class="body2">${parts.map((p) => `${esc(p.label)}${p.xp ? ` +${p.xp}` : ''}`).join(' · ')}</span>`;
    } catch (err) {
      preview.innerHTML = `<span class="body2">${esc((err as Error).message)}</span>`;
    }
  }

  form.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-close]')) dialog.close();
    const mode = el.closest<HTMLElement>('[data-mode]')?.dataset.mode as LogState['mode'] | undefined;
    if (mode) { ls.mode = mode; refresh(); }
    const pick = el.closest<HTMLElement>('[data-pick]')?.dataset.pick;
    if (pick) { ls.threadId = pick; ls.action = null; refresh(); }
    if (el.closest('[data-unpick]')) { ls.threadId = null; ls.action = null; refresh(); field('find').focus(); }
    const act = el.closest<HTMLElement>('[data-act]')?.dataset.act as EventType | undefined;
    if (act) { ls.action = act; refresh(); }
  });
  form.addEventListener('input', (e) => {
    if ((e.target as HTMLElement).getAttribute('name') === 'find') refreshUpdate();
    refreshPreview();
  });
  form.addEventListener('change', refreshPreview);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fn = pending();
    if (!fn) {
      errorEl.textContent = ls.mode === 'new' ? 'Add a name and pick a category.' : 'Pick a contact and what happened.';
      return;
    }
    try {
      const c = getCtx();
      const next = fn(c.state);
      dialog.close();
      c.commit(next, c.state);
    } catch (err) {
      errorEl.textContent = (err as Error).message;
    }
  });

  refresh();
  dialog.showModal();
  (ls.mode === 'new' ? field('name') : ls.threadId ? form.querySelector<HTMLElement>('[data-act]') ?? field('date') : field('find'))?.focus();
}

function categoryPicker(name: string): string {
  return `<div class="cat-picker">${CATEGORIES.map((c) => `<label class="cat-option cat-${c}">
      <input type="radio" name="${name}" value="${c}" /><span>${CATEGORY_LABEL[c]}</span></label>`).join('')}</div>`;
}
