// Season setup and editing (GDD §6.5). Dates are optional and can change any time.

import { createSeason, updateSeason } from '../../game/actions';
import { formatDate } from '../../game/dates';
import { KEY_DATE_LABELS } from '../../game/rules';
import type { KeyDates } from '../../game/types';
import { currentSeason, esc, upcomingDates, type AppContext } from '../context';

export function renderSeason(ctx: AppContext): string {
  const season = currentSeason(ctx.state);
  const dates = season?.keyDates ?? {};
  const fields = (Object.keys(KEY_DATE_LABELS) as (keyof KeyDates)[]).map((key) => `<label class="field">
      <span>${KEY_DATE_LABELS[key]}</span>
      <input type="date" name="date-${key}" value="${esc(dates[key] ?? '')}" />
    </label>`).join('');

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
        <div class="grid-4">${fields}</div>
        <p class="form-error" role="alert"></p>
        <button class="btn btn-primary" type="submit">${season ? 'Save changes' : 'Start the season'}</button>
      </form>
    </section>
    ${upcoming.length ? `<section class="panel"><h2>Coming up</h2><ul class="date-list">${upcoming.map((d) => `<li><span>${esc(d.label)}</span><span>${formatDate(d.date)}</span><span class="body2">${d.days === 0 ? 'today' : `in ${d.days} days`}</span></li>`).join('')}</ul></section>` : ''}
    ${season ? `<p class="body2 note">Starting a new season each year (with the Hall of Pings and year-over-year comparison) arrives in a later update.</p>` : ''}
  </div>`;
}

export function bindSeason(root: HTMLElement, ctx: AppContext): void {
  const form = root.querySelector<HTMLFormElement>('#season-form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const keyDates: KeyDates = {};
    for (const key of Object.keys(KEY_DATE_LABELS) as (keyof KeyDates)[]) {
      const v = String(data.get(`date-${key}`) ?? '');
      if (v) keyDates[key] = v;
    }
    const input = { name: String(data.get('name') ?? ''), pingName: String(data.get('pingName') ?? ''), keyDates };
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
}
