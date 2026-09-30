# OutreachXP: Game Design Document

**Version:** 0.2 (revised after first review)
**Date:** 2026-09-30
**Status:** Awaiting second review.

### Changes since v0.1
| Area | Change |
|---|---|
| Categories | Now **Academia, Industry, Organizations, Government**. Media/Students and Sponsors/Partners were dropped. |
| Stats | Now 4 stats: **Intellect, Craft, Heart, Influence**. Influence (Government) grows **wings** that echo the SGS&C logo. |
| Art | Rebuilt around the **SGS&C Style Guide**: brand palette, Open Sans / Open Sans Condensed, and the brand's button and link styles (§9). |
| Stakes | Confirmed: Pip **never dies**. |
| Players | Confirmed: **solo** (only the lead) for now. Committee mode moved to "Future". |
| Seasons | Showcase dates and phases are **configured by the player each year**. Added a season setup screen and a new-season rollover (§6.5). |
| Economy | Real outreach results now make up **about two-thirds of XP**. Quests are a smaller boost, and a full day of quests adds a *Momentum* bonus to real results (§3, §6, §10). |

---

## 1. Overview

### 1.1 Elevator pitch
OutreachXP is a browser-based virtual pet game in the spirit of Tamagotchi. You look after **Pip**, a small pixel-art creature that lives off your outreach work for the Serious Games Showcase & Challenge (SGS&C). Every email you send feeds Pip. Every reply, CC and submission commitment helps it grow. The kind of people you contact decides how it grows: reaching academia makes its brain bigger, reaching industry builds its arms, reaching organizations grows its heart, and reaching government spreads its wings. Over a season Pip changes into a creature that shows the shape of your outreach.

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
1. **Cute and rewarding, never guilt-heavy.** Pip gets sleepy or bored when you're away, but it **never dies**.
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
                                        Pip reacts, grows, evolves
                                              │
                                              ▼
                              Quests / streaks / achievements progress
                                              │
                                              ▼
                        Follow-up reminders & new quests prompt ─────┘
```

**Session types:**
- **Micro session (about 30 seconds):** open the app, log a sent email or a reply, watch Pip react, close.
- **Daily check-in (2–3 minutes):** review daily quests, clear follow-up reminders, feed Pip.
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
| **Government** | Federal, state and local agencies, military training commands, public health departments, national labs, elected officials' offices | **Influence** 🏛️ | Wings |

**Why Influence and wings for Government:** government contacts rarely produce one submission. Instead they open doors at scale, through agency programs, training commands, policy groups and funding. "Influence" describes that reach. Wings show it visually, and they tie the brand directly into the creature, because the SGS&C logo mark is a winged silhouette. The more government outreach you do, the more Pip looks like the logo.

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
- **Momentum (+10% results XP for 24 hours):** earned by completing all daily quests (§6.1).
- **Diminishing returns on sends:** the first 10 initial sends each day earn full XP, sends 11–20 earn 50%, and sends after 20 earn 0 XP (they are still tracked). This keeps the focus on quality.
- **Streak multiplier:** see §6.4.

### 3.4 Honor system and integrity
The game can't check your inbox in v1, so logging is on the honor system. To keep it meaningful:
- Each stage can be logged **once per thread**. Stages must go forward in order, though skipping ahead is allowed (a reply can jump straight to Committed).
- An optional "evidence" field lets you paste a subject line or note.
- An **undo** is available for 24 hours, and it removes the XP too.
- *Future:* a Gmail/Outlook integration could detect sends and replies automatically (§12).

---

## 4. Pip: The Creature

### 4.1 Concept (brand-aligned)
Pip is a round, cheerful pixel creature designed to feel like a baby version of the SGS&C logo mark:
- **Body:** a soft black blob (#000000 outline, #232323 body) whose top rises into two small upswept points, echoing the tips of the logo's wings.
- **Face:** big white eyes with black pupils, and small **brand-orange (#FF5B23)** cheek pixels.
- **Emblem:** a tiny orange **"sG" belly mark**, like the one on the logo.
- **Hatching:** Pip hatches from an **Envelope Egg**, a white pixel envelope with an orange wax seal. The egg cracks when you log your first send.

The player names Pip when it hatches.

### 4.2 Stats → body parts (visual growth)

Each stat has **6 visual tiers (0–5)**. The tier is set by the stat's total points, so growth is gradual and visible. Parts are drawn from the brand-derived pixel palette (§9.2), with a small glow in the stat's accent color at higher tiers.

| Stat | Body Region | Tier 0 → Tier 5 visual progression |
|---|---|---|
| **Intellect** 🧠 (Academia) | Head / brain | Plain head → faint brain bump → visible peach-orange brain → oversized brain with glasses → glowing brain with graduation cap → orbiting books and a lightbulb aura |
| **Craft** 🛠️ (Industry) | Arms / hands | Tiny nubs → small arms → toned arms holding a stylus → muscular arms with a tool belt → mechanical gauntlet arms → arms plus a floating controller and wrench halo |
| **Heart** 💗 (Organizations) | Chest | No mark → small orange blush → orange heart on the chest → larger beating heart → heart with small orbiting friend-sprites → radiant heart with a warm aura |
| **Influence** 🏛️ (Government) | Wings / back | Tiny wing nubs → small wings → larger swept wings → wings with orange tips → full sweeping wings shaped like the SGS&C mark → wings plus a laurel and capitol-dome halo |

**Stat tier thresholds (stat points):** 0 / 20 / 60 / 140 / 280 / 500
(Target: steady outreach gets a primary category to Tier 3 in about 6 weeks and to Tier 5 near the end of a season.)

### 4.3 Life stages (driven by overall Level)

| Stage | Levels | Size | Notes |
|---|---|---|---|
| Envelope Egg | 0 | 16×16 | Hatches after the first logged send |
| Baby | 1–4 | 24×24 | Body parts show up to Tier 1 only |
| Kid | 5–9 | 32×32 | Up to Tier 3 |
| Teen | 10–14 | 40×40 | Up to Tier 4; first **evolution form** assigned |
| Adult | 15–24 | 48×48 | Up to Tier 5; form can re-evolve |
| Legend | 25+ | 48×48 + aura | Final form and cosmetic flourishes |

A life stage *caps* how far body parts can show. A Baby with lots of Intellect points still looks like a baby, just a very brainy one. Once it grows into the next stage, the stored growth shows up in a satisfying jump.

### 4.4 Evolution forms (driven by stat balance)

At Teen and Adult, Pip takes a **form** based on its stat distribution. The checks run in this order:

| Condition | Form | Look |
|---|---|---|
| All 4 stats between 15% and 35% of the total | **Polymath Pip** (rare) | Balanced parts, an orange-and-white prismatic outline, and a full wing silhouette that matches the logo |
| One stat ≥ 40% of the total | Pure form (below) | |
| • Intellect | **Scholar Pip** | Big brain, robe, glasses |
| • Craft | **Forge Pip** | Strong arms, apron, spark effects |
| • Heart | **Kindred Pip** | Big heart, companion sprites |
| • Influence | **Envoy Pip** | Broad wings, sash, laurel |
| Top two stats each ≥ 30% | **Hybrid form** | Blends both themes |
| Otherwise | Pure form of the highest stat | |

**The 6 hybrid forms:**

| Combination | Form |
|---|---|
| Intellect + Craft | **Inventor** |
| Intellect + Heart | **Mentor** |
| Intellect + Influence | **Strategist** |
| Craft + Heart | **Maker** |
| Craft + Influence | **Architect** |
| Heart + Influence | **Diplomat** |

### 4.5 Care meters (the Tamagotchi layer)

Three light meters, shown as pixel icons, give Pip moment-to-moment needs.

| Meter | Filled by | Drains | Low-state effect |
|---|---|---|---|
| **Fullness** 📨 | Sending emails and follow-ups ("feeding") | About 30% per day | Pip looks hungry and nibbles on an empty envelope |
| **Joy** 😊 | Replies, engagement, CCs, referrals | About 15% per day | Pip is droopy with a small raincloud |
| **Energy** ⚡ | Checking in, finishing daily quests, clearing follow-up reminders | About 20% per day | Pip yawns and naps more |

**Rules:**
- **Pip never dies**, and meters never cause permanent loss.
- If all meters stay at 0 for 7+ days, Pip goes into **Hibernation** (it curls up inside its envelope). One logged send wakes it up with a "welcome back" animation and a small bonus.
- Pip's mood changes its idle animations and dialogue lines, not your XP.
- Meters pause on days turned off in settings (e.g. weekends or holidays).

### 4.6 Interactions and personality
- **Tap or click Pip:** it reacts (giggle, bounce, a stat-flavored line such as "Professors love a concrete deadline!").
- **Reactions to logged events:**
  - Sent: Pip throws a paper airplane.
  - Reply: Pip catches an envelope.
  - Committed: happy dance.
  - Converted: orange confetti and a fanfare.
- **Tips:** Pip sometimes offers outreach tips, such as follow-up reminders or a nudge toward the stat it is lowest in.

---

## 5. Progression

### 5.1 Player level
- A single XP pool drives the **player Level** and Pip's life stage.
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
- **Palette variants**, which always stay on-brand (e.g. an inverted white Pip).

Cosmetics are unlocked through achievements and monthly or seasonal quests. They are purely cosmetic and give no power.

---

## 6. Quests and Streaks

Quests refresh on a schedule. The player sees 3 daily, 3 weekly and 2 monthly quests at a time, plus 1 seasonal quest per showcase phase. They are drawn from pools. **Quests are a boost:** their XP is modest, and the main quest reward, *Momentum*, multiplies real results.

### 6.1 Daily quests (pick 3; reset at local midnight)

| Quest | Goal | Reward |
|---|---|---|
| First Letter | Send 1 outreach email | 10 XP |
| Triple Threat | Send 3 outreach emails | 15 XP |
| Don't Leave Them Hanging | Send 1 follow-up to a thread aging 3+ days | 15 XP |
| Personal Touch | Send 2 personalized emails | 10 XP |
| Log the Win | Log any reply | 10 XP |
| New Horizons | Contact someone from a new organization | 15 XP |
| Tend the Garden | Clear all follow-up reminders due today | 15 XP + Energy refill |

**Perfect Day:** finishing all 3 dailies gives **+15 XP and Momentum**, which adds +10% XP to all *results* (stage XP) for 24 hours.

### 6.2 Weekly quests (pick 3; reset on the configured week start, Monday by default)

| Quest | Goal | Reward |
|---|---|---|
| Well-Rounded | Contact people in 3+ of the 4 categories | 75 XP |
| Conversation Starter | Get 3 replies | 60 XP |
| Door Opener | Get 1 referral or CC | 50 XP |
| Pipeline Pusher | Move 5 threads forward a stage | 60 XP |
| Category Focus: *[X]* | Send 5 emails to the category Pip is lowest in | 75 XP + 5 bonus stat points |
| Consistency | Log outreach on 4 of 7 days | 60 XP + a Streak Shield (once per month) |

### 6.3 Monthly quests (pick 2; reset on the 1st)

| Quest | Goal | Reward |
|---|---|---|
| Recruitment Drive | Get 3 commitments | 250 XP + cosmetic |
| Big Net | Reach 25 unique contacts | 200 XP |
| Bridge Builder | Contact 5 new organizations | 200 XP |
| Closer | 1 conversion | 250 XP + cosmetic |
| Four Corners | At least 1 reply from every category | 200 XP |

### 6.4 Streaks
- **Outreach streak:** consecutive *active days* with at least 1 outreach action logged (send, follow-up or logged reply).
- **Streak multiplier:** +5% XP per 7-day block, up to +25% at 35 days.
- **Active days are configurable.** Weekdays only is the default, and the player can add holidays or time off, so rest never breaks a streak.
- **Streak Shields:** you earn one every 5 levels or from certain quests, and it automatically protects one missed active day.

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
- The current Pip **graduates** into the **Hall of Pips**, a gallery of past seasons. Each entry has a "Season Yearbook" card showing its final form, stats, funnel and top achievements.
- A new Envelope Egg hatches, and **level and stats reset** for the new season.
- **Carried over:** contacts and organizations (marked as past contacts, eligible for the *Returning Friend* bonus), lifetime achievements, cosmetics, and a lifetime **Lead Rank** that sums up all seasons.

---

## 7. Achievements

Achievements are permanent, lifetime badges shown in a **Trophy Case** as pixel medals (orange on dark gray). Some unlock cosmetics.

### 7.1 Milestone achievements
| Achievement | Condition |
|---|---|
| Hatchling | Log your first outreach (Pip hatches) |
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
| Streak: Week / Month / Season | 5 / 20 / 60 active-day streak |
| Comeback Kid | Wake Pip from hibernation and then hit a 5-day streak |
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
- **Pet Whisperer:** tap Pip 100 times.
- **Deadline Hero:** log a conversion on the submission deadline day.

---

## 8. User Interface and Screens

### 8.1 Screen list
1. **Home / Pip's Room:** the creature, care meters, the level bar, a streak flame, the season countdown and a big **"+ LOG OUTREACH"** primary button.
2. **Quick Log (modal):** two taps plus a short text field.
   - Choose: *New thread* or *Update existing thread*.
   - **New:** name and organization (with autocomplete), a category chip (Academia / Industry / Organizations / Government), a *personalized* checkbox, and an optional note.
   - **Update:** select a thread, then a stage button (Replied / Engaged / CC'd [+count] / Referred / Committed / Converted / Followed Up / Closed).
3. **Pipeline:** threads grouped by stage, filterable by category. Follow-up reminders are highlighted as "aging" cards.
4. **Quests:** tabs for Daily, Weekly, Monthly and Seasonal, with progress bars and claim buttons.
5. **Trophy Case:** a grid of achievements, with locked ones shown as silhouettes.
6. **Stats & Journal:**
   - A 4-axis stat chart.
   - XP history.
   - An outreach funnel (Sent → Replied → Committed → Converted).
   - A per-category breakdown.
   - An evolution timeline ("Pip's wings grew on Oct 14!").
7. **Season:** the season setup and editor (dates and phases), the current phase, and the Hall of Pips.
8. **Settings:** active days, holidays, follow-up window, sound, data export/import and reset.

### 8.2 Feedback and juice
- Floating "+40 XP" pixel text in brand orange, with stat icons flying into the matching body part.
- An orange screen flash and a chiptune jingle on level-up and evolution. Sound is off by default.
- **Evolution cutscene:** Pip turns into a silhouette, sparkles, then is revealed with a "Pip evolved into Envoy Pip!" card that can be screenshotted and shared.

### 8.3 Wireframe (home, mobile)
```
┌──────────────────────────────┐  ← #232323 header bar
│ LV 7 CONNECTOR     🔥 12     │    (Open Sans Condensed Bold, white)
│ [██████████░░░░] 640/760 XP  │  ← orange fill on gray track
│ ⏳ 42 days to Submission Dl. │
├──────────────────────────────┤  ← white panel
│                              │
│          (Pip sprite)        │  ← pixel room background
│        wings • brain • ♥     │
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
- **Pixel world:** Pip and its room, drawn in pixel art with a palette derived from the brand colors.

### 9.1 Brand tokens (from the Style Guide)

| Token | Hex | Guide role | Use in OutreachXP |
|---|---|---|---|
| `--sg-orange` | `#FF5B23` | Logo | Primary accent: H1, XP, hover states, links, Pip's emblem and cheeks |
| `--sg-black` | `#000000` | Logo | Pip's outline, pixel shadows |
| `--sg-white` | `#FFFFFF` | Background | Page and panel background |
| `--sg-charcoal` | `#232323` | Text | Body text, H2, primary buttons, header bar, Pip's body |
| `--sg-gray` | `#A3A1A8` | Text (secondary) | Secondary labels, disabled states, empty meter tracks |
| `--sg-orange-light` | `#FF8A63`* | Hyperlink hover | Link hover, lighter pixel highlights |

*The guide shows the hyperlink-hover swatch but gives no hex value, so this is an estimate to confirm. The guide also lists the H1 color as "#FFB23", which looks like a typo for `#FF5B23`, so we'll use the logo orange.

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

- The pixel theme appears in the UI as square corners, a subtle drop shadow (like the guide's buttons), and an optional 2px pixel border on the Pip panel.

**Accessibility notes**
- `#A3A1A8` on white has a contrast ratio of about 2.6:1, which is below the WCAG minimum for body text. We'll use it only for large or non-essential text, and use a darker gray (`#6E6C73`) for small secondary text.
- White on `#FF5B23` is about 3.1:1, which is fine for bold button text of 19px or larger, as in the guide.

### 9.2 Pixel palette (brand-derived)
Pip and the world use only these colors, so the art always looks like SGS&C:

- **Orange ramp:** `#8A2A0B` · `#C9401A` · **`#FF5B23`** · `#FF8A63` · `#FFC4AE`
- **Neutral ramp:** **`#000000`** · **`#232323`** · `#3A393E` · `#6E6C73` · **`#A3A1A8`** · `#D6D5D9` · `#F2F2F2` · **`#FFFFFF`**

Values in **bold** are from the style guide.

**Stat accent colors.** These are used sparingly in the UI (stat bars, icons, the stats chart) and as small glows on Pip's parts at high tiers. They are muted so orange stays the dominant color:

| Stat | Accent |
|---|---|
| Intellect | `#8E7CC3` lavender |
| Craft | `#5C7C99` steel blue |
| Heart | `#E0506E` rose |
| Influence | `#2FA39A` teal |

### 9.3 Pixel style
- **Look:** cute and rounded, with big expressive eyes and a bouncy squash-and-stretch idle. The mostly black body with orange accents keeps it bold and recognizable at small sizes.
- **Resolution:** sprites are authored at 48×48 max (smaller for early stages) and scaled up with nearest-neighbor filtering (×4–×6).
- **Room:** a light gray (`#F2F2F2`) pixel room with a subtle texture, like the guide's page background, and a charcoal floor line. Cosmetic backgrounds follow the same palette.

### 9.4 Modular sprite system
Pip is drawn as **stacked layers**, so each body part grows independently:

```
Layer order (back → front):
  aura/effects → wings (Influence tier) → body base (life stage + form)
  → arms (Craft tier) → chest heart (Heart tier) → head/brain (Intellect tier)
  → face + sG emblem → hats/cosmetics
```

- Each body base defines anchor points, so parts attach correctly at every life stage.
- **Asset estimate:** 4 stats × 6 tiers × 3 size classes (small/medium/large) ≈ 72 part sprites, plus 6 body bases, 11 form overlays and the animations.

### 9.5 Animations (v1 minimum)
Idle bob, blink, happy bounce, sad droop, sleep, eat (envelope), paper-airplane throw, catch, dance, wing flap, evolution sparkle.

### 9.6 Logo usage
- The official SGS&C logo appears **only** on the splash and about screens, unmodified. This needs approval (§14).
- Pip is *inspired by* the logo mark, not a copy of it.

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

A typical showcase season (4–6 months) should end with an Adult Pip.

**Why this is fairer to results:**
- A single commitment (150) is worth more than a whole week of weekly quests.
- A single conversion (300) is worth more than a month of daily quests.
- Quests still help, especially early in the season before replies start arriving.

---

## 11. Technical Design (High Level)

### 11.1 Stack (proposed)
- **Frontend:** TypeScript + Vite. Either vanilla TypeScript with a small state store, or a lightweight framework (Preact or Svelte).
- **Rendering:** HTML Canvas for Pip (layered sprite compositing with nearest-neighbor scaling) and DOM/CSS for the UI.
- **Styling:** the brand tokens from §9.1 as CSS custom properties.
- **Storage:** IndexedDB for threads, events and game state, with JSON **export/import** for backups and moving between devices.
- **Hosting:** a static site (e.g. GitHub Pages), with no backend.
- **PWA:** installable and usable offline, with optional browser notifications for follow-up reminders (later).

### 11.2 Core data model (sketch)
```ts
type Category = 'academia' | 'industry' | 'organizations' | 'government';
type Stat     = 'intellect' | 'craft' | 'heart' | 'influence';

Season        { id, name, keyDates: {kickoff?, submissionsOpen?, submissionDeadline?,
                judgingStart?, judgingEnd?, eventStart?, eventEnd?, wrapUpEnd?},
                phases: Phase[], archivedAt?, finalPipSnapshot? }
Phase         { id, name, type: PhaseType, start, end }
Contact       { id, name, org, email?, category, createdAt, referredBy?: ContactId,
                pastSeasonOutcome?: 'committed' | 'converted' }
Thread        { id, seasonId, contactId, stage, stagesLogged: Stage[], ccCount,
                lastActionAt, notes[] }
OutreachEvent { id, seasonId, threadId, type: Stage | 'followup' | 'cc', xp, statPoints,
                timestamp, undoneAt? }
PlayerState   { seasonId, xp, level, stats: Record<Stat, number>,
                meters: {fullness, joy, energy}, streak, shields, momentumUntil?,
                form, lifeStage, pipName }
Lifetime      { leadRank, achievements[], cosmetics[], hallOfPips: SeasonId[] }
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

### MVP (v0.1: "Pip Hatches")
- **Season setup** (name and key dates) and a countdown on the home screen
- Quick Log (new thread plus stage updates) for all 4 categories
- XP, levels, 4 stats, care meters, streaks with configurable active days
- Pip in brand style: Egg, Baby and Kid stages, with stat parts at tiers 0–3
- Daily and weekly quests, Perfect Day and Momentum
- About 15 achievements
- Pipeline list view
- Brand UI (tokens, fonts, buttons)
- Local storage plus JSON export/import

### v0.2: "Pip Evolves"
- Teen, Adult and Legend stages; the 4 pure forms plus Polymath
- Monthly quests, streak shields, follow-up reminders
- Stats & Journal screen
- Full achievement set and cosmetics

### v0.3: "Showcase Season"
- Full phase editor and seasonal quests
- New-season rollover, the Hall of Pips and Season Yearbook cards
- The 6 hybrid forms
- Sound, PWA install and notifications

### Future / stretch
- **Email integration** (a Gmail/Outlook add-on or API) to detect sends and replies automatically
- **Committee mode:** each member has their own Pip in a shared "Committee Habitat", with team quests
- Template library of outreach emails for each category

---

## 13. Success Metrics

Since the goal is to change behavior, the Journal tracks these for the lead's own reflection:
- Outreach actions per week, compared with before using the game
- Follow-up rate (the share of unanswered threads that get followed up)
- Reply → commitment → conversion funnel rates, overall and by category
- Category balance over time
- Active days per week, and streak length
- Season-over-season comparison (from the Hall of Pips)

---

## 14. Open Questions for Review

1. **Government stat:** are you happy with **Influence** and wings? The alternative is **Authority**, shown as a shield and badge with a sturdier stance.
2. **Season rollover:** should Pip **graduate and reset** each season (recommended; the old Pip goes to the Hall of Pips), or keep growing across years?
3. **Logo use:** can the app show the official SGS&C logo on its splash screen, and is a Pip with an "sG" belly emblem and logo-shaped wings acceptable to whoever owns the brand?
4. **Stat accent colors:** are the four muted accent colors (§9.2) acceptable? They are outside the style guide. The alternative is shades of orange and gray only, which is harder to tell apart on charts.
5. **Hyperlink hover color:** do you have the exact hex value for the guide's light-orange hover swatch?
6. **Art sourcing:** should I produce the pixel art in code as a first pass (placeholder sprites), or will an artist draw the final sprites?
7. **Tech and hosting:** is GitHub Pages fine, or does it need to run somewhere specific?
