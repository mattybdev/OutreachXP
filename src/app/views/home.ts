// Home: Ping, level progress, season countdown, today's to-dos and recent activity.

import { undoBatch, undoBlocker } from '../../game/actions';
import { formatDate, todayISO } from '../../game/dates';
import { EVENT_LABEL, LIMITS, lifeStageForLevel, titleForLevel } from '../../game/rules';
import { CATEGORY_LABEL, type Category } from '../../game/types';
import { FORM_NAMES, rawTier, resolveForm, STATS, TIER_THRESHOLDS, type PingGenome } from '../../ping/genome';
import { statAccent } from '../../theme';
import { moodFor, type Meters } from '../../game/care';
import { careNow, categoryChip, currentSeason, esc, plural, relativeDay, seasonSummary, threadViews, upcomingDates, type AppContext } from '../context';

const STAT_CATEGORY: Record<string, Category> = { intellect: 'academia', craft: 'industry', heart: 'organizations', authority: 'government' };
const STAT_NAME: Record<string, string> = { intellect: 'Intellect', craft: 'Craft', heart: 'Heart', authority: 'Authority' };
const STAGE_NAME: Record<string, string> = { egg: 'Envelope Egg', baby: 'Baby', kid: 'Kid', teen: 'Teen', adult: 'Adult', legend: 'Legend' };

/** The genome for the current season's Ping, derived from real progress. */
export function currentGenome(ctx: AppContext): PingGenome | null {
  const season = currentSeason(ctx.state);
  const summary = seasonSummary(ctx.state);
  if (!season || !summary) return null;
  const today = todayISO();
  const activeToday = summary.entries.some((e) => e.event.date === today);
  const care = careNow(ctx.state, today)!.care;
  return {
    seed: season.pingSeed,
    lifeStage: lifeStageForLevel(summary.level.level),
    stats: { ...summary.stats },
    mood: summary.hasOutreach ? moodFor(care, activeToday) : 'neutral',
  };
}

const METERS: { key: keyof Meters; label: string; icon: string; hint: string }[] = [
  { key: 'fullness', label: 'Fullness', icon: '📨', hint: 'Fed by sending emails and follow-ups' },
  { key: 'joy', label: 'Joy', icon: '😊', hint: 'Grows with replies, CCs, referrals and commitments' },
  { key: 'energy', label: 'Energy', icon: '⚡', hint: 'Restored by checking in and following up' },
];

function renderCare(ctx: AppContext): string {
  const summary = seasonSummary(ctx.state)!;
  if (!summary.hasOutreach) return '';
  const { care, streak } = careNow(ctx.state)!;
  const name = esc(currentSeason(ctx.state)!.pingName);
  const meters = METERS.map((m) => {
    const v = Math.round(care.meters[m.key]);
    return `<div class="meter ${v < 25 ? 'meter-low' : ''}" title="${m.hint}">
      <span class="meter-icon" aria-hidden="true">${m.icon}</span>
      <span class="meter-name">${m.label}</span>
      <span class="meter-bar" role="meter" aria-label="${m.label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${v}"><i style="width:${v}%"></i></span>
    </div>`;
  }).join('');
  const bonus = Math.round((streak.multiplier - 1) * 100);
  const streakLine = streak.current
    ? `<div class="streak"><span class="flame" aria-hidden="true">🔥</span><strong>${plural(streak.current, 'day')}</strong> outreach streak${bonus ? ` · <span class="xp-gain">+${bonus}% XP</span>` : ` · ${7 - (streak.current % 7)} more for +5% XP`}</div>`
    : `<div class="streak body2">Log outreach on your active days to start a streak (weekends and holidays don’t count against you).</div>`;
  const banner = care.hibernating
    ? `<div class="banner">💤 ${name} is hibernating. Send one email to wake it up, with a <strong>+20 XP</strong> welcome-back bonus.</div>`
    : '';
  return `${banner}<div class="meters">${meters}</div>${streakLine}`;
}

export function renderHome(ctx: AppContext): string {
  const season = currentSeason(ctx.state)!;
  const summary = seasonSummary(ctx.state)!;
  const genome = currentGenome(ctx)!;
  const today = todayISO();
  const { level } = summary;
  const form = resolveForm(genome.stats, genome.lifeStage);
  const pct = level.needed ? Math.round((level.into / level.needed) * 100) : 0;

  const stageLine = level.level === 0
    ? 'Envelope Egg · log your first email to hatch'
    : `${STAGE_NAME[genome.lifeStage]}${form !== 'none' ? ` · ${FORM_NAMES[form].replace('Ping', esc(season.pingName))}` : ''}`;

  const statRows = STATS.map((stat) => {
    const pts = summary.stats[stat];
    const tier = rawTier(pts);
    const lo = TIER_THRESHOLDS[tier], hi = TIER_THRESHOLDS[tier + 1];
    const fill = hi === undefined ? 100 : Math.round(((pts - lo) / (hi - lo)) * 100);
    return `<div class="mini-stat" title="${STAT_NAME[stat]}: ${pts} points from ${CATEGORY_LABEL[STAT_CATEGORY[stat]]} outreach">
      <span class="mini-stat-name"><i class="swatch" style="background:${statAccent[stat]}"></i>${STAT_NAME[stat]}</span>
      <span class="mini-stat-bar"><i style="width:${fill}%;background:${statAccent[stat]}"></i></span>
      <span class="mini-stat-val">T${tier} · ${pts}</span>
    </div>`;
  }).join('');

  return `<div class="home">
    <section class="panel ping-panel" aria-label="${esc(season.pingName)}">
      <canvas id="ping-canvas" width="384" height="384" role="img" aria-label="${esc(season.pingName)}, ${esc(stageLine)}"></canvas>
      <h1>${esc(season.pingName)}</h1>
      <p class="body2">${stageLine}</p>
      ${renderCare(ctx)}
      <div class="xp">
        <div class="xp-head"><strong>Level ${level.level}</strong><span>${esc(titleForLevel(level.level))}</span></div>
        <div class="xp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${level.needed}" aria-valuenow="${level.into}" aria-label="XP to next level"><i style="width:${pct}%"></i></div>
        <div class="xp-foot body2">${level.level ? `${level.into} / ${level.needed} XP to level ${level.level + 1}` : 'Your first email hatches the egg'} · ${summary.totalXp} XP this season</div>
      </div>
      <div class="mini-stats">${statRows}</div>
    </section>
    <div class="home-side">
      <button class="btn btn-primary btn-big" type="button" data-action="log">+ Log outreach</button>
      ${renderCountdown(ctx)}
      ${renderToday(ctx, today)}
      ${renderActivity(ctx)}
    </div>
  </div>`;
}

function renderCountdown(ctx: AppContext): string {
  const season = currentSeason(ctx.state)!;
  const upcoming = upcomingDates(season);
  if (!upcoming.length) {
    return `<section class="panel countdown">
      <h2>Season dates</h2>
      <p class="body2">No upcoming dates. <a href="#season">Add your showcase dates</a> to get a countdown.</p>
    </section>`;
  }
  const [next, ...rest] = upcoming;
  return `<section class="panel countdown">
    <div class="countdown-main"><span class="countdown-days">${next.days === 0 ? 'Today' : next.days}</span>
      <span>${next.days === 0 ? '' : next.days === 1 ? 'day to' : 'days to'} <strong>${esc(next.label)}</strong><br><span class="body2">${formatDate(next.date)}</span></span></div>
    ${rest.length ? `<ul class="countdown-rest">${rest.slice(0, 3).map((d) => `<li><span>${esc(d.label)}</span><span class="body2">${d.days} days</span></li>`).join('')}</ul>` : ''}
  </section>`;
}

function renderToday(ctx: AppContext, today: string): string {
  const summary = seasonSummary(ctx.state)!;
  const sentToday = summary.entries.filter((e) => e.event.type === 'sent' && e.event.date === today).length;
  const fullLeft = Math.max(0, LIMITS.fullSendsPerDay - sentToday);
  const due = threadViews(ctx.state, today).filter((v) => v.due).sort((a, b) => (a.lastDate ?? '').localeCompare(b.lastDate ?? ''));
  const dueList = due.slice(0, 5).map((v) => `<li>
      <span><strong>${esc(v.contact.name)}</strong> ${v.contact.org ? `<span class="body2">· ${esc(v.contact.org)}</span>` : ''}<br><span class="body2">Sent ${relativeDay(v.lastDate, today)}</span></span>
      <button class="btn btn-secondary btn-small" type="button" data-action="followup" data-thread="${v.thread.id}">Log follow-up</button>
    </li>`).join('');
  const streak = careNow(ctx.state, today)!.streak;
  const risk = streak.atRisk
    ? `<p class="at-risk">🔥 Log any outreach today to keep your ${plural(streak.current, 'day')} streak going.</p>`
    : '';
  return `<section class="panel today">
    <h2>Today</h2>
    ${risk}
    <p>${plural(sentToday, 'email')} sent today · <span class="body2">${fullLeft ? `${fullLeft} more at full XP` : 'Daily full-XP sends used: quality over quantity!'}</span></p>
    ${due.length
      ? `<h3>${plural(due.length, 'follow-up')} due</h3><ul class="due-list">${dueList}</ul>${due.length > 5 ? `<a href="#pipeline">See all in the pipeline</a>` : ''}`
      : `<p class="body2">No follow-ups due. Emails get a follow-up reminder after ${ctx.state.settings.followUpMinDays} days without a reply.</p>`}
  </section>`;
}

function renderActivity(ctx: AppContext): string {
  const summary = seasonSummary(ctx.state)!;
  const contacts = new Map(ctx.state.contacts.map((c) => [c.id, c]));
  const threads = new Map(ctx.state.threads.map((t) => [t.id, t]));
  const batches = new Map<string, typeof summary.entries>();
  for (const entry of [...summary.entries].sort((a, b) => b.event.loggedAt.localeCompare(a.event.loggedAt))) {
    const list = batches.get(entry.event.batchId) ?? [];
    list.push(entry);
    batches.set(entry.event.batchId, list);
  }
  const now = new Date();
  const items = [...batches.entries()].slice(0, 8).map(([batchId, entries]) => {
    const main = entries[0].event.type === 'referred' ? entries[0] : entries.reduce((a, b) => (b.xp > a.xp ? b : a));
    const contact = contacts.get(threads.get(main.event.threadId)?.contactId ?? '');
    const xp = entries.reduce((sum, e) => sum + e.xp, 0);
    const parts = entries.flatMap((e) => e.parts).filter((p) => p.xp > 0 || p.label.includes('limit'));
    const canUndo = !undoBlocker(ctx.state, batchId, now);
    return `<li>
      <div class="activity-main">
        <span><strong>${EVENT_LABEL[main.event.type]}</strong> · ${esc(contact?.name ?? 'Unknown')} ${contact ? categoryChip(contact.category) : ''}</span>
        <span class="xp-gain">+${xp} XP</span>
      </div>
      <div class="activity-parts body2">${parts.map((p) => `${esc(p.label)}${p.xp ? ` +${p.xp}` : ''}`).join(' · ')} · ${relativeDay(main.event.date)}</div>
      ${canUndo ? `<button class="link-button" type="button" data-action="undo" data-batch="${batchId}">Undo</button>` : ''}
    </li>`;
  }).join('');
  return `<section class="panel activity">
    <h2>Recent activity</h2>
    ${items ? `<ul class="activity-list">${items}</ul>` : '<p class="body2">Nothing logged yet this season.</p>'}
  </section>`;
}

export function bindHome(root: HTMLElement, ctx: AppContext): void {
  root.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'log') ctx.openQuickLog({ mode: 'new' });
    if (action === 'followup') ctx.openQuickLog({ mode: 'update', threadId: target.dataset.thread });
    if (action === 'undo' && target.dataset.batch) {
      try {
        ctx.commit(undoBatch(ctx.state, target.dataset.batch));
        ctx.toast('Undone.');
      } catch (err) {
        ctx.toast((err as Error).message, 'error');
      }
    }
  });
}
