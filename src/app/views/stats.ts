// Stats & Journal: headline numbers, the outreach funnel, weekly activity, a category
// breakdown (which doubles as the table view) and a journal of Ping's milestones.

import { todayISO } from '../../game/dates';
import { categoryBreakdown, funnel, journal, personalBests, weeklyActivity, type JournalEntry, type WeekActivity } from '../../game/stats';
import { CATEGORIES, CATEGORY_LABEL, type Category, type GameState } from '../../game/types';
import { esc, plural, type AppContext } from '../context';

let filter: Category | 'all' = 'all';

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '–');
const shortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

let journalMemo: { state: GameState; today: string; items: JournalEntry[] } | null = null;
function journalFor(state: GameState, today: string): JournalEntry[] {
  if (journalMemo?.state !== state || journalMemo.today !== today) {
    journalMemo = { state, today, items: journal(state, state.currentSeasonId!, today) };
  }
  return journalMemo.items;
}

export function renderStats(ctx: AppContext): string {
  const state = ctx.state;
  const id = state.currentSeasonId!;
  const today = todayISO();
  const category = filter === 'all' ? undefined : filter;
  const f = funnel(state, id, category);
  const weeks = weeklyActivity(state, id, today, category);
  const bests = personalBests(state, id, today);
  const rows = categoryBreakdown(state, id);
  const maxSent = Math.max(1, ...rows.map((r) => r.sent));

  const filters = (['all', ...CATEGORIES] as const).map((c) => `<button type="button" role="radio" data-filter="${c}" aria-checked="${filter === c}">${c === 'all' ? 'All categories' : CATEGORY_LABEL[c]}</button>`).join('');

  const tile = (value: string, label: string, context: string) => `<div class="stat-tile"><span class="stat-value">${value}</span><span class="stat-label">${label}</span><span class="body2">${context}</span></div>`;

  const steps: [string, number, number | null][] = [
    ['Emailed', f.sent, null],
    ['Replied', f.replied, f.sent],
    ['Committed', f.committed, f.replied],
    ['Converted', f.converted, f.committed],
  ];
  const funnelRows = steps.map(([label, count, prev]) => {
    const width = f.sent ? Math.max(count ? 2 : 0, (count / f.sent) * 100) : 0;
    const tip = `${label}: ${plural(count, 'contact')}${prev !== null ? ` · ${pct(count, prev)} of the previous step` : ''} · ${pct(count, f.sent)} of everyone emailed`;
    return `<div class="funnel-row">
      <span class="funnel-label">${label}</span>
      <span class="funnel-track" tabindex="0" data-tip="${esc(tip)}"><i style="width:${width}%"></i></span>
      <span class="funnel-value"><strong>${count}</strong>${prev !== null ? ` <span class="body2">${pct(count, prev)}</span>` : ''}</span>
    </div>`;
  }).join('');

  const categoryRows = rows.map((r) => `<tr>
      <th scope="row"><span class="cat-name"><i class="swatch" style="background:var(--stat-${statVar(r.category)})"></i>${CATEGORY_LABEL[r.category]}</span></th>
      <td><span class="inline-bar"><i style="width:${(r.sent / maxSent) * 100}%;background:var(--stat-${statVar(r.category)})"></i></span>${r.sent}</td>
      <td>${r.replied}</td>
      <td>${r.replyRate === null ? '–' : `${Math.round(r.replyRate * 100)}%`}</td>
      <td>${r.committed}</td>
      <td>${r.converted}</td>
    </tr>`).join('');

  const scope = category ? CATEGORY_LABEL[category] : 'all categories';
  return `<div class="stats-view">
    <div class="panel toolbar"><div class="segmented" role="radiogroup" aria-label="Filter stats by category">${filters}</div></div>
    <div class="stat-tiles">
      ${tile(String(f.sent), 'Contacts emailed', `this season · ${scope}`)}
      ${tile(pct(f.replied, f.sent), 'Reply rate', `${plural(f.replied, 'reply', 'replies')}`)}
      ${tile(String(f.committed), 'Commitments', `${pct(f.committed, f.sent)} of contacts`)}
      ${tile(String(f.converted), 'Conversions', `${pct(f.converted, f.sent)} of contacts`)}
    </div>
    <div class="stats-grid">
      <section class="panel">
        <h2>Outreach funnel</h2>
        <p class="body2">How far contacts got. Percentages compare each step to the one before.</p>
        <div class="funnel">${funnelRows}</div>
      </section>
      <section class="panel">
        <h2>Outreach per week</h2>
        <p class="body2">Everything logged each week: emails, follow-ups and results. Hover a week for details.</p>
        <div class="week-chart" data-weeks='${esc(JSON.stringify(weeks))}'></div>
        <details class="table-view"><summary>Show as table</summary>${weekTable(weeks)}</details>
      </section>
    </div>
    <section class="panel">
      <h2>Personal bests</h2>
      <div class="bests">
        <div><span class="stat-value small">${bests.bestWeek && bests.bestWeek.total ? bests.bestWeek.total : '–'}</span><span class="body2">${bests.bestWeek && bests.bestWeek.total ? `actions in your best week (${shortDate(bests.bestWeek.week)})` : 'Best week: nothing logged yet'}</span></div>
        <div><span class="stat-value small">${bests.longestStreak}</span><span class="body2">${bests.longestStreak === 1 ? 'week' : 'weeks'}: longest streak</span></div>
        <div><span class="stat-value small">${bests.activeWeeks}</span><span class="body2">${bests.activeWeeks === 1 ? 'week' : 'weeks'} with outreach</span></div>
      </div>
    </section>
    <section class="panel">
      <h2>By category</h2>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th scope="col">Category</th><th scope="col">Emailed</th><th scope="col">Replied</th><th scope="col">Reply rate</th><th scope="col">Committed</th><th scope="col">Converted</th></tr></thead>
        <tbody>${categoryRows}</tbody>
      </table></div>
    </section>
    <section class="panel">
      <h2>Journal</h2>
      <p class="body2">Milestones from this season, newest first.</p>
      ${renderJournal(journalFor(state, today))}
    </section>
  </div>`;
}

function statVar(c: Category): string {
  return { academia: 'intellect', industry: 'craft', organizations: 'heart', government: 'authority' }[c];
}

function weekTable(weeks: WeekActivity[]): string {
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th scope="col">Week of</th><th scope="col">Emails</th><th scope="col">Follow-ups</th><th scope="col">Results</th><th scope="col">Other</th><th scope="col">Total</th></tr></thead>
    <tbody>${[...weeks].reverse().map((w) => `<tr><th scope="row">${shortDate(w.week)}</th><td>${w.sent}</td><td>${w.followups}</td><td>${w.results}</td><td>${w.other}</td><td>${w.total}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

function renderJournal(items: JournalEntry[]): string {
  if (!items.length) return '<p class="body2">Nothing yet.</p>';
  let month = '';
  let html = '';
  for (const item of items) {
    const m = item.date.slice(0, 7);
    if (m !== month) {
      if (month) html += '</ol>';
      const [y, mo] = m.split('-').map(Number);
      html += `<h3>${new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3><ol class="journal">`;
      month = m;
    }
    html += `<li class="journal-${item.kind}">
      <span class="journal-date">${shortDate(item.date)}</span>
      <span class="journal-icon" aria-hidden="true">${item.icon}</span>
      <span><strong>${esc(item.title)}</strong>${item.detail ? `<br><span class="body2">${esc(item.detail)}</span>` : ''}</span>
    </li>`;
  }
  return `${html}</ol>`;
}

/** Column chart of weekly outreach, sized to its container so text stays crisp. */
function drawWeekChart(host: HTMLElement): void {
  const weeks = JSON.parse(host.dataset.weeks ?? '[]') as WeekActivity[];
  const width = Math.max(260, host.clientWidth);
  const height = 190;
  const pad = { top: 12, right: 8, bottom: 26, left: 30 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(4, ...weeks.map((w) => w.total));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const y = (v: number) => pad.top + plotH - (v / top) * plotH;
  const slot = plotW / Math.max(1, weeks.length);
  const barW = Math.max(2, Math.min(28, slot - 2));
  const r = Math.min(4, barW / 2);
  const today = todayISO();

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const v = step * i, yy = y(v);
    grid += `<line x1="${pad.left}" x2="${width - pad.right}" y1="${yy}" y2="${yy}" class="grid${i === 0 ? ' baseline' : ''}"/>`;
    grid += `<text x="${pad.left - 6}" y="${yy + 4}" class="tick" text-anchor="end">${v}</text>`;
  }
  let bars = '';
  let labels = '';
  let lastMonth = '';
  weeks.forEach((w, i) => {
    const cx = pad.left + slot * i + slot / 2;
    const x = cx - barW / 2;
    const yTop = y(w.total);
    const h = pad.top + plotH - yTop;
    const current = today >= w.week && today < addWeek(w.week);
    const tip = `${current ? 'This week' : `Week of ${shortDate(w.week)}`}: ${w.total} total · ${plural(w.sent, 'email')} · ${plural(w.followups, 'follow-up')} · ${plural(w.results, 'result')}${w.other ? ` · ${w.other} other` : ''}`;
    if (h > 0) {
      // Rounded data end at the top, square at the baseline.
      bars += `<path class="bar${current ? ' current' : ''}" d="M${x},${yTop + h} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${yTop + h} Z"/>`;
    }
    bars += `<rect class="hit" x="${cx - slot / 2}" y="${pad.top}" width="${slot}" height="${plotH}" data-tip="${esc(tip)}" tabindex="0"/>`;
    const month = w.week.slice(0, 7);
    if (month !== lastMonth) {
      const [yy, mm] = month.split('-').map(Number);
      labels += `<text x="${cx}" y="${height - 8}" class="tick" text-anchor="middle">${new Date(yy, mm - 1, 1).toLocaleDateString(undefined, { month: 'short' })}</text>`;
      lastMonth = month;
    }
  });
  host.innerHTML = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Outreach actions per week">${grid}${bars}${labels}</svg>`;
}

function addWeek(week: string): string {
  const [y, m, d] = week.split('-').map(Number);
  const next = new Date(y, m - 1, d + 7);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

export function bindStats(root: HTMLElement, rerender: () => void): void {
  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-filter]');
    if (!btn) return;
    filter = btn.dataset.filter as Category | 'all';
    rerender();
  });

  // Shared tooltip for bars (hover and keyboard focus).
  const container = root.querySelector<HTMLElement>('.stats-view') ?? root;
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.setAttribute('role', 'tooltip');
  container.append(tip);
  const show = (el: HTMLElement | SVGElement) => {
    const text = el.getAttribute('data-tip');
    if (!text) return;
    tip.textContent = text;
    tip.classList.add('show');
    const box = el.getBoundingClientRect();
    const rootBox = container.getBoundingClientRect();
    const left = Math.min(Math.max(8, box.left - rootBox.left + box.width / 2 - tip.offsetWidth / 2), rootBox.width - tip.offsetWidth - 8);
    tip.style.left = `${left}px`;
    tip.style.top = `${box.top - rootBox.top - tip.offsetHeight - 8}px`;
  };
  const hide = () => tip.classList.remove('show');
  root.addEventListener('mouseover', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-tip]');
    if (el) show(el);
    else hide();
  });
  root.addEventListener('mouseleave', hide);
  root.addEventListener('focusin', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-tip]');
    if (el) show(el);
  });
  root.addEventListener('focusout', hide);

  // Draw the chart once the view is in the document (it needs the container's width).
  requestAnimationFrame(() => root.querySelectorAll<HTMLElement>('.week-chart').forEach(drawWeekChart));
}
