// Pipeline: every contact this season, grouped by where they are, with follow-ups due first.

import { todayISO } from '../../game/dates';
import { EVENT_LABEL, STATUS_LABEL } from '../../game/rules';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '../../game/types';
import { categoryChip, esc, relativeDay, threadViews, type AppContext, type ThreadView } from '../context';

let filter: Category | 'all' = 'all';
let query = '';

const GROUPS: { key: string; label: string; match: (v: ThreadView) => boolean; collapsed?: boolean }[] = [
  { key: 'due', label: 'Follow-up due', match: (v) => v.due },
  { key: 'queued', label: STATUS_LABEL.queued, match: (v) => v.status === 'queued' },
  { key: 'sent', label: STATUS_LABEL.sent, match: (v) => v.status === 'sent' && !v.due },
  { key: 'replied', label: STATUS_LABEL.replied, match: (v) => v.status === 'replied' },
  { key: 'engaged', label: STATUS_LABEL.engaged, match: (v) => v.status === 'engaged' },
  { key: 'committed', label: STATUS_LABEL.committed, match: (v) => v.status === 'committed' },
  { key: 'converted', label: STATUS_LABEL.converted, match: (v) => v.status === 'converted' },
  { key: 'closed', label: STATUS_LABEL.closed, match: (v) => v.status === 'closed', collapsed: true },
];

export function renderPipeline(ctx: AppContext): string {
  const today = todayISO();
  const all = threadViews(ctx.state, today);
  const q = query.trim().toLowerCase();
  const views = all
    .filter((v) => filter === 'all' || v.contact.category === filter)
    .filter((v) => !q || `${v.contact.name} ${v.contact.org} ${v.contact.email ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => (a.lastDate ?? '9').localeCompare(b.lastDate ?? '9'));

  const filters = (['all', ...CATEGORIES] as const).map((c) => `<button type="button" role="radio" data-filter="${c}" aria-checked="${filter === c}">
      ${c === 'all' ? `All (${all.length})` : `${CATEGORY_LABEL[c]} (${all.filter((v) => v.contact.category === c).length})`}</button>`).join('');

  const groups = GROUPS.map((group) => {
    const items = views.filter(group.match);
    if (!items.length) return '';
    const cards = items.map((v) => card(v, today)).join('');
    const body = `<div class="cards">${cards}</div>`;
    return group.collapsed
      ? `<details class="group"><summary><h2>${group.label} <span class="count">${items.length}</span></h2></summary>${body}</details>`
      : `<section class="group ${group.key === 'due' ? 'group-due' : ''}"><h2>${group.label} <span class="count">${items.length}</span></h2>${body}</section>`;
  }).join('');

  return `<div class="pipeline">
    <div class="panel toolbar">
      <input type="search" id="pipeline-search" placeholder="Search name, organization or email" value="${esc(query)}" aria-label="Search contacts" />
      <div class="segmented" role="radiogroup" aria-label="Filter by category">${filters}</div>
      <button class="btn btn-primary" type="button" data-action="log">+ Log outreach</button>
    </div>
    ${all.length ? groups || '<p class="panel body2">No contacts match.</p>' : `<div class="panel empty">
      <h2>Your pipeline is empty</h2><p>Log an email you’ve sent and it will show up here, then track replies, CCs and commitments as they come in.</p>
      <button class="btn btn-primary" type="button" data-action="log">+ Log your first email</button></div>`}
  </div>`;
}

function card(v: ThreadView, today: string): string {
  const last = v.events.at(-1);
  const lastLabel = last ? `${EVENT_LABEL[last.type]} ${relativeDay(v.lastDate, today)}` : 'Not contacted yet';
  return `<button class="card ${v.due ? 'card-due' : ''}" type="button" data-thread="${v.thread.id}" aria-label="Log an update for ${esc(v.contact.name)}">
    <span class="card-top"><strong>${esc(v.contact.name)}</strong>${categoryChip(v.contact.category)}</span>
    ${v.contact.org ? `<span class="card-org">${esc(v.contact.org)}</span>` : ''}
    <span class="body2">${esc(v.due ? `Follow-up due · sent ${relativeDay(v.lastDate, today)}` : lastLabel)}</span>
    ${v.referrer ? `<span class="badge">Warm intro from ${esc(v.referrer.name)}</span>` : ''}
  </button>`;
}

export function bindPipeline(root: HTMLElement, ctx: AppContext, rerender: () => void): void {
  root.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    const filterBtn = el.closest<HTMLElement>('[data-filter]');
    if (filterBtn) {
      filter = filterBtn.dataset.filter as Category | 'all';
      rerender();
      return;
    }
    if (el.closest('[data-action="log"]')) ctx.openQuickLog({ mode: 'new' });
    const cardEl = el.closest<HTMLElement>('[data-thread]');
    if (cardEl) ctx.openQuickLog({ mode: 'update', threadId: cardEl.dataset.thread });
  });
  const search = root.querySelector<HTMLInputElement>('#pipeline-search');
  search?.addEventListener('input', () => {
    query = search.value;
    const pos = search.selectionStart;
    rerender();
    const again = document.querySelector<HTMLInputElement>('#pipeline-search');
    again?.focus();
    if (pos !== null) again?.setSelectionRange(pos, pos);
  });
}
