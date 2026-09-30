// Season setup and editing (GDD §6.5), starting a new season, and the Hall of Pings.

import { createSeason, startNewSeason, updateSeason } from '../../game/actions';
import { formatDate, todayISO } from '../../game/dates';
import { KEY_DATE_LABELS, lifeStageForLevel, titleForLevel } from '../../game/rules';
import { compareSeasons, type SeasonTotals } from '../../game/stats';
import type { GameState, KeyDates, Season } from '../../game/types';
import { renderBackground } from '../../ping/backgrounds';
import { FORM_NAMES, resolveForm } from '../../ping/genome';
import { drawFrame, PING_CANVAS, renderPing } from '../../ping/render';
import { computeSeason } from '../../game/engine';
import { currentSeason, esc, plural, upcomingDates, type AppContext } from '../context';

function dateFields(dates: KeyDates, prefix: string): string {
  return (Object.keys(KEY_DATE_LABELS) as (keyof KeyDates)[]).map((key) => `<label class="field">
      <span>${KEY_DATE_LABELS[key]}</span>
      <input type="date" name="${prefix}${key}" value="${esc(dates[key] ?? '')}" />
    </label>`).join('');
}

function readDates(data: FormData, prefix: string): KeyDates {
  const keyDates: KeyDates = {};
  for (const key of Object.keys(KEY_DATE_LABELS) as (keyof KeyDates)[]) {
    const v = String(data.get(`${prefix}${key}`) ?? '');
    if (v) keyDates[key] = v;
  }
  return keyDates;
}

let hallMemo: { state: GameState; today: string; rows: SeasonTotals[] } | null = null;
function hallRows(state: GameState, today: string): SeasonTotals[] {
  if (hallMemo?.state !== state || hallMemo.today !== today) hallMemo = { state, today, rows: compareSeasons(state, today).seasons };
  return hallMemo.rows;
}

export function renderSeason(ctx: AppContext): string {
  const season = currentSeason(ctx.state);
  const intro = season
    ? `<h1>Season</h1><p class="body2">Update your season’s name, your Ping’s name and the showcase dates. Dates are optional; the home screen counts down to the next one.</p>`
    : `<h1>Welcome to OutreachXP</h1>
       <p>Every email you send for the showcase feeds <strong>Ping</strong>, your outreach companion. Replies, CCs, referrals and commitments help it grow, and the kind of people you reach decides how it grows.</p>
       <p class="body2">Start by setting up this year’s season. You can fill in dates later.</p>`;

  const upcoming = season ? upcomingDates(season) : [];
  return `<div class="season">
    <section class="panel">
      ${intro}
      <form id="season-form" class="season-form" novalidate>
        <div class="grid-2">
          <label class="field"><span>Season name</span><input name="name" required maxlength="60" placeholder="SGS&amp;C 2027" value="${esc(season?.name ?? '')}" /></label>
          <label class="field"><span>Name your Ping</span><input name="pingName" maxlength="24" placeholder="Ping" value="${esc(season?.pingName ?? '')}" /></label>
        </div>
        <h2>Key dates</h2>
        <div class="grid-4">${dateFields(season?.keyDates ?? {}, 'date-')}</div>
        <p class="form-error" role="alert"></p>
        <button class="btn btn-primary" type="submit">${season ? 'Save changes' : 'Start the season'}</button>
      </form>
    </section>
    ${upcoming.length ? `<section class="panel"><h2>Coming up</h2><ul class="date-list">${upcoming.map((d) => `<li><span>${esc(d.label)}</span><span>${formatDate(d.date)}</span><span class="body2">${d.days === 0 ? 'today' : `in ${d.days} days`}</span></li>`).join('')}</ul></section>` : ''}
    ${season ? hall(ctx) + newSeasonPanel(season) : ''}
  </div>`;
}

function hall(ctx: AppContext): string {
  const rows = [...hallRows(ctx.state, todayISO())].reverse();
  return `<section class="panel">
    <div class="section-head"><h2>Hall of Pings</h2><span class="body2">Every season’s Ping, newest first</span></div>
    <ul class="hall">${rows.map((r) => {
      const summary = computeSeason(ctx.state, r.seasonId);
      const stage = lifeStageForLevel(r.level);
      const form = resolveForm(summary.stats, stage);
      const title = form !== 'none' ? FORM_NAMES[form].replace('Ping', r.pingName) : r.pingName;
      return `<li class="hall-card ${r.current ? 'current' : ''}">
        <canvas width="${PING_CANVAS}" height="${PING_CANVAS}" data-hall="${r.seasonId}" role="img" aria-label="${esc(title)}"></canvas>
        <div>
          <span class="hall-season">${esc(r.name)}${r.current ? ' <b>Current</b>' : ''}</span>
          <strong>${esc(title)}</strong>
          <span class="body2">Level ${r.level} · ${esc(titleForLevel(r.level))}</span>
          <span class="body2">${formatDate(r.start)} – ${r.current ? 'now' : formatDate(r.end)}</span>
          <span class="hall-stats">${plural(r.emails, 'email')} · ${plural(r.replies, 'reply', 'replies')} · ${plural(r.commitments, 'commitment')} · ${plural(r.conversions, 'conversion')}</span>
        </div>
      </li>`;
    }).join('')}</ul>
    ${rows.length > 1 ? '<p class="body2"><a href="#stats">Compare seasons on the Stats tab</a></p>' : ''}
  </section>`;
}

function newSeasonPanel(season: Season): string {
  return `<section class="panel">
    <details class="new-season">
      <summary><h2>Start a new season</h2></summary>
      <p>When a new showcase year begins, start a fresh season. <strong>${esc(season.pingName)}</strong> retires to the Hall of Pings with its level, stats and look, and a new mystery egg hatches when you log your first email.</p>
      <ul class="body2">
        <li>Your contacts carry over. Emailing someone who committed or converted in an earlier season earns a <strong>+25 XP Returning friend</strong> bonus.</li>
        <li>Level, stats, quests and streaks start over. Achievements and unlocked backgrounds are kept.</li>
        <li>Past seasons stay saved, so you can compare them on the Stats tab.</li>
      </ul>
      <form id="new-season-form" novalidate>
        <div class="grid-2">
          <label class="field"><span>New season name</span><input name="name" required maxlength="60" placeholder="SGS&amp;C ${new Date().getFullYear() + 1}" /></label>
          <label class="field"><span>Name the new Ping</span><input name="pingName" maxlength="24" placeholder="Ping" /></label>
        </div>
        <h3>Key dates</h3>
        <div class="grid-4">${dateFields({}, 'nd-')}</div>
        <p class="form-error" role="alert"></p>
        <button class="btn btn-primary" type="submit">Start the new season</button>
      </form>
    </details>
  </section>`;
}

export function bindSeason(root: HTMLElement, ctx: AppContext): void {
  const form = root.querySelector<HTMLFormElement>('#season-form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const input = { name: String(data.get('name') ?? ''), pingName: String(data.get('pingName') ?? ''), keyDates: readDates(data, 'date-') };
    const season = currentSeason(ctx.state);
    try {
      if (season) {
        ctx.commit(updateSeason(ctx.state, season.id, input));
        ctx.toast('Season saved.');
      } else {
        ctx.commit(createSeason(ctx.state, input));
        ctx.toast('Season started! Log your first email to hatch your Ping.');
        ctx.navigate('home');
      }
    } catch (err) {
      form.querySelector('.form-error')!.textContent = (err as Error).message;
    }
  });

  const newForm = root.querySelector<HTMLFormElement>('#new-season-form');
  newForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(newForm);
    const input = { name: String(data.get('name') ?? ''), pingName: String(data.get('pingName') ?? ''), keyDates: readDates(data, 'nd-') };
    const old = currentSeason(ctx.state)!;
    if (!input.name.trim()) {
      newForm.querySelector('.form-error')!.textContent = 'Give the new season a name.';
      return;
    }
    if (!confirm(`Start “${input.name.trim()}”? ${old.pingName} will retire to the Hall of Pings. This can’t be undone (export a backup first if you’re unsure).`)) return;
    try {
      ctx.commit(startNewSeason(ctx.state, input));
      ctx.toast(`${input.name.trim()} has begun! A new egg is waiting to hatch.`, 'xp');
      ctx.navigate('home');
    } catch (err) {
      newForm.querySelector('.form-error')!.textContent = (err as Error).message;
    }
  });

  // Draw each season's Ping as it looks (or looked) at the end of its season.
  root.querySelectorAll<HTMLCanvasElement>('[data-hall]').forEach((canvas) => {
    const season = ctx.state.seasons.find((s) => s.id === canvas.dataset.hall)!;
    const summary = computeSeason(ctx.state, season.id);
    const c = canvas.getContext('2d')!;
    drawFrame(c, renderBackground('room', 0), 1);
    drawFrame(c, renderPing({
      seed: season.pingSeed, style: season.pingStyle ?? 1, lifeStage: lifeStageForLevel(summary.level.level),
      mood: 'happy', stats: summary.stats,
    }, { time: 0.3 }), 1);
  });
}
