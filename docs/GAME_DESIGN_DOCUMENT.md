# OutreachXP: Game Design Document

**Version:** 0.1 (draft for review)
**Date:** 2026-09-30
**Status:** Awaiting review. Nothing here is locked yet.

---

## 1. Overview

### 1.1 Elevator pitch
OutreachXP is a browser-based virtual pet game in the spirit of Tamagotchi. You look after **Pip**, a small pixel-art creature that lives off your outreach work. Every email you send for the Serious Games Showcase & Challenge feeds Pip. Every reply, CC and submission commitment helps it grow. The kind of people you contact decides how it grows: reaching educators makes its brain bigger, reaching industry pros builds its arms, and so on. Over a season Pip changes into a creature that shows the shape of your outreach.

### 1.2 Purpose
The game exists to **motivate the subcommittee lead to do more outreach, and to do it consistently**. It does this by:
- Turning a slow activity with delayed feedback (cold emails) into one that pays off right away (XP, animations, a creature that grows).
- Rewarding the whole pipeline, not just sending: follow-ups, replies, referrals and conversions all count.
- Making the balance of outreach *visible*. A lopsided creature quietly shows which groups have been left out.
- Adding daily, weekly and monthly rhythms that match how an outreach campaign actually runs.

### 1.3 Target player
- **Primary:** the outreach subcommittee lead (a single player).
- **Secondary (future):** other committee members, who could each have their own Pip plus a shared committee view.

### 1.4 Platform
- Web app running in a desktop or mobile browser. It is responsive, and designed so it can be installed as an app (PWA) later.
- Works offline first, and data stays on the device in v1 (see §11).

### 1.5 Design pillars
1. **Cute and rewarding, never guilt-heavy.** Pip gets sleepy or bored when you're away, but it never dies. Motivation comes from delight, not punishment.
2. **Reward quality over volume.** Replies, follow-ups and conversions are worth far more than raw sends, and spam sending has diminishing returns.
3. **Your creature is your outreach, made visible.** Every visual change maps to a real outreach behavior.
4. **Logging takes seconds.** If logging an email takes more than about 10 seconds, the game fails.

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

Each outreach is tracked as a **Contact Thread**, one card per person or organization reached. A thread moves through stages, and each stage pays XP once.

### 3.1 Contact categories (these drive stats)

| Category | Examples | Linked Stat |
|---|---|---|
| **Educators & Academia** | Professors, K-12 teachers, university game/sim programs, researchers | **Intellect** |
| **Industry Professionals** | Game studios, sim/training companies, defense & healthcare sim vendors | **Craft** |
| **Organizations & Community** | Nonprofits, professional associations, government agencies, museums, libraries | **Heart** |
| **Media & Students** | Student clubs, game dev meetups, podcasts, newsletters, press, social channels | **Voice** |
| **Sponsors & Partners** | Potential sponsors, prize donors, venue/tech partners | **Fortune** |

> *Review question:* Are these the right 5 buckets for your showcase? Judges and speakers could be their own category, or they could be a tag on top of these.

### 3.2 Pipeline stages and base XP

| Stage / Event | Trigger (what the player logs) | Base XP | Stat Points* |
|---|---|---|---|
| **Sent** | Sent an initial email | 10 | 1 |
| ↳ *Personalized bonus* | Ticked "personalized" (not a template blast) | +5 | +0 |
| **Followed Up** | Sent a follow-up to an unanswered thread | 8 | 1 |
| **Replied** | Contact responded (any reply) | 25 | 2 |
| **Engaged** | Positive reply: interested, asked questions, booked a call | 40 | 3 |
| **Amplified (CC)** | Contact CC'd or forwarded to others in their group | 15 per person (max 5) | 1 each |
| **Referred** | Contact introduced you to a *new* contact (auto-creates a linked thread) | 30 | 2 |
| **Committed** | Contact plans to submit, judge, sponsor, attend or share | 75 | 5 |
| **Converted** | Actually submitted, signed on as judge, confirmed sponsorship, etc. | 150 | 8 |
| **Thanked / Closed Loop** | Sent a thank-you, or closed a dead thread cleanly | 5 | 0 |

*Stat points go to the stat linked to the thread's category.

### 3.3 Modifiers
- **New Organization bonus (+20 XP):** the first contact ever logged from a given organization or domain.
- **Warm Intro multiplier (×1.25):** threads created through a referral earn 25% more XP at every later stage.
- **Speed bonus (+10 XP):** you followed up within the recommended window (3–7 days after sending with no reply).
- **Diminishing returns on sends:** the first 10 initial sends each day earn full XP, sends 11–20 earn 50%, and sends after 20 earn 0 XP (they are still tracked). This keeps the focus on quality.
- **Streak multiplier:** see §6.4.

### 3.4 Honor system and integrity
The game can't check your inbox in v1, so logging is on the honor system. To keep it meaningful:
- Each stage can be logged **once per thread**. Stages must go forward in order, though skipping ahead is allowed (a reply can jump straight to Committed).
- An optional "evidence" field lets you paste a subject line or note. It is not required, but it makes the history more useful.
- An **undo** is available for 24 hours, and it removes the XP too.
- *Future:* a Gmail/Outlook integration could detect sends and replies automatically (§12).

---

## 4. Pip: The Creature

### 4.1 Concept
Pip is a round, cheerful, blob-like pixel creature with a little envelope flap on its head. It hatches from an **Envelope Egg** at the start of the outreach season. It has a face, small limbs and a clear body layout, so each stat can grow a visible body part.

### 4.2 Stats → body parts (visual growth)

Each stat has **6 visual tiers (0–5)**. The tier is set by the stat's total points, so growth is gradual and visible.

| Stat | Body Region | Tier 0 → Tier 5 visual progression |
|---|---|---|
| **Intellect** 🧠 | Head / brain | Plain head → faint brain bump → visible pink brain → oversized brain with glasses → glowing brain with graduation cap → floating orbiting books and lightbulb aura |
| **Craft** 🛠️ | Arms / hands | Tiny nubs → small arms → toned arms holding a stylus → muscular arms with a tool belt → mechanical/gauntlet arms → arms plus a floating controller/wrench halo |
| **Heart** 💗 | Chest | No mark → small heart blush → visible heart on chest → larger beating heart → heart with small orbiting friend-sprites → radiant heart with a rainbow aura |
| **Voice** 📣 | Mouth / ears / antenna | Tiny mouth → antenna sprout → bigger ears and antenna → megaphone accessory → radio-wave antenna sparks → broadcast tower antenna with signal rings |
| **Fortune** ✨ | Coat / shell / crown | Plain skin → coin spots → shiny coat → cape → gilded shell with coins → crown and sparkle trail |

**Stat tier thresholds (stat points):** 0 / 10 / 30 / 70 / 150 / 300
(Tune these during playtesting. The goal is that a lead doing steady outreach reaches Tier 3 in a primary category within about 6–8 weeks.)

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

At Teen and Adult, Pip takes a **form** based on its stat distribution:

| Condition | Form | Look |
|---|---|---|
| Intellect is dominant (≥ 40% of stat total) | **Scholar Pip** | Big brain, robe, glasses |
| Craft dominant | **Forge Pip** | Strong arms, apron, spark effects |
| Heart dominant | **Kindred Pip** | Big heart, flower motifs, companion sprites |
| Voice dominant | **Herald Pip** | Megaphone, antenna, broadcast rings |
| Fortune dominant | **Patron Pip** | Gold shell, crown, coin sparkles |
| Top two stats both ≥ 30% | **Hybrid form** (e.g. Intellect + Craft = *Inventor Pip*) | Blends both themes |
| No stat above 25% (balanced) | **Polymath Pip** | Rare, prismatic form (the design rewards balance) |

> *Review question:* Should the hybrid list be fully built out (10 combinations), or should we start with the 5 pure forms plus Polymath and add hybrids later?

### 4.5 Care meters (the Tamagotchi layer)

Three light meters, shown as pixel icons, give Pip moment-to-moment needs.

| Meter | Filled by | Drains | Low-state effect |
|---|---|---|---|
| **Fullness** 📨 | Sending emails and follow-ups ("feeding") | About 30% per day | Pip looks hungry and nibbles on an empty envelope |
| **Joy** 😊 | Replies, engagement, CCs, referrals | About 15% per day | Pip is droopy with a small raincloud |
| **Energy** ⚡ | Checking in, finishing daily quests, clearing follow-up reminders | About 20% per day | Pip yawns and naps more |

**Rules:**
- Meters **never** cause death or permanent loss.
- If all meters stay at 0 for 7+ days, Pip goes into **Hibernation** (it sleeps in its egg). One logged send wakes it up with a "welcome back" animation and a small bonus. This avoids the guilt spiral that makes people quit habit apps.
- Pip's mood (based on the meters) changes its idle animations and dialogue lines, not your XP.

### 4.6 Interactions and personality
- **Tap or click Pip:** it reacts (giggle, bounce, a stat-flavored line such as "Did you know educators love concrete dates?").
- **Reactions to logged events:** a unique animation for each stage (Sent = Pip throws a paper airplane, Reply = catches an envelope, Committed = happy dance, Converted = confetti and fanfare).
- **Tips:** Pip sometimes offers outreach tips, such as a follow-up reminder or template ideas.
- **Naming:** the player names their Pip when it hatches.

---

## 5. Progression

### 5.1 Player level
- A single XP pool drives the **player Level** and Pip's life stage.
- Curve: `XP to next level = 100 × level^1.4` (rounded). Examples: L1→2 = 100, L5→6 ≈ 950, L10→11 ≈ 2,500, L20→21 ≈ 6,600.
- Each level-up gives a celebration, can unlock a cosmetic, and sometimes grants a **Streak Shield** (§6.4).

### 5.2 Titles (committee lead ranks)
Shown next to the player name, unlocked by level:
Intern Liaison (1) → Outreach Rookie (3) → Connector (5) → Networker (10) → Ambassador (15) → Coalition Builder (15) → Showcase Champion (20) → Legend of Outreach (25+).

### 5.3 Cosmetics (optional rewards)
Hats, backgrounds (office, campus, expo hall, arcade), accessories and color palettes, unlocked through achievements and monthly quests. These are purely cosmetic and give no power.

---

## 6. Quests and Streaks

Quests refresh on a schedule. The player sees 3 daily, 3 weekly and 2–3 monthly quests at a time, drawn from pools. Quests give bonus XP and sometimes stat points or cosmetics.

### 6.1 Daily quests (pick 3 from the pool; reset at local midnight)

| Quest | Goal | Reward |
|---|---|---|
| First Letter | Send 1 outreach email | 20 XP |
| Triple Threat | Send 3 outreach emails | 40 XP |
| Don't Leave Them Hanging | Send 1 follow-up to a thread aging 3+ days | 30 XP |
| Personal Touch | Send 2 personalized emails | 30 XP |
| Log the Win | Log any reply | 25 XP |
| New Horizons | Contact someone from a new organization | 35 XP |
| Tend the Garden | Clear all follow-up reminders due today | 30 XP + Energy refill |

**Daily completion bonus:** finishing all 3 dailies gives +50 XP and a "Perfect Day" tick for the weekly quest chain.

### 6.2 Weekly quests (pick 3; reset Monday)

| Quest | Goal | Reward |
|---|---|---|
| Well-Rounded | Contact people in 3+ different categories | 150 XP |
| Conversation Starter | Get 3 replies | 150 XP |
| Door Opener | Get 1 referral or CC | 120 XP |
| Pipeline Pusher | Move 5 threads forward a stage | 150 XP |
| Category Focus: *[X]* | Send 5 emails to the category Pip is lowest in | 200 XP + 5 bonus stat points |
| Consistency | Log outreach on 4 of 7 days | 175 XP |

### 6.3 Monthly quests (pick 2–3; reset on the 1st)
Monthly quests can be **themed to the showcase calendar** (§6.5).

| Quest | Goal | Reward |
|---|---|---|
| Recruitment Drive | Get 3 commitments (plan to submit/participate) | 500 XP + cosmetic |
| Big Net | Reach 25 unique contacts | 400 XP |
| Bridge Builder | Contact 5 new organizations | 400 XP |
| Closer | 1 conversion (submission, judge or sponsor confirmed) | 600 XP + cosmetic |
| Seasonal Special | Varies by showcase phase | 500 XP + seasonal cosmetic |

### 6.4 Streaks
- **Outreach streak:** consecutive days with at least 1 outreach action logged (send, follow-up or logged reply).
- **Streak multiplier:** +5% XP per 7-day block, up to +25% at 35 days.
- **Weekends:** by default weekends *don't break* streaks (configurable). This is a work activity and shouldn't punish rest.
- **Streak Shields:** you earn one every 5 levels or from certain quests, and it automatically protects one missed day.

### 6.5 Showcase phases (seasonal layer)
The lead sets key dates once (submission open, deadline, judging, event day). The game then shifts quest pools to fit each phase:

| Phase | Focus | Example Seasonal Quest |
|---|---|---|
| **Kickoff** | Build contact lists, reach new orgs | "Map the Field": 10 new organizations |
| **Call for Submissions** | Educators, students, studios | "Fill the Hall": 5 commitments to submit |
| **Judges & Sponsors** | Industry, sponsors | "Assemble the Panel": 3 judges confirmed |
| **Final Push** | Follow-ups, reminders before the deadline | "No Thread Left Behind": follow up on every open thread |
| **Event & Wrap-up** | Thank-yous, relationship upkeep | "Gratitude Tour": 10 thank-you emails |

---

## 7. Achievements

Achievements are permanent, one-time badges shown in a trophy case as pixel medals. Some unlock cosmetics.

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
| Six Degrees | Contacts across 6+ distinct referral chains |
| Inbox Zero Hero | Clear all follow-up reminders 7 days running |
| Well-Rounded | Every stat at Tier 2 or above |
| Polymath | Unlock the Polymath form |
| Streak: Week / Month / Season | 7 / 30 / 90-day streak |
| Early Bird | Log outreach before 9am on 5 days |
| Comeback Kid | Wake Pip from hibernation and hit a 7-day streak |

### 7.3 Category achievements (one set per category)
For example, Educators: **Office Hours** (10 educators contacted) → **Faculty Friend** (5 educator replies) → **Tenured** (3 educator commitments). Each category has a matching 3-tier set.

### 7.4 Hidden or secret achievements
Surprises, for example: "Night Owl" (log at 2am), "Double Rainbow" (two conversions in one day), "Pet Whisperer" (tap Pip 100 times).

---

## 8. User Interface and Screens

### 8.1 Screen list
1. **Home / Pip's Room:** the creature, care meters, level bar, a streak flame and a big **"+ Log Outreach"** button. The room background can be customized.
2. **Quick Log (modal):** two taps plus a short text field.
   - Choose: *New thread* or *Update existing thread*.
   - New: name/org (with autocomplete), category chip, personalized ✓, optional note.
   - Update: select thread, then a stage button (Replied / Engaged / CC'd [+count] / Referred / Committed / Converted / Followed Up / Closed).
3. **Pipeline:** a kanban view of all threads by stage, filterable by category. Follow-up reminders are highlighted as "aging" cards with a small cobweb icon.
4. **Quests:** tabs for Daily, Weekly, Monthly and Seasonal, with progress bars and claim buttons.
5. **Trophy Case:** a grid of achievements, with locked ones shown as silhouettes.
6. **Stats and Journal:** a radar chart of the 5 stats, XP history, an outreach funnel (Sent → Replied → Committed → Converted), and a timeline of Pip's evolutions ("Pip grew a bigger brain on Oct 14!").
7. **Settings:** showcase dates, weekend-streak rule, reminder windows, category names, data export/import and reset.

### 8.2 Feedback and juice
- Floating "+25 XP" pixel text, with stat icons popping into the matching body part.
- A screen flash and chiptune jingle on level-up and evolution (sound is off by default, with a toggle).
- An evolution cutscene: silhouette, sparkle, reveal, then a "Pip evolved into Scholar Pip!" card that can be screenshotted and shared with the committee.

### 8.3 Wireframe (home, mobile)
```
┌──────────────────────────────┐
│ Lv 7 Connector   🔥 12 days  │
│ [██████████░░░░] 640/950 XP  │
├──────────────────────────────┤
│                              │
│          ✨  (Pip)  ✨        │
│         [pixel sprite]       │
│                              │
│  📨 ████░  😊 ███░░  ⚡ ██░░░ │
├──────────────────────────────┤
│ Today: ☑ First Letter        │
│        ☐ Triple Threat 1/3   │
│        ☐ Follow-up (2 due)   │
├──────────────────────────────┤
│      [ + LOG OUTREACH ]      │
├──────────────────────────────┤
│ 🏠  📋  🎯  🏆  📊           │
└──────────────────────────────┘
```

---

## 9. Art Direction

### 9.1 Style
- **Cute pixel art**: soft, rounded silhouettes, big expressive eyes, bouncy squash-and-stretch idle animation.
- **Resolution:** sprites authored at 48×48 max (smaller for early stages) and scaled up with nearest-neighbor filtering (×4–×6) for crisp pixels.
- **Palette:** a limited, warm 24–32 color palette (pastel base, with one accent color per stat):
  - Intellect: soft pink and lavender (brain)
  - Craft: warm orange and steel gray
  - Heart: rose red
  - Voice: sky blue and teal
  - Fortune: gold and cream
- **UI:** a pixel-bordered panel frame that feels like the device shell, e.g. a rounded Tamagotchi-like egg frame on desktop.

### 9.2 Modular sprite system (key technical-art decision)
Pip is drawn as **stacked layers**, so body parts can grow independently without hand-drawing every combination:

```
Layer order (back → front):
  aura/effects → back accessories (cape/shell) → body base (by life stage + form)
  → arms (Craft tier) → chest heart (Heart tier) → head/brain (Intellect tier)
  → face/mouth/antenna (Voice tier) → overlays (Fortune shine/crown) → hats/cosmetics
```

- Each part has anchor points defined per body base, so parts attach correctly across life stages.
- Asset count estimate for v1: 6 life-stage bases × 5 stat parts × 6 tiers ≈ 180 part sprites, plus about 7 form overlays and animations. **To cut scope:** parts could be drawn per *size class* (small/medium/large) rather than per life stage, which cuts this to about 90.

### 9.3 Animations (v1 minimum)
Idle bob, blink, happy bounce, sad droop, sleep, eat (envelope), paper-airplane throw, catch, dance, evolution sparkle.

### 9.4 Audio (optional, v1.1)
Chiptune SFX for logging, level-up and evolution, plus an optional lo-fi chiptune loop. Sound is off by default.

---

## 10. Game Economy Summary (Tuning Targets)

**Assumed "healthy" week for a lead:** 15 sends, 8 follow-ups, 5 replies, 2 engaged, 2 CCs, 1 referral, 1 commitment.

| Source | Weekly XP (approx.) |
|---|---|
| Sends (15 × 10, +5 personalized on ~half) | 190 |
| Follow-ups (8 × 8) | 64 |
| Replies / engaged (5 × 25 + 2 × 40) | 205 |
| CC / referral (2 × 15 + 30) | 60 |
| Commitment (75) | 75 |
| Dailies (~5 days × (~95 + 50 completion bonus)) | ~725 |
| Weeklies (~3 × 150) | ~450 |
| **Total** | **~1,775 XP/week** |

**Result** (cumulative XP: L5 ≈ 1,500, L10 ≈ 9,200, L15 ≈ 25,500): about Level 5 in week 1, Level 10 around week 5–6 (Teen form, the first evolution), and Level 15 around week 14–15 (Adult). That fits a showcase season of about 4–6 months.

> ⚠️ Quests currently make up about two-thirds of XP. That's intentional for early motivation, but we may want to raise the pipeline XP values so *real results* feel more dominant. This is flagged for tuning.

---

## 11. Technical Design (High Level)

### 11.1 Stack (proposed)
- **Frontend:** TypeScript + Vite. Either vanilla TS with a small state store, or a lightweight framework (Preact/Svelte), to be decided.
- **Rendering:** HTML Canvas for Pip (layered sprite compositing, nearest-neighbor scaling) and DOM/CSS for the UI.
- **Storage:** IndexedDB (via a small wrapper) for threads, events and game state, with JSON **export/import** for backup and moving between devices.
- **Hosting:** a static site (GitHub Pages or similar), so no backend is needed in v1.
- **PWA:** installable, offline, and optional browser notifications for follow-up reminders (later).

### 11.2 Core data model (sketch)
```ts
Contact     { id, name, org, email?, category, createdAt, referredBy?: ContactId }
Thread      { id, contactId, stage, stagesLogged: Stage[], ccCount, lastActionAt, notes[] }
OutreachEvent { id, threadId, type: Stage | 'followup' | 'cc', xp, statPoints, timestamp, undoneAt? }
PlayerState { xp, level, stats: {intellect, craft, heart, voice, fortune},
              meters: {fullness, joy, energy}, streak, shields, form, lifeStage,
              cosmetics[], achievements[], settings }
QuestState  { id, templateId, period: 'daily'|'weekly'|'monthly'|'seasonal', progress, goal, claimed, expiresAt }
```
- XP, stats, quests and achievements are **derived from the event log** wherever practical. This makes undo safe and lets us retune the numbers later by replaying events.

### 11.3 Privacy
- All contact data stays in the user's browser in v1. Nothing is sent to a server.
- Email addresses are optional; name plus organization is enough.

---

## 12. Scope and Roadmap

### MVP (v0.1: "Pip Hatches")
- Quick Log (new thread plus stage updates), all 5 categories
- XP, levels, 5 stats, care meters
- Pip with 3 life stages (Egg, Baby, Kid) and stat-part tiers 0–3
- Daily and weekly quests (fixed pools)
- About 15 achievements
- Pipeline list view (kanban can come later)
- Local storage plus JSON export

### v0.2: "Pip Evolves"
- Teen, Adult and Legend stages, the 5 pure forms plus Polymath
- Monthly quests, streak shields, follow-up reminders
- Stats/Journal screen with a radar chart and funnel
- Full achievement set and cosmetics

### v0.3: "Showcase Season"
- Showcase phase calendar and seasonal quests
- Hybrid evolution forms
- Sound, PWA install, notifications
- Kanban pipeline

### Future / stretch
- **Email integration** (Gmail/Outlook add-on or API) to detect sends and replies automatically
- **Committee mode:** each member has a Pip, with a shared "Committee Habitat" where the Pips hang out, plus team quests (no competitive leaderboard by default, to avoid discouraging people)
- Shareable evolution cards and end-of-season "Pip Yearbook" summary
- Template library of outreach emails, with an XP bonus for using and personalizing them

---

## 13. Success Metrics

Since the goal is to change behavior, we'll measure (locally, for the lead's own reflection):
- Outreach actions per week, compared with before using the game
- Follow-up rate (the share of unanswered threads that get followed up)
- Reply → commitment → conversion funnel rates
- Category balance over time
- Days active per week, and streak length

---

## 14. Open Questions for Review

1. **Categories:** are the 5 buckets right? Should *Judges* or *Speakers* be separate?
2. **Stat names:** Intellect / Craft / Heart / Voice / Fortune. Keep these, or would you prefer something like STR/INT/CHA?
3. **Creature identity:** is an envelope-blob "Pip" the right vibe, or would you rather have a different base creature (such as a small robot, a sprout or a critter tied to the showcase's branding)?
4. **Punishment level:** is "sleepy, never dies" right, or do you want a little more stakes?
5. **Solo vs. team:** is this only for you (the lead) at first, or should committee members join early?
6. **Showcase calendar:** what are the real phases and dates for this season, so we can seed the seasonal quests?
7. **XP balance:** should real outreach results outweigh quest XP more heavily (§10)?
8. **Tech preference:** any constraints on stack, hosting or where it has to run (e.g. a school or org network)?
9. **Art sourcing:** will we create original pixel art procedurally or by hand, or do you have an artist or asset pack in mind?
