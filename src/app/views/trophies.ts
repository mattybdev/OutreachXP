// Trophy case: every achievement, unlocked ones with their date, locked ones as silhouettes.

import { computeAchievements, type Achievement } from '../../game/achievements';
import { formatDate } from '../../game/dates';
import type { GameState } from '../../game/types';
import { esc, type AppContext } from '../context';

let memo: { state: GameState; list: Achievement[] } | null = null;
export function achievements(state: GameState): Achievement[] {
  if (memo?.state !== state) memo = { state, list: computeAchievements(state) };
  return memo.list;
}

export function renderTrophies(ctx: AppContext): string {
  const list = achievements(ctx.state);
  const unlocked = list.filter((a) => a.unlockedOn).length;
  const groups = ['Milestones', 'Habits', 'Categories'] as const;
  return `<div class="trophies">
    <section class="panel">
      <div class="section-head"><h1>Trophy case</h1><span class="body2">${unlocked} of ${list.length} unlocked · kept across seasons</span></div>
      ${groups.map((g) => `<h2>${g}</h2><ul class="trophy-grid">${list.filter((a) => a.group === g).map(trophy).join('')}</ul>`).join('')}
    </section>
  </div>`;
}

function trophy(a: Achievement): string {
  const locked = !a.unlockedOn;
  const progress = a.progress ? `<div class="trophy-bar"><i style="width:${Math.round((a.progress.value / a.progress.goal) * 100)}%"></i></div><span class="body2">${a.progress.value} / ${a.progress.goal}</span>` : '';
  return `<li class="trophy ${locked ? 'locked' : ''}">
    <span class="trophy-medal" aria-hidden="true">${a.icon}</span>
    <strong>${esc(a.title)}</strong>
    <span class="body2">${esc(a.description)}</span>
    ${locked ? progress : `<span class="trophy-date">Unlocked ${formatDate(a.unlockedOn!)}</span>`}
  </li>`;
}
