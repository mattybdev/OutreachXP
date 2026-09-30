// Quests: today's three dailies, Perfect Day and Momentum, and this week's three weeklies.

import { addDays } from '../../game/care';
import { formatDate, todayISO } from '../../game/dates';
import { MOMENTUM, PERFECT_DAY_XP, weekStartOf, type QuestInstance } from '../../game/quests';
import { esc, plural, seasonSummary, type AppContext } from '../context';

export function todaysQuests(ctx: AppContext, today = todayISO()): { daily: QuestInstance[]; weekly: QuestInstance[] } {
  const summary = seasonSummary(ctx.state);
  const quests = summary?.quests ?? [];
  const week = weekStartOf(today);
  return {
    daily: quests.filter((q) => q.period === 'daily' && q.key === today),
    weekly: quests.filter((q) => q.period === 'weekly' && q.key === week),
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

export function renderQuests(ctx: AppContext): string {
  const today = todayISO();
  const summary = seasonSummary(ctx.state)!;
  const { daily, weekly } = todaysQuests(ctx, today);
  const doneToday = daily.filter((q) => q.completed).length;
  const perfect = summary.perfectDays.has(today);
  const momentumToday = summary.momentumDates.has(today);
  const completedAll = summary.quests.filter((q) => q.completed);
  const weekEnd = addDays(weekStartOf(today), 6);

  const perfectPanel = perfect
    ? `<div class="banner banner-good">⭐ <strong>Perfect Day!</strong> +${PERFECT_DAY_XP} XP, and tomorrow your replies, commitments and conversions earn <strong>+${MOMENTUM * 100}% Momentum</strong>.</div>`
    : `<p class="body2">Finish all three for a <strong>Perfect Day</strong>: +${PERFECT_DAY_XP} XP and +${MOMENTUM * 100}% XP on tomorrow’s results (Momentum). ${doneToday}/3 done.</p>`;

  return `<div class="quests-view">
    ${momentumToday ? `<div class="banner banner-good">⚡ <strong>Momentum is on today:</strong> replies, commitments and conversions earn +${MOMENTUM * 100}% XP.</div>` : ''}
    <section class="panel">
      <div class="section-head"><h1>Today’s quests</h1><span class="body2">New quests at midnight</span></div>
      ${perfectPanel}
      <ul class="quest-list">${daily.map((q) => questCard(q)).join('')}</ul>
    </section>
    <section class="panel">
      <div class="section-head"><h2>This week</h2><span class="body2">Resets Monday · ends ${formatDate(weekEnd)}</span></div>
      <ul class="quest-list">${weekly.map((q) => questCard(q)).join('')}</ul>
    </section>
    <p class="body2 note">This season: ${plural(completedAll.length, 'quest')} completed, ${plural(summary.perfectDays.size, 'Perfect Day')}, ${summary.questXp} XP from quests. Quests complete automatically as you log outreach.</p>
    <div class="button-row"><button class="btn btn-primary" type="button" data-action="log">+ Log outreach</button></div>
  </div>`;
}

export function bindQuests(root: HTMLElement, ctx: AppContext): void {
  root.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-action="log"]')) ctx.openQuickLog({ mode: 'new' });
  });
}
