// Achievements: every achievement (unlocked ones dated, locked ones as silhouettes with
// progress), and the backgrounds they unlock for Ping's room.

import { computeAchievements, type Achievement } from '../../game/achievements';
import { formatDate } from '../../game/dates';
import type { GameState } from '../../game/types';
import { BACKGROUNDS, RARITY_LABEL, renderBackground, unlockedBackgrounds, type BackgroundDef } from '../../ping/backgrounds';
import { drawFrame, PING_CANVAS } from '../../ping/render';
import { esc, type AppContext } from '../context';

let memo: { state: GameState; list: Achievement[] } | null = null;
export function achievements(state: GameState): Achievement[] {
  if (memo?.state !== state) memo = { state, list: computeAchievements(state) };
  return memo.list;
}

export function unlockedBackgroundIds(state: GameState): Set<string> {
  return unlockedBackgrounds(new Set(achievements(state).filter((a) => a.unlockedOn).map((a) => a.id)));
}

/** The background to show: the equipped one if it's (still) unlocked, else the default room. */
export function equippedBackground(state: GameState): string {
  const id = state.settings.background;
  return unlockedBackgroundIds(state).has(id) ? id : 'room';
}

const BY_ACHIEVEMENT = new Map(BACKGROUNDS.filter((b) => b.achievement).map((b) => [b.achievement!, b]));

export function backgroundFor(achievementId: string): BackgroundDef | undefined {
  return BY_ACHIEVEMENT.get(achievementId);
}

export function renderAchievements(ctx: AppContext): string {
  const list = achievements(ctx.state);
  const titles = new Map(list.map((a) => [a.id, a.title]));
  const unlocked = unlockedBackgroundIds(ctx.state);
  const equipped = equippedBackground(ctx.state);
  const groups = ['Milestones', 'Habits', 'Categories'] as const;
  const order: BackgroundDef['rarity'][] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const backgrounds = [...BACKGROUNDS].sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity));

  return `<div class="achievements">
    <section class="panel">
      <div class="section-head"><h1>Backgrounds</h1><span class="body2">${unlocked.size} of ${BACKGROUNDS.length} unlocked · the harder the achievement, the rarer the scene</span></div>
      <ul class="bg-grid">${backgrounds.map((b) => {
        const open = unlocked.has(b.id);
        const how = b.achievement ? `Unlock: ${esc(titles.get(b.achievement) ?? b.achievement)}` : 'Default';
        return `<li><button type="button" class="bg-card rarity-${b.rarity} ${open ? '' : 'locked'} ${b.id === equipped ? 'equipped' : ''}"
            data-bg="${b.id}" ${open ? '' : 'disabled'} aria-pressed="${b.id === equipped}" aria-label="${esc(b.name)}${open ? '' : ` (locked, ${how})`}">
          <canvas width="${PING_CANVAS}" height="${PING_CANVAS}" data-bg-thumb="${b.id}"></canvas>
          <span class="bg-name">${esc(b.name)}</span>
          <span class="rarity">${RARITY_LABEL[b.rarity]}${b.animated ? ' · animated' : ''}</span>
          <span class="body2">${b.id === equipped ? '✓ Equipped' : open ? 'Tap to equip' : how}</span>
        </button></li>`;
      }).join('')}</ul>
    </section>
    <section class="panel">
      <div class="section-head"><h1>Achievements</h1><span class="body2">${list.filter((a) => a.unlockedOn).length} of ${list.length} unlocked · kept across seasons</span></div>
      ${groups.map((g) => `<h2>${g}</h2><ul class="trophy-grid">${list.filter((a) => a.group === g).map(card).join('')}</ul>`).join('')}
    </section>
  </div>`;
}

function card(a: Achievement): string {
  const locked = !a.unlockedOn;
  const bg = backgroundFor(a.id);
  const progress = a.progress ? `<div class="trophy-bar"><i style="width:${Math.round((a.progress.value / a.progress.goal) * 100)}%"></i></div><span class="body2">${a.progress.value} / ${a.progress.goal}</span>` : '';
  return `<li class="trophy ${locked ? 'locked' : ''}">
    <span class="trophy-medal" aria-hidden="true">${a.icon}</span>
    <strong>${esc(a.title)}</strong>
    <span class="body2">${esc(a.description)}</span>
    ${locked ? progress : `<span class="trophy-date">Unlocked ${formatDate(a.unlockedOn!)}</span>`}
    ${bg ? `<span class="unlocks rarity-${bg.rarity}">🖼 ${esc(bg.name)} <b>${RARITY_LABEL[bg.rarity]}</b></span>` : ''}
  </li>`;
}

export function bindAchievements(root: HTMLElement, ctx: AppContext): void {
  root.querySelectorAll<HTMLCanvasElement>('[data-bg-thumb]').forEach((canvas) => {
    drawFrame(canvas.getContext('2d')!, renderBackground(canvas.dataset.bgThumb!, 0), 1);
  });
  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-bg]');
    if (!btn || btn.disabled) return;
    const id = btn.dataset.bg!;
    ctx.commit({ ...ctx.state, settings: { ...ctx.state.settings, background: id } });
    ctx.toast(`${BACKGROUNDS.find((b) => b.id === id)?.name ?? 'Background'} equipped.`);
  });
}
