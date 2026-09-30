// Quests: this week's three weeklies (with Perfect Week and Momentum) and this month's two monthlies.

import { addDays } from '../../game/care';
import { formatDate, todayISO } from '../../game/dates';
import { MOMENTUM, monthStartOf, PERFECT_WEEK_XP, weekStartOf, type QuestInstance } from '../../game/quests';
import { esc, plural, seasonSummary, type AppContext } from '../context';

export function currentQuests(ctx: AppContext, today = todayISO()): { weekly: QuestInstance[]; monthly: QuestInstance[] } {
  const quests = seasonSummary(ctx.state)?.quests ?? [];
  const week = weekStartOf(today);
  const month = monthStartOf(today);
  return {
    weekly: quests.filter((q) => q.period === 'weekly' && q.key === week),
    monthly: quests.filter((q) => q.period === 'monthly' && q.key === month),
  };
}

export function questCard(q: QuestInstance, compact = false): string {
  const pct = Math.round((q.progress / q.goal) * 100);
  const bonus = q.bonusStat ? ` + ${q.bonusStat.points} ${q.bonusStat.stat} points` : '';
  if (compact) {
    return `<li class="quest-mini ${q.completed ? 'done' : ''}">
      <span class="quest-check" aria-hidden="true">${q.completed ? '✓' : ''}</span>
      <span><strong>${esc(q.title)}</strong> <span class="body2">${esc(q.description)}</span></span>
      <span class="body2 quest-mini-prog">${q.completed ? `+${q.reward}` : `${q.progress}/${q.goal}`}</span>
    </li>`;
  }
  return `<li class="quest ${q.completed ? 'done' : ''}">
    <div class="quest-head"><strong>${esc(q.title)}</strong><span class="xp-gain">+${q.reward} XP${esc(bonus)}</span></div>
    <p class="body2">${esc(q.description)}</p>
    <div class="quest-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${q.goal}" aria-valuenow="${q.progress}" aria-label="${esc(q.title)} progress"><i style="width:${pct}%"></i></div>
    <div class="quest-foot body2">${q.completed ? '✓ Complete' : `${q.progress} / ${q.goal}`}</div>
  </li>`;
}

function monthEnd(monthStart: string): string {
  const [y, m] = monthStart.split('-').map(Number);
  return addDays(m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`, -1);
}

export function renderQuests(ctx: AppContext): string {
  const today = todayISO();
  const summary = seasonSummary(ctx.state)!;
  const { weekly, monthly } = currentQuests(ctx, today);
  const week = weekStartOf(today);
  const doneThisWeek = weekly.filter((q) => q.completed).length;
  const perfect = summary.perfectWeeks.has(week);
  const momentumNow = summary.momentumWeeks.has(week);
  const completedAll = summary.quests.filter((q) => q.completed);

  const perfectPanel = perfect
    ? `<div class="banner banner-good">⭐ <strong>Perfect Week!</strong> +${PERFECT_WEEK_XP} XP, and next week your replies, commitments and conversions earn <strong>+${MOMENTUM * 100}% Momentum</strong>.</div>`
    : `<p class="body2">Finish all three for a <strong>Perfect Week</strong>: +${PERFECT_WEEK_XP} XP and +${MOMENTUM * 100}% XP on next week’s results (Momentum). ${doneThisWeek}/3 done.</p>`;

  return `<div class="quests-view">
    ${momentumNow ? `<div class="banner banner-good">⚡ <strong>Momentum is on this week:</strong> replies, commitments and conversions earn +${MOMENTUM * 100}% XP.</div>` : ''}
    <section class="panel">
      <div class="section-head"><h1>This week’s quests</h1><span class="body2">New quests every Monday · this week ends ${formatDate(addDays(week, 6))}</span></div>
      ${perfectPanel}
      <ul class="quest-list">${weekly.map((q) => questCard(q)).join('')}</ul>
    </section>
    <section class="panel">
      <div class="section-head"><h2>This month</h2><span class="body2">Ends ${formatDate(monthEnd(monthStartOf(today)))}</span></div>
      <ul class="quest-list quest-list-2">${monthly.map((q) => questCard(q)).join('')}</ul>
    </section>
    <p class="body2 note">This season: ${plural(completedAll.length, 'quest')} completed, ${plural(summary.perfectWeeks.size, 'Perfect Week')}, ${summary.questXp} XP from quests. Quests complete automatically as you log outreach.</p>
    <div class="button-row"><button class="btn btn-primary" type="button" data-action="log">+ Log outreach</button></div>
  </div>`;
}

export function bindQuests(root: HTMLElement, ctx: AppContext): void {
  root.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-action="log"]')) ctx.openQuickLog({ mode: 'new' });
  });
}
