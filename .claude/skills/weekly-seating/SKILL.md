---
name: weekly-seating
description: Build and publish the weekly BNI 長冠軍分會 seat map end to end — layout file, production seat map, guests, proxies, duties, carried-over 長冠軍 gifts, public event page and the public 長冠軍之星 poll — then hand back the links. Use whenever the user asks for 明日座位圖／這週座位表／排座位, pastes a 人才接龍 list, or names this week's guests, 新夥伴, 代理, 值日生／聲控／攝影, 代理主席 or 英雄榜.
---

# Weekly seating

One run produces one event date (`weekId` = meeting date, `YYYY-MM-DD`). The user
usually pastes the 人才接龍 text and says "完成後給我連結".

`.env` `DATABASE_URL` is **production**. The user's request for this week's
seat map approves the writes listed in step 4 for that one date. Anything
beyond them (other dates, deleting data, changing a member who is not named)
needs a separate yes. Every helper script below is a dry run unless `--write`
is passed: run the dry run, read it, then write.

Run all scripts from the project root:
`node .claude/skills/weekly-seating/scripts/<name>.mjs ...`

## 1. Collect the inputs

From the user's message (ask only for what is missing and cannot be defaulted):

- Guests: name, industry, referrer (引薦人), 執事 (host). Number them 賓1, 賓2, ...
- 新夥伴 (new member) and who they sit next to.
- 代理: the website registrations, plus anyone the user names.
- 值日生, 聲控 (音控), 攝影.
- 代理主席 / 代理副主席 or other head-table changes.
- 英雄榜 chains, e.g. 冠霖👉廷軒👉育群 and 柏瀚👉黃杰👉子晏.

Nicknames: match a short name (子晏, 振綱, 志誠) to the full display name in the
roster. If two members could match, ask.

## 2. Read the current state (read only)

- `git fetch` and fast-forward `main` if it is behind; production runs `origin/main`.
- Previous week's `src/lib/layout-MMDD.ts` (newest one) — base for member order.
- Roster: `Member` where `category: 'member', isActive: true`.
- This week's `MeetingSession` and `Participation` rows: website 代理 are
  `status: 'substitute'` with `substituteName`; leave (請假) rows too.
- Whether the week already has a seat map, gifts, a published slug, a star poll.

## 3. Write `src/lib/layout-MMDD.ts`

Copy the previous week's file and edit. Export `ROSTER_MMDD` and `LAYOUT_MMDD`.
Header comment: date, head team, duties, guests with industry/referrer/執事,
new members, proxies, heroes. Grid is usually 9 rows x 4, no empty seats.

Room geometry (see `scripts/grid-to-floor-plan.mjs`): grid column c is bench
排 c+1, grid row r is seat r+1 along it, row 0 at the front. 一排/二排 face each
other across 長桌 A, 三排/四排 across 長桌 B. **"Next to" someone means the same
column, adjacent row** (same bench). Same row, neighbouring column is across
the table, not beside.

Placement rules:

- Head table `topRoles` (5): 活動協調, 財務秘書, 主席, 副主席, 教育協調. Acting
  roles keep the role name; note "代理主席" in the header comment.
- Guests in the front rows, `isGuest`, `guestNumber: '賓N'`.
- Each guest's 執事 directly behind (row + 1, same column), `isHost`, `hostFor: '賓N'`.
- The referrer sits beside their guests.
- 值日生 `isDuty` and 聲控 `isSound` at the front of column 3.
- **攝影 `isPhoto`: middle aisle, towards the back** — column 1 (二排) or 2 (三排),
  back half of the rows, ahead of the proxy row.
- New members directly behind their mentors (陳軾 behind 王柏詠, 陳平 behind 蘇冠霖).
- Mina 陳宜均 directly behind 聲控.
- 新夥伴 next to whoever the user named (same bench).
- 代理 in the last row(s), `role: '代理'`.
- Everyone else keeps last week's relative order.
- `heroes`: chains flattened in order into one list.

Then retarget the current week:

- `src/lib/seating-week.ts`: import `LAYOUT_MMDD` / `ROSTER_MMDD`, set the week.
- `scripts/seed-current-layout.mjs`: the `loadTsModule('src/lib/layout-MMDD.ts')`
  line, `weekId`, `date`, `title` (`115/MM/DD 座位表`, ROC year = year − 1911),
  and `importedFrom`.

## 4. Production writes, in this order

1. New member, if any: `promote-member.mjs --week=... --name=... --industry=...`
2. Seat map: `node scripts/seed-current-layout.mjs --dry-run`, then `--write`
   (creates the session if missing, replaces older seed seat maps, bumps the version).
3. Guests: write `guests.json` in the scratchpad, `add-guests.mjs --week=... --file=...`
4. Extra 代理 named by the user (not website registrations):
   `set-substitute.mjs --week=... --name=... --proxy=<proxy's name or omit>`.
   Re-run step 2 if the layout changed because of this.
5. Duties and floor plan: `node scripts/grid-to-floor-plan.mjs --week=... --dry-run`,
   then `--write --replace`. Expect 0 unmatched.
6. Gifts: `copy-gifts.mjs --from=<last week> --to=<this week>`, then `--write`.
   Report `flaggedNotes` (e.g. 晶礦手串 9/3抽) to the user; do not drop them.
7. Publish: `publish-event.mjs --week=...`, then `--write`.
8. 長冠軍之星 poll: `open-star-poll.mjs --week=...`, then `--write`. Public (no
   vote code), open now, results after closed, all active members as candidates.

## 5. Check

- `check-layout.mjs --week=...` must pass (members once, no unknown names, 執事
  behind guests, 代理 = substitutes, 攝影 on the aisle). Fix and re-seed on errors;
  explain any warning you leave.
- `npx eslint <changed files>`, `npx tsc --noEmit`, `git diff --check`.
  Skip `pnpm build` when disk is under 5 GB free (`df -h .`); say so.
- `curl` production (https://bni-champion-chapter-tw.yzedtech.com): `/e/<slug>`,
  `/e/<weekId>`, `/e/<weekId>/vote`, `/e/<weekId>/lottery` return 200 and the
  event page contains the guests, duties and proxy names.

## 6. Report and hand back

- Write `docs/2_agent-input/generated/agent-loop/reports/report-MMDD.md` (copy the
  previous report's sections: result, changed files, validation, production
  writes, open points). No secrets, tokens or emails.
- Give the user (in Chinese):
  - 公開座位頁 `https://bni-champion-chapter-tw.yzedtech.com/e/<slug>`
  - 投票頁 `/e/<weekId>/vote`
  - 抽獎頁 `/e/<weekId>/lottery` (big screen signs in with any Google account; the
    winner is preselected from the 長冠軍之星 first place, only the gift spins)
  - 後台 `/console/events/<weekId>`, 禮物 `/console/events/<weekId>/gifts`
  - Open points: placeholder proxy names, flagged gifts, anything not verified.
- Do not commit or push until the user says so. Commit message style:
  `chore(seating): MM-DD layout with ...`. Leave unrelated uncommitted files alone.
