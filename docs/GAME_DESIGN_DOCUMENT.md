# OutreachXP: Game Design Document

**Version:** 0.3.4
**Date:** 2026-09-30
**Status:** Approved for build. Implementation has started with the Ping generator and Ping Lab (§12).

### Changes in v0.3.4
- **More unique Pings:** seeds now also choose a coat color, body shape, markings, cheek color and eye color (§4.1). The look is a surprise at hatching and can't be changed; Pings hatched before this keep the classic look.

### Changes in v0.3.3
- **Re-paced for weekly outreach:** daily quests removed (now 3 weekly + 2 monthly), Perfect Day became **Perfect Week** (+50 XP, Momentum for the next week), streaks count **weeks** (+5% XP per 4 weeks), and Ping's meters drain about 5× slower.

### Changes in v0.3.2
- The creature is renamed from Pip to **Ping** (you "ping" people with outreach). Forms follow the same pattern, such as Scholar Ping and Envoy Ping. Players still name their own Ping when it hatches.

### Changes in v0.3.1
- All open questions from v0.3 are resolved (§14).
- Implementation notes were added to §9.4 from building the generator.

### Changes in v0.3
| Area | Change |
|---|---|
| Government stat | Now **Authority** 🛡️, shown as a sturdier **stance, badge and shield**. Influence and wings were removed. |
| Logo | The logo is **not used literally** anywhere, because it will change. Ping keeps the brand *colors and fonts* but no logo shapes, and all brand values live in one swappable theme file (§9.6). |
| Ping's art | **Procedurally generated** from its stats and a hatch seed. There are no hand-drawn sprite sheets, and growth is continuous (§9.4). Added a *Ping Lab* tuning page. |
| Seasons | Ping **starts over** each season. Each past season is saved in full, and a new **Season Comparison** screen compares years side by side (§6.6). |
| Accent colors | The four stat accent colors are **approved**. |
| Hosting | **GitHub Pages** is confirmed, deployed with GitHub Actions (§11.1). |

### Changes in v0.2
| Area | Change |
|---|---|
| Categories | Now **Academia, Industry, Organizations, Government**. Media/Students and Sponsors/Partners were dropped. |
| Stats | Now 4 stats: **Intellect, Craft, Heart, Influence**. Influence (Government) grows **wings** that echo the SGS&C logo. |
| Art | Rebuilt around the **SGS&C Style Guide**: brand palette, Open Sans / Open Sans Condensed, and the brand's button and link styles (§9). |
| Stakes | Confirmed: Ping **never dies**. |
| Players | Confirmed: **solo** (only the lead) for now. Committee mode moved to "Future". |
| Seasons | Showcase dates and phases are **configured by the player each year**. Added a season setup screen and a new-season rollover (§6.5). |
| Economy | Real outreach results now make up **about two-thirds of XP**. Quests are a smaller boost, and a full day of quests adds a *Momentum* bonus to real results (§3, §6, §10). |

---

## 1. Overview

### 1.1 Elevator pitch
OutreachXP is a browser-based virtual pet game in the spirit of Tamagotchi. You look after **Ping**, a small pixel-art creature that lives off your outreach work for the Serious Games Showcase & Challenge (SGS&C). Every email you send feeds Ping. Every reply, CC and submission commitment helps it grow. The kind of people you contact decides how it grows: reaching academia makes its brain bigger, reaching industry builds its arms, reaching organizations grows its heart, and reaching government gives it a sturdy stance, an official badge and eventually a shield. Over a season Ping changes into a creature that shows the shape of your outreach.

### 1.2 Purpose
The game exists to **motivate the outreach subcommittee lead to do more outreach, and to do it consistently**. It does this by:
- Turning a slow activity with delayed feedback (cold emails) into one that pays off right away (XP, animations, a creature that grows).
- Rewarding the whole pipeline, and rewarding **real results most**: follow-ups, replies, referrals and conversions.
- Making the balance of outreach *visible*. A lopsided creature quietly shows which groups have been left out.
- Adding daily, weekly and monthly rhythms that match how an outreach campaign actually runs.

### 1.3 Target player
- **The outreach subcommittee lead only** (single player) for now.

### 1.4 Platform
- Web app running in a desktop or mobile browser. It is responsive, and designed so it can be installed as an app (PWA) later.
- Works offline first, and data stays on the device (see §11).
- Reusable every year: the showcase dates are set in-game (§6.5).

### 1.5 Design pillars
1. **Cute and rewarding, never guilt-heavy.** Ping gets sleepy or bored when you're away, but it **never dies**.
2. **Real results come first.** Replies, commitments and conversions are the biggest rewards. Quests give a boost but never outweigh results.
3. **Your creature is your outreach, made visible.** Every visual change maps to a real outreach behavior.
4. **Logging takes seconds.** If logging an email takes more than about 10 seconds, the game fails.
5. **On-brand.** The game looks and feels like it belongs to SGS&C (§9).

---

## 2. Core Gameplay Loop

```
   ┌──────────────────────────────────────────────────────────┐
   │                                                          │
   ▼                                                          │
Do real outreach  ──►  Log it in-game  ──►  Earn XP + Stat Points
(send / follow up /      (quick-log form     │
 get reply, etc.)         or pipeline card)   ▼
                                        Ping reacts, grows, evolves
                                              │
                                              ▼
                              Quests / streaks / achievements progress
                                              │
                                              ▼
                        Follow-up reminders & new quests prompt ─────┘
```

**Session types:**
- **Micro session (about 30 seconds):** open the app, log a sent email or a reply, watch Ping react, close.
- **Daily check-in (2–3 minutes):** review daily quests, clear follow-up reminders, feed Ping.
- **Weekly review (5–10 minutes):** check the weekly summary, collect weekly quest rewards, look at the stat balance and plan next week's targets.

---

## 3. The Outreach Pipeline (What Gets Logged)

Each outreach is tracked as a **Contact Thread**, one card per person reached. A thread moves through stages, and each stage pays XP once.

### 3.1 Contact categories (these drive stats)

| Category | Examples | Linked Stat | Body Part |
|---|---|---|---|
| **Academia** | Professors, K-12 teachers, university game/sim programs, researchers, student chapters | **Intellect** 🧠 | Brain |
| **Industry** | Game studios, sim/training companies, healthcare and defense sim vendors, industry professionals | **Craft** 🛠️ | Arms |
| **Organizations** | Nonprofits, professional associations, museums, libraries, community groups | **Heart** 💗 | Heart |
| **Government** | Federal, state and local agencies, military training commands, public health departments, national labs, elected officials' offices | **Authority** 🛡️ | Stance, badge & shield |

**Why Authority for Government:** government contacts bring credibility and official backing, through agency programs, training commands, policy groups and funding. Ping shows this by *standing taller*: its legs and posture get sturdier, and it earns an official badge, then a sash, then a shield.

**Categorization rule of thumb:** pick the category by *what the contact's organization is*, not by its funding.
- Public universities go under **Academia**.
- Government-funded nonprofits go under **Organizations**.
- Government contractors go under **Industry**.
- Only the agencies themselves go under **Government**.

### 3.2 Pipeline stages and base XP (rebalanced so results pay most)

| Stage / Event | Trigger (what the player logs) | Base XP | Stat Points* |
|---|---|---|---|
| **Sent** | Sent an initial email | 10 | 1 |
| ↳ *Personalized bonus* | Ticked "personalized" (not a template blast) | +5 | – |
| **Followed Up** | Sent a follow-up to an unanswered thread | 10 | 1 |
| **Replied** | Contact responded (any reply) | 40 | 3 |
| **Engaged** | Positive reply: interested, asked questions, booked a call | 60 | 4 |
| **Amplified (CC)** | Contact CC'd or forwarded to others in their group | 20 per person (max 5) | 1 each |
| **Referred** | Contact introduced you to a *new* contact (auto-creates a linked thread) | 50 | 3 |
| **Committed** | Contact plans to submit, judge, attend or share | 150 | 8 |
| **Converted** | Actually submitted, served as judge, participated, etc. | 300 | 15 |
| **Thanked / Closed Loop** | Sent a thank-you, or closed a dead thread cleanly | 5 | – |

*Stat points go to the stat linked to the thread's category.

### 3.3 Modifiers
- **New Organization bonus (+25 XP):** the first contact ever logged from a given organization or domain.
- **Warm Intro multiplier (×1.25):** threads created through a referral earn 25% more XP at every later stage.
- **Speed bonus (+10 XP):** you followed up within the recommended window (3–7 days after sending with no reply). The window can be changed in settings.
- **Returning Friend (+25 XP):** re-engaging a contact who committed or converted in a *previous season* (§6.5).
- **Momentum (+10% results XP for a week):** earned by a Perfect Week, completing all weekly quests (§6.1).
- **Diminishing returns on sends:** the first 10 initial sends each day earn full XP, sends 11–20 earn 50%, and sends after 20 earn 0 XP (they are still tracked). This keeps the focus on quality.
- **Streak multiplier:** see §6.4.

### 3.4 Honor system and integrity
The game can't check your inbox in v1, so logging is on the honor system. To keep it meaningful:
- Each stage can be logged **once per thread**. Stages must go forward in order, though skipping ahead is allowed (a reply can jump straight to Committed).
- An optional "evidence" field lets you paste a subject line or note.
- An **undo** is available for 24 hours, and it removes the XP too.
- *Future:* a Gmail/Outlook integration could detect sends and replies automatically (§12).

---

## 4. Ping: The Creature

### 4.1 Concept (brand-aligned)
Ping is a round, cheerful pixel creature drawn in the SGS&C brand **colors**, but it borrows **no logo shapes**, so it stays valid after the planned logo change:
- **Body:** a soft charcoal blob (`#232323` body, `#000000` outline) with small rounded ears.
- **Face:** big white eyes with black pupils, and small **brand-orange** (`#FF5B23`) cheek pixels.
- **Mark:** a small orange **envelope-seal** belly mark. It is the game's own symbol, not the showcase logo.
- **Hatching:** Ping hatches from an **Envelope Egg**, a white pixel envelope with an orange wax seal. The egg cracks when you log your first send.
- **Uniqueness:** each Ping gets a random **seed** when it hatches. The seed sets its details, so every season's Ping (and every player's) looks different even with similar stats:
  - **Coat color** from a brand-friendly set of dark coats: Charcoal (most common), Midnight, Cocoa, Plum, Forest, Slate, and a rare Ember. All keep the white eyes, orange heart and colored clothing readable.
  - **Body shape:** Round, Pear, Bean, Squat, Egg or Boxy, within limits that keep the head large and the eyes clear.
  - **Markings:** none, a belly patch, spots, a mask around the eyes, or a crown, in a soft two-tone pattern.
  - **Cheek color** (orange, rose or peach), **eye color** (black, deep blue or brown), plus ear shape, eye shape, freckles and an idle quirk.
  - **It's a mystery until it hatches.** The look is decided by the seed when the season starts, and the player can't preview or change it; the Envelope Egg hatches into whatever Ping it holds.
  - **Style versions:** each season stores a look *style*. Pings hatched before this variety keep the classic charcoal look; new seasons hatch with the latest style.

The player names Ping when it hatches. Ping's whole appearance is **generated in code** from its stats, life stage, form and seed (§9.4).

### 4.2 Stats → body parts (visual growth)

Each body part **grows continuously** with its stat: the brain gets a little bigger with every point. On top of that, each stat has **6 tiers (0–5)**, and each tier unlocks a new generated accessory or detail. Everything uses the brand-derived pixel palette (§9.2), with a small glow in the stat's accent color at higher tiers.

| Stat | Body Region | Tier 0 → Tier 5 visual progression |
|---|---|---|
| **Intellect** 🧠 (Academia) | Head / brain | Plain head → faint brain bump → visible peach-orange brain → oversized brain with glasses → glowing brain with graduation cap → orbiting books and a lightbulb aura |
| **Craft** 🛠️ (Industry) | Arms / hands | Tiny nubs → small arms → toned arms holding a stylus → muscular arms with a tool belt → mechanical gauntlet arms → arms plus a floating controller and wrench halo |
| **Heart** 💗 (Organizations) | Chest | No mark → small orange blush → orange heart on the chest → larger beating heart → heart with small orbiting friend-sprites → radiant heart with a warm aura |
| **Authority** 🛡️ (Government) | Legs, stance & badge | Tiny feet → sturdy feet with a steadier stance → taller posture with a lanyard ID badge → orange sash with a star badge → a shield at its side and a small plinth to stand on → a glowing shield with a laurel crest |

**Stat tier thresholds (stat points):** 0 / 20 / 60 / 140 / 280 / 500
(Target: steady outreach gets a primary category to Tier 3 in about 6 weeks and to Tier 5 near the end of a season.)

### 4.3 Life stages (driven by overall Level)

| Stage | Levels | Size (at 128×128) | Notes |
|---|---|---|---|
| Envelope Egg | 0 | ~34×40 px | Hatches after the first logged send |
| Baby | 1–4 | ~30 px body | Body parts show up to Tier 1 only |
| Kid | 5–9 | ~40 px body | Up to Tier 3 |
| Teen | 10–14 | ~48 px body | Up to Tier 4; first **evolution form** assigned |
| Adult | 15–24 | ~54 px body | Up to Tier 5; form can re-evolve |
| Legend | 25+ | ~54 px body + aura | Final form and cosmetic flourishes |

A life stage *caps* how far body parts can show. A Baby with lots of Intellect points still looks like a baby, just a very brainy one. Once it grows into the next stage, the stored growth shows up in a satisfying jump.

### 4.4 Evolution forms (driven by stat balance)

At Teen and Adult, Ping takes a **form** based on its stat distribution. The checks run in this order:

| Condition | Form | Look |
|---|---|---|
| All 4 stats between 15% and 35% of the total | **Polymath Ping** (rare) | Balanced parts, an orange-and-white prismatic outline, and a small crest showing all four stat icons |
| One stat ≥ 40% of the total | Pure form (below) | |
| • Intellect | **Scholar Ping** | Big brain, robe, glasses |
| • Craft | **Forge Ping** | Strong arms, apron, spark effects |
| • Heart | **Kindred Ping** | Big heart, companion sprites |
| • Authority | **Envoy Ping** | Tall stance, sash, shield, laurel |
| Top two stats each ≥ 30% | **Hybrid form** | Blends both themes |
| Otherwise | Pure form of the highest stat | |

**The 6 hybrid forms:**

| Combination | Form |
|---|---|
| Intellect + Craft | **Inventor** |
| Intellect + Heart | **Mentor** |
| Intellect + Authority | **Strategist** |
| Craft + Heart | **Maker** |
| Craft + Authority | **Architect** |
| Heart + Authority | **Diplomat** |

### 4.5 Care meters (the Tamagotchi layer)

Three light meters, shown as pixel icons, give Ping moment-to-moment needs.

| Meter | Filled by | Drains | Low-state effect |
|---|---|---|---|
| **Fullness** 📨 | Sending emails and follow-ups ("feeding") | About 30% per day | Ping looks hungry and nibbles on an empty envelope |
| **Joy** 😊 | Replies, engagement, CCs, referrals | About 15% per day | Ping is droopy with a small raincloud |
| **Energy** ⚡ | Checking in, finishing daily quests, clearing follow-up reminders | About 20% per day | Ping yawns and naps more |

**Rules:**
- **Ping never dies**, and meters never cause permanent loss.
- If all meters stay at 0 for 7+ days, Ping goes into **Hibernation** (it curls up inside its envelope). One logged send wakes it up with a "welcome back" animation and a small bonus.
- Ping's mood changes its idle animations and dialogue lines, not your XP.
- Meters pause on days turned off in settings (e.g. weekends or holidays).

### 4.6 Interactions and personality
- **Tap or click Ping:** it reacts (giggle, bounce, a stat-flavored line such as "Professors love a concrete deadline!").
- **Reactions to logged events:**
  - Sent: Ping throws a paper airplane.
  - Reply: Ping catches an envelope.
  - Committed: happy dance.
  - Converted: orange confetti and a fanfare.
- **Tips:** Ping sometimes offers outreach tips, such as follow-up reminders or a nudge toward the stat it is lowest in.

---

## 5. Progression

### 5.1 Player level
- A single XP pool drives the **player Level** and Ping's life stage.
- Curve: `XP to next level = 80 × level^1.4`, rounded.
  - Examples: L1→2 = 80, L5→6 ≈ 760, L10→11 ≈ 2,010, L15→16 ≈ 3,540.
  - Cumulative XP: L5 ≈ 1,200, L10 ≈ 7,400, L15 ≈ 20,400.
- Each level-up gives a celebration, can unlock a cosmetic, and sometimes grants a **Streak Shield** (§6.4).

### 5.2 Titles (committee lead ranks)
Shown next to the player name, unlocked by level:
Intern Liaison (1) → Outreach Rookie (3) → Connector (5) → Networker (8) → Ambassador (12) → Coalition Builder (15) → Showcase Champion (20) → Legend of Outreach (25+).

### 5.3 Cosmetics (optional rewards)
- **Hats and accessories**, such as a lanyard or a judge's badge.
- **Room backgrounds:** office, campus quad, expo hall, capitol steps, conference booth.
- **Palette variants**, which always stay on-brand (e.g. an inverted white Ping).

Cosmetics are unlocked through achievements and monthly or seasonal quests. They are purely cosmetic and give no power.

---

## 6. Quests and Streaks

The game is paced for a lead who does outreach **a few times a week, not every day**. There are no daily quests, streaks count weeks, and Ping's needs drain slowly.

Quests refresh on a schedule. The player sees 3 weekly and 2 monthly quests at a time (plus, later, 1 seasonal quest per showcase phase), drawn from pools with a seeded shuffle. **Quests are a boost:** their XP is modest, and the main quest reward, *Momentum*, multiplies real results. Quests complete automatically as outreach is logged.

### 6.1 Weekly quests (pick 3; new quests every Monday)

| Quest | Goal | Reward |
|---|---|---|
| Outreach Burst | Send 5 outreach emails | 50 XP |
| Well-Rounded | Email people in 3 of the 4 categories | 75 XP |
| Personal Touch | Send 3 personalized emails | 50 XP |
| New Horizons | Contact 2 new organizations | 60 XP |
| Follow-Through | Follow up on 2 unanswered emails (only offered when follow-ups are due) | 50 XP |
| Conversation Starter | Get 2 replies | 60 XP |
| Door Opener | Get a referral or a CC | 50 XP |
| Pipeline Pusher | Move 3 contacts forward a stage | 60 XP |
| Category Focus: *[X]* | Send 3 emails to the category Ping is lowest in | 75 XP + 5 bonus stat points |
| Steady Hand | Log outreach on 2 different days | 50 XP |

**Perfect Week:** finishing all 3 weekly quests gives **+50 XP and Momentum**, which adds +10% XP to all *results* (replies, commitments, conversions) for the whole next week.

### 6.2 Monthly quests (pick 2; new quests on the 1st)

| Quest | Goal | Reward |
|---|---|---|
| Recruitment Drive | Get 3 commitments | 250 XP |
| Big Net | Email 15 different people | 200 XP |
| Bridge Builder | Contact 5 new organizations | 200 XP |
| Closer | Get 1 conversion | 250 XP |
| Full House | Get a reply from all 4 categories | 200 XP |
| Perfectionist | Complete a Perfect Week | 150 XP |

### 6.3 (Removed) Daily quests
Daily quests were dropped in v0.3.3 because the lead won't typically do outreach every day.

### 6.4 Streaks (weekly)
- **Outreach streak:** consecutive **weeks** (Monday–Sunday) with at least 1 outreach action logged.
- **Streak multiplier:** +5% XP for every 4 weeks of streak, up to +25% at 20 weeks.
- **Time off:** a week in which every active day is marked as a holiday never breaks a streak.
- **Streak Shields (planned):** earned every 5 levels; each protects one missed week.

### 6.5 Seasons (configurable every year)

The game is built to be reused for every SGS&C cycle. Everything tied to dates is set by the player.

**Season Setup (first launch, and at each new season):**
1. **Season name**, for example "SGS&C 2027".
2. **Key dates.** Each can be edited and left blank if not known yet:
   - Outreach kickoff
   - Submissions open
   - Submission deadline
   - Judging window (start and end)
   - Showcase / event date(s)
   - Season wrap-up end
3. **Phases** are generated from those dates using the defaults below. The player can **rename, re-date, add or remove phases**, and pick a *phase type* for each one, which tells the game which seasonal quest pool to use.
4. **Settings:** week start day, active days, holidays, follow-up window.

**Default phase types and seasonal quests:**

| Phase type | Default span | Focus | Example Seasonal Quest (300 XP + seasonal cosmetic) |
|---|---|---|---|
| **Kickoff** | Kickoff → submissions open | Build contact lists, reach new orgs | "Map the Field": contact 10 new organizations |
| **Call for Submissions** | Submissions open → 3 weeks before the deadline | Academia and Industry | "Fill the Hall": 5 commitments to submit |
| **Final Push** | Last 3 weeks before the deadline | Follow-ups and reminders | "No Thread Left Behind": follow up on every open thread |
| **Judging** | Judging window | Recruiting and supporting judges | "Assemble the Panel": 3 judges confirmed |
| **Event & Wrap-up** | Event → wrap-up end | Thank-yous, relationship upkeep | "Gratitude Tour": 10 thank-you emails |
| **Off-season** | Any gap | Light upkeep | "Keep in Touch": 5 check-ins with past contacts |

**Home screen countdown:** the next key date is always visible, e.g. "⏳ 42 days to Submission Deadline".

**New season rollover (proposed):**
- The current Ping **graduates** into the **Hall of Pings**, a gallery of past seasons. Each entry has a "Season Yearbook" card showing its final form, stats, funnel and top achievements.
  - Because Ping is procedurally generated, only its *genome* (seed, stats, form and life stage) needs saving. Any past Ping can be redrawn exactly, at any size.
- A new Envelope Egg hatches, and **level and stats reset** for the new season.
- **Nothing from the old season is deleted.** Its events, threads and summary stay stored so seasons can be compared (§6.6).
- **Carried over:** contacts and organizations (marked as past contacts, eligible for the *Returning Friend* bonus), lifetime achievements, cosmetics, and a lifetime **Lead Rank** that sums up all seasons.

### 6.6 Season Comparison (year over year)

A dedicated screen compares any two or more seasons side by side.

**Headline table** (one column per season):

| Metric | Example: 2026 | Example: 2027 |
|---|---|---|
| Emails sent / follow-ups | 212 / 97 | 260 / 141 |
| Reply rate | 31% | 36% |
| Commitments / conversions | 18 / 9 | 24 / 13 |
| New organizations reached | 54 | 71 |
| Category mix (A / I / O / G) | 45 / 30 / 15 / 10% | 35 / 30 / 20 / 15% |
| Longest streak, active days | 38 | 52 |
| Final level and form | L16 Scholar Ping | L18 Mentor Ping |

**Charts:**
- **Cumulative outreach and results over the season**, with one line per season.
  - The x-axis can align seasons by **weeks before the submission deadline** (the default) or by **calendar date**, because showcase dates move from year to year.
- **Funnel comparison** (Sent → Replied → Committed → Converted) for each season.
- **Category mix** for each season, using the stat accent colors.

**Also on this screen:**
- **Ping line-up:** each season's final Ping, redrawn from its saved genome and placed side by side.
- **Personal bests:** "Best reply rate: 2027", "Most conversions: 2027", and so on.
- **Pace check during a live season:** "You're 12 sends ahead of last year at this point before the deadline."
- **Export:** each season's summary can be exported as CSV, in addition to the full JSON backup.

---

## 7. Achievements

Achievements are permanent, lifetime badges shown on the **Achievements** page as medals (orange on dark gray).

**Every achievement unlocks a background for Ping's room.** Harder achievements unlock rarer, more elaborate scenes, many of them animated. All backgrounds are procedurally drawn, like Ping, and the player equips one from the Achievements page.

| Rarity | Backgrounds (unlocked by) |
|---|---|
| Default | Ping's Room |
| Common | Mailroom (Hatchling), Café Chat (First Contact), Sunny Window (Pen Pal), Cork Board (Believer) |
| Uncommon | Map Room (Four Corners), Rainy Window, animated (Persistence Pays), Sunset (On a Roll), Library (Office Hours), Game Studio (Mixer Regular), Community Garden (Community Builder), Capitol Steps (Public Servant) |
| Rare | Expo Hall with moving spotlights (Signed, Sealed, Delivered), Ocean Breeze with waves (The Ripple), The Network with pulses (Chain Reaction), Starry Night (Perfect Week), New Dawn (Comeback Kid) |
| Epic | City at Night (The Conversation), Retro Arcade (Well-Rounded), Paper Airplane Sky (Postmaster) |
| Legendary | Showcase Stage (Showrunner), Aurora (Unstoppable), Hall of Fame (Hall of Fame) |

### 7.1 Milestone achievements
| Achievement | Condition |
|---|---|
| Hatchling | Log your first outreach (Ping hatches) |
| Pen Pal | 10 emails sent |
| Postmaster | 100 emails sent |
| Mail Mountain | 500 emails sent |
| First Contact | First reply received |
| The Conversation | 25 replies |
| Believer | First commitment |
| Showrunner | 10 commitments |
| Signed, Sealed, Delivered | First conversion |
| Hall of Fame | 25 conversions |

### 7.2 Behavior achievements
| Achievement | Condition |
|---|---|
| Persistence Pays | Get a reply after the 2nd follow-up |
| The Ripple | A single thread CCs 5+ people |
| Chain Reaction | A referral of a referral (a 3-link chain) |
| Inbox Zero Hero | Clear all follow-up reminders on 5 active days in a row |
| Four Corners | Contact all 4 categories in a single day |
| Well-Rounded | Every stat at Tier 2 or above |
| Polymath | Unlock the Polymath form |
| On a Roll / Unstoppable | 4-week / 12-week outreach streak |
| Comeback Kid | Wake Ping from hibernation and then hit a 5-day streak |
| Alumni Network | Win back a Returning Friend from a previous season |
| Veteran Lead | Complete 2 / 3 / 5 seasons |

### 7.3 Category achievements (3 tiers each)
| Category | Tier 1: 10 contacted | Tier 2: 5 replies | Tier 3: 3 commitments |
|---|---|---|---|
| Academia | Office Hours | Faculty Friend | Tenured |
| Industry | Mixer Regular | Studio Insider | Green-Lit |
| Organizations | Community Builder | Common Cause | Coalition |
| Government | Public Servant | Through Proper Channels | Signed into Policy |

### 7.4 Hidden achievements
Surprises, for example:
- **Night Owl:** log outreach at 2am.
- **Double Feature:** two conversions in one day.
- **Pet Whisperer:** tap Ping 100 times.
- **Deadline Hero:** log a conversion on the submission deadline day.

---

## 8. User Interface and Screens

### 8.1 Screen list
1. **Home / Ping's Room:** the creature, care meters, the level bar, a streak flame, the season countdown and a big **"+ LOG OUTREACH"** primary button.
2. **Quick Log (modal):** two taps plus a short text field.
   - Choose: *New thread* or *Update existing thread*.
   - **New:** name and organization (with autocomplete), a category chip (Academia / Industry / Organizations / Government), a *personalized* checkbox, and an optional note.
   - **Update:** select a thread, then a stage button (Replied / Engaged / CC'd [+count] / Referred / Committed / Converted / Followed Up / Closed).
3. **Pipeline:** threads grouped by stage, filterable by category. Follow-up reminders are highlighted as "aging" cards.
4. **Quests:** tabs for Daily, Weekly, Monthly and Seasonal, with progress bars and claim buttons.
5. **Achievements:** a grid of achievements, with locked ones shown as silhouettes, plus the backgrounds they unlock and a picker to equip one.
6. **Stats & Journal:**
   - A 4-axis stat chart.
   - XP history.
   - An outreach funnel (Sent → Replied → Committed → Converted).
   - A per-category breakdown.
   - An evolution timeline ("Ping earned its shield on Oct 14!").
7. **Season:** the season setup and editor (dates and phases), the current phase, the Hall of Pings and **Season Comparison** (§6.6).
8. **Settings:** active days, holidays, follow-up window, sound, data export/import and reset.

### 8.2 Feedback and juice
- Floating "+40 XP" pixel text in brand orange, with stat icons flying into the matching body part.
- An orange screen flash and a chiptune jingle on level-up and evolution. Sound is off by default.
- **Evolution cutscene:** Ping turns into a silhouette, sparkles, then is revealed with a "Ping evolved into Envoy Ping!" card that can be screenshotted and shared.

### 8.3 Wireframe (home, mobile)
```
┌──────────────────────────────┐  ← #232323 header bar
│ LV 7 CONNECTOR     🔥 12     │    (Open Sans Condensed Bold, white)
│ [██████████░░░░] 640/760 XP  │  ← orange fill on gray track
│ ⏳ 42 days to Submission Dl. │
├──────────────────────────────┤  ← white panel
│                              │
│      (procedural Ping)        │  ← pixel room background
│     brain • arms • ♥ • badge │
│                              │
│  📨 ████░  😊 ███░░  ⚡ ██░░░ │
├──────────────────────────────┤
│ TODAY                        │  ← H2 style
│ ☑ First Letter               │
│ ☐ Triple Threat 1/3          │
│ ☐ Follow-up (2 due)          │
├──────────────────────────────┤
│   [ + LOG OUTREACH ]         │  ← primary button #232323 → hover #FF5B23
├──────────────────────────────┤
│ 🏠  📋  🎯  🏆  📊  📅        │
└──────────────────────────────┘
```

---

## 9. Art Direction & Brand

The game follows the **SGS&C Style Guide**. There are two layers:
- **Brand UI:** clean, condensed type, black/charcoal and orange, taken straight from the guide.
- **Pixel world:** Ping and its room, drawn in pixel art with a palette derived from the brand colors.

### 9.1 Brand tokens (from the Style Guide)

| Token | Hex | Guide role | Use in OutreachXP |
|---|---|---|---|
| `--sg-orange` | `#FF5B23` | Logo | Primary accent: H1, XP, hover states, links, Ping's cheeks and seal mark |
| `--sg-black` | `#000000` | Logo | Ping's outline, pixel shadows |
| `--sg-white` | `#FFFFFF` | Background | Page and panel background |
| `--sg-charcoal` | `#232323` | Text | Body text, H2, primary buttons, header bar, Ping's body |
| `--sg-gray` | `#A3A1A8` | Text (secondary) | Secondary labels, disabled states, empty meter tracks |
| `--sg-orange-light` | `#FF8A63`* | Hyperlink hover | Link hover, lighter pixel highlights |

*The guide shows the hyperlink-hover swatch but gives no hex value, so this is an estimate to confirm. The guide also lists the H1 color as "#FFB23", which looks like a typo for `#FF5B23`, so we'll use the brand orange.

**Typography**

| Style | Font | Weight | Color |
|---|---|---|---|
| H1 | Open Sans Condensed | Bold | `#FF5B23` |
| H2 | Open Sans Condensed | Bold | `#232323` |
| Body 1 | Open Sans | Regular | `#232323` |
| Body 2 | Open Sans | Regular | `#A3A1A8` |

- All of these are available from Google Fonts: Open Sans with its width axis set to 75% gives the condensed style.
- A pixel font is used **only** for in-world numbers such as XP popups and meter labels, for the game feel. All other text uses brand fonts.

**Buttons and links (per guide)**

| Element | Default | Hover |
|---|---|---|
| Primary button | `#232323` background, white text | `#FF5B23` background, white text |
| Secondary button | White background, `#232323` text | `#FF5B23` background, white text |
| Hyperlink | `#FF5B23` | `#FF8A63` |

- The pixel theme appears in the UI as square corners, a subtle drop shadow (like the guide's buttons), and an optional 2px pixel border on the Ping panel.

**Accessibility notes**
- `#A3A1A8` on white has a contrast ratio of about 2.6:1, which is below the WCAG minimum for body text. We'll use it only for large or non-essential text, and use a darker gray (`#6E6C73`) for small secondary text.
- White on `#FF5B23` is about 3.1:1, which is fine for bold button text of 19px or larger, as in the guide.

### 9.2 Pixel palette (brand-derived)
Ping and the world use only these colors, so the art always looks like SGS&C:

- **Orange ramp:** `#8A2A0B` · `#C9401A` · **`#FF5B23`** · `#FF8A63` · `#FFC4AE`
- **Neutral ramp:** **`#000000`** · `#141414` · **`#232323`** · `#2D2C31` · `#3A393E` · `#6E6C73` · **`#A3A1A8`** · `#D6D5D9` · `#F2F2F2` · **`#FFFFFF`**

Values in **bold** are from the style guide.

**Stat accent colors (approved).** These are used sparingly in the UI (stat bars, icons, the stats chart) and as small glows on Ping's parts at high tiers. They are muted so orange stays the dominant color:

| Stat | Accent |
|---|---|
| Intellect | `#8E7CC3` lavender |
| Craft | `#B7851F` amber |
| Heart | `#D9486A` rose |
| Authority | `#2FA39A` teal |

### 9.3 Pixel style
- **Look:** cute and rounded, with big expressive eyes and a bouncy squash-and-stretch idle. The mostly black body with orange accents keeps it bold and recognizable at small sizes.
- **Resolution:** Ping is generated on a 128×128 pixel grid (the body is at most about 96 px tall, smaller for early stages) and scaled up with nearest-neighbor filtering (×2–×4). This gives a detailed "late-console" pixel look rather than chunky 8-bit pixels.
- **Room:** a light gray (`#F2F2F2`) pixel room with a subtle texture, like the guide's page background, and a charcoal floor line. Cosmetic backgrounds follow the same palette.

### 9.4 Procedural generation of Ping

Ping is **not drawn by hand**. Its image is generated in code, in the browser, from a small description called the **genome**. The same genome always produces the same Ping.

**Genome (inputs)**
```ts
PingGenome {
  seed,                       // set at hatch: controls small unique details
  lifeStage,                  // egg, baby, kid, teen, adult, legend
  form,                       // Scholar, Forge, ..., Polymath
  stats: { intellect, craft, heart, authority },  // raw points: drive continuous growth
  mood,                       // from care meters: posture and expression
  cosmetics[]                 // hats, backgrounds, palette variant
}
```

**Stats → shape parameters.** Each stat maps to parameters through an easing curve with a maximum, so early points show quickly and growth never becomes grotesque:

| Stat | Continuous parameters | Tier-unlocked details (generated from shapes) |
|---|---|---|
| Intellect | Brain dome radius, head height ratio, brain fold count | Glasses (T3), cap (T4), orbiting books and bulb (T5) |
| Craft | Arm length, arm thickness, hand size | Stylus (T2), tool belt (T3), gauntlet plating (T4), controller-and-wrench halo (T5) |
| Heart | Heart size, pulse strength, blush intensity | Beating animation (T3), orbiting friend-sprites (T4), warm aura (T5) |
| Authority | Leg length, stance width, overall height, posture | Lanyard badge (T2), sash and star (T3), shield and plinth (T4), shield glow and laurel (T5) |

**Forms** apply a preset on top of the stats, such as Scholar's taller head ratio or Envoy's straighter posture, plus the form's signature accessory.

**Rendering pipeline (per frame)**
1. **Build shapes:** body, head, brain, arms, heart, legs and accessories are made from simple primitives (ellipses, rounded rectangles, curves and blobs), positioned from anchor points that move as parts grow.
2. **Rasterize** each shape onto the low-resolution pixel grid.
3. **Shade:** each shape is lit from the upper left and filled with 3–4 steps from its palette ramp (§9.2). Optional ordered dithering gives a retro texture.
4. **Composite** the layers in order (below).
5. **Outline:** add an automatic 1px dark outline around the silhouette and between major parts, which is the key to the clean pixel-art look.
6. **Add details:** face, cheeks, seal mark, and seed-based freckles and quirks.
7. **Scale up** to the screen with nearest-neighbor filtering (`image-rendering: pixelated`).

```
Layer order (back → front):
  aura/effects → shield (Authority) → legs & stance (Authority) → body
  → arms (Craft) → chest heart (Heart) → head/brain (Intellect)
  → face + seal mark + badge/sash → hats/cosmetics
```

**Animation**
- Idle bob, squash and stretch, breathing and heart pulse are transforms applied to the shape parameters *before* rasterizing, so motion always snaps cleanly to the pixel grid.
- **Growth morphing:** when stats change, the parameters tween from old to new values over about 1 second. You literally watch the brain grow.
- Frames are cached, and only regenerated when the genome or animation frame changes.

**Rules that keep Ping readable and cute**
- The head always stays at least 45% of total height (a baby-like proportion).
- Parts never cover the eyes.
- The silhouette must still read at 1× scale (128 px canvas).
- Each part has a size cap so balanced and lopsided Pings both look good.

**Implementation notes (from the first build)**
- The generator draws on a **128×128** pixel canvas (layout is designed on a 64-unit grid at a pixel density of 2). Ping's body stays within about 96 px, and the extra room holds orbiting items, auras and the plinth. Outlines and fine details stay 1px wide, which keeps the art crisp and detailed; the Lab shows it at 3× on screen.
- Small hearts use hand-authored **pixel glyphs**, because a sampled heart curve reads as a "V" at small sizes. Large hearts are built from two round lobes over a point. Other parts use shapes.
- The body uses a 5-step charcoal ramp for smoother shading. Eyes have two catch-lights, and mouths and closed eyes are drawn as smooth 1px curves.
- The body's highlight step is kept to a tiny specular spot, so the charcoal body doesn't look washed out.
- Animation is quantized to **10 fps** for a crisp, retro feel.

**Ping Lab (developer and tuning page).** A hidden page with sliders for every stat, life stage, form, seed and mood. It shows a grid of generated Pings, and is used to tune the look and review changes. It can also export a PNG or a sprite sheet for sharing.

**Testing:** generator output is deterministic, so automated snapshot tests can catch accidental visual changes.

### 9.5 Animations (v1 minimum)
Idle bob, blink, happy bounce, sad droop, sleep, eat (envelope), paper-airplane throw, catch, dance, shield raise and badge shine, evolution sparkle. All animations are procedural (§9.4).

### 9.6 Logo and rebranding
- The SGS&C logo is **not used** in the game for now, because it is planned to change. The title screen uses an **"OutreachXP" wordmark** set in the brand fonts, with the envelope-seal mark.
- **All brand values live in one theme file:** colors, fonts, the pixel palette ramps and the optional logo image slot. A future rebrand means editing that one file, and Ping's colors update automatically because it is generated from the palette.

### 9.7 Audio (optional, v0.3)
Chiptune sound effects for logging, level-up and evolution. Sound is off by default.

---

## 10. Game Economy Summary (Tuning Targets)

**Assumed "healthy" week for the lead:** 15 sends (about half personalized), 8 follow-ups, 5 replies, 2 engaged, 2 CCs, 1 referral, 1 commitment, and a conversion about every 3 weeks.

| Source | Weekly XP (approx.) | Share |
|---|---|---|
| Sends (15 × 10 + 8 × 5) | 190 | |
| Follow-ups (8 × 10) | 80 | |
| Replies and engaged (5 × 40 + 2 × 60) | 320 | |
| CC and referral (2 × 20 + 50) | 90 | |
| Commitment (1 × 150) | 150 | |
| Conversion (300 ÷ 3 weeks) | 100 | |
| **Results subtotal** | **930** | **≈ 64%** |
| Dailies (5 days × (3 × ~12 + 15 Perfect Day)) | 255 | |
| Weeklies (3 × ~60) | 180 | |
| Monthlies (2 × ~225, spread over ~4.3 weeks) | 105 | |
| **Quests subtotal** | **540** | **≈ 36%** |
| Momentum (+10% on results, about 4 of 5 days) | ~75 | counted with results |
| **Total** | **~1,545 XP/week** | |

**Result:**
- Level 5 in week 1.
- Level 10 around week 5 (Teen, the first evolution).
- Level 15 around week 13–14 (Adult).
- Level 25 (Legend) only with a strong season of about 30+ weeks.

A typical showcase season (4–6 months) should end with an Adult Ping.

**Why this is fairer to results:**
- A single commitment (150) is worth more than a whole week of weekly quests.
- A single conversion (300) is worth more than a month of daily quests.
- Quests still help, especially early in the season before replies start arriving.

---

## 11. Technical Design (High Level)

### 11.1 Stack (proposed)
- **Frontend:** TypeScript + Vite. Either vanilla TypeScript with a small state store, or a lightweight framework (Preact or Svelte).
- **Rendering:** HTML Canvas for Ping, generated procedurally (§9.4) and scaled with nearest-neighbor filtering, with DOM/CSS for the UI.
- **Styling:** the brand tokens from §9.1 in a single theme file, exposed as CSS custom properties (§9.6).
- **Storage:** IndexedDB for threads, events and game state, with JSON **export/import** for backups and moving between devices.
- **Hosting:** **GitHub Pages** (confirmed), with no backend. A GitHub Actions workflow builds and deploys the site on every push to the main branch.
- **PWA:** installable and usable offline, with optional browser notifications for follow-up reminders (later).

### 11.2 Core data model (sketch)
```ts
type Category = 'academia' | 'industry' | 'organizations' | 'government';
type Stat     = 'intellect' | 'craft' | 'heart' | 'authority';

Season        { id, name, keyDates: {kickoff?, submissionsOpen?, submissionDeadline?,
                judgingStart?, judgingEnd?, eventStart?, eventEnd?, wrapUpEnd?},
                phases: Phase[], archivedAt?, finalPing?: PingGenome, summary?: SeasonSummary }
SeasonSummary { sends, followUps, replies, engaged, ccs, referrals, commitments,
                conversions, newOrgs, byCategory: Record<Category, Funnel>,
                weeklySeries[], longestStreak, finalLevel, finalForm }
Phase         { id, name, type: PhaseType, start, end }
Contact       { id, name, org, email?, category, createdAt, referredBy?: ContactId,
                pastSeasonOutcome?: 'committed' | 'converted' }
Thread        { id, seasonId, contactId, stage, stagesLogged: Stage[], ccCount,
                lastActionAt, notes[] }
OutreachEvent { id, seasonId, threadId, type: Stage | 'followup' | 'cc', xp, statPoints,
                timestamp, undoneAt? }
PlayerState   { seasonId, xp, level, stats: Record<Stat, number>,
                meters: {fullness, joy, energy}, streak, shields, momentumUntil?,
                form, lifeStage, pingName }
Lifetime      { leadRank, achievements[], cosmetics[], hallOfPings: SeasonId[] }
Settings      { activeDays, holidays[], weekStart, followUpWindowDays, sound }
QuestState    { id, templateId, period: 'daily'|'weekly'|'monthly'|'seasonal',
                progress, goal, claimed, expiresAt }
```
- XP, stats, quests and achievements are **derived from the event log** wherever practical. This makes undo safe and lets the numbers be retuned by replaying events.
- The category → stat mapping is stored as data, not hard-coded, so categories can be renamed later.

### 11.3 Privacy
- All contact data stays in the user's browser. Nothing is sent to a server.
- Email addresses are optional; name plus organization is enough.

---

## 12. Scope and Roadmap

### Milestone 0: "Ping Lab" ✅ built
- Procedural Ping generator (§9.4), theme file (§9.6), Ping Lab page, unit tests and GitHub Pages deployment

### MVP (v0.1: "Ping Hatches")

**Build progress:**
- Part 1 (core loop) ✅ built: season setup, Quick Log with live XP preview, pipeline, the full XP engine (§3), levels and titles, undo, and local save with export/import.
- Part 2 (Ping comes alive) ✅ built: Fullness/Joy/Energy meters that drain only on active days and set Ping's mood; daily check-ins restore energy; hibernation after 7 active days at zero, with a +20 XP welcome-back bonus; outreach streaks with configurable active days and holidays and the +5%-per-week XP multiplier; reaction animations (paper airplane, falling envelope with hearts, happy dance, confetti, and a sparkle burst for hatching, level-ups and waking).
- Part 3 (quests and achievements) ✅ built, then re-paced for weekly use in v0.3.3: 3 weekly and 2 monthly quests per period, picked with a seeded shuffle from the §6.1/§6.2 pools (follow-up quests only appear when a follow-up is due); quests complete automatically from logged outreach; Perfect Week (+50 XP) gives Momentum (+10% XP on replies, commitments and conversions) for the next week; Category Focus targets Ping's lowest stat and adds 5 stat points; 22 achievements with unlock dates and progress on the Achievements page, each unlocking a procedurally drawn background (common to legendary); the Quick Log preview shows which quests a log will complete.
- **The MVP is complete.** Next up is v0.2 (§12).
- v0.2 progress: **Stats & Journal** ✅ built: headline tiles (contacts emailed, reply rate, commitments, conversions), the outreach funnel with step-to-step rates, outreach per week (column chart with hover details and a table view), personal bests (best week, longest streak, active weeks), a per-category table, and a newest-first journal of milestones (season start, hatching, level-ups, growing up, evolving, Perfect Weeks, achievements). A category filter applies to the tiles, funnel and weekly chart. Category colors were re-validated for colorblind readers: Craft/Industry is now amber `#B7851F` and Heart is `#D9486A`.

**Meter tuning (as built, weekly pace):** start 70/70/70. Drain per active day: Fullness −6, Joy −4, Energy −5 (about −30/−20/−25 per work week), so one outreach session a week keeps Ping content; about two quiet weeks make it sad; hibernation comes after all meters sit at zero for 3 more active days (roughly 4–5 quiet weeks). Refills: send +12 Fullness; follow-up +10 Fullness and +8 Energy; reply or positive reply +15 Joy; CC +5 Joy per person (up to 4); referral +15 Joy; commitment +25 Joy; conversion +35 Joy; closing the loop +3 Joy; daily check-in +30 Energy. Mood: sleepy when hibernating or Energy < 25, sad when Fullness or Joy < 20, happy after outreach today or when Fullness and Joy are both 60+, otherwise neutral.

- **Season setup** (name and key dates) and a countdown on the home screen
- Quick Log (new thread plus stage updates) for all 4 categories
- XP, levels, 4 stats, care meters, streaks with configurable active days
- **Procedural Ping generator** with continuous growth for all 4 stats, Egg, Baby and Kid stages, tier details up to T3, and the Ping Lab tuning page
- Weekly and monthly quests, Perfect Week and Momentum
- About 15 achievements
- Pipeline list view
- Brand UI (tokens, fonts, buttons)
- Local storage plus JSON export/import
- GitHub Pages deployment through GitHub Actions

### v0.2: "Ping Evolves"
- Teen, Adult and Legend stages; the 4 pure forms plus Polymath
- Monthly quests, streak shields, follow-up reminders
- Stats & Journal screen
- Full achievement set and cosmetics

### v0.3: "Showcase Season"
- Full phase editor and seasonal quests
- New-season rollover, the Hall of Pings, Season Yearbook cards and **Season Comparison**
- The 6 hybrid forms
- Sound, PWA install and notifications

### Future / stretch
- **Email integration** (a Gmail/Outlook add-on or API) to detect sends and replies automatically
- **Committee mode:** each member has their own Ping in a shared "Committee Habitat", with team quests
- Template library of outreach emails for each category

---

## 13. Success Metrics

Since the goal is to change behavior, the Journal tracks these for the lead's own reflection:
- Outreach actions per week, compared with before using the game
- Follow-up rate (the share of unanswered threads that get followed up)
- Reply → commitment → conversion funnel rates, overall and by category
- Category balance over time
- Active days per week, and streak length
- Season-over-season comparison (§6.6)

---

## 14. Decisions Log (Open Questions Resolved)

| Question | Decision |
|---|---|
| Hyperlink hover color | Use `#FF8A63`. |
| Authority visuals | Feet → badge → sash → shield is approved. |
| Seed uniqueness | Each season's Ping gets small random differences from its seed. |
| First build step | Build the procedural Ping generator and the Ping Lab first. |

There are no open questions right now. New ones will be added here as the build continues.
