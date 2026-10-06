# PLN-004: 商會工具箱 Router Migration 計畫

Status: Proposal
Date: 2026-09-30
Depends on: ARC-006

## 1. 原則

1. **先修資料，再搬路由**。代理人/座位不連動是資料問題，先建立 `Participation` SSOT；路由搬家只是換位置。
2. **Strangler 模式**：新舊路由並存，新頁面先掛現有元件，確認後舊網址 308 轉址，不做一次性大改。
3. **印出去的網址永遠有效**：`/w/[slug]`、`/w/[slug]/vote`、`/pre-leave` 已在 QR code 與群組訊息中，永久保留轉址。
4. **避開例會**：每週四例會。部署窗口為週五到週二，週三、週四凍結（只修緊急 bug）。
5. **每個批次可獨立上線、可回滾**，並依 AGENTS.md 留下 evidence report。
6. **正式資料庫寫入需使用者明確同意**（沿用 AGENTS.md 規則）；所有 backfill 先跑 `--dry-run`。

每批次的共同驗證：

```bash
pnpm run prisma:validate
pnpm run lint
pnpm run build
git diff --check
```

---

## 2. 批次總覽

| 批次 | 名稱 | 目的 | 使用者可見變化 | 預估 |
| --- | --- | --- | --- | --- |
| MIG-000 | 清理與安全 | 先把地基補好 | 無 | 0.5 週 |
| MIG-001 | 會員名冊 SSOT | 靜態名冊 → DB `Member`/`Person` | 無 | 0.5 週 |
| MIG-002 | 出席與代理 SSOT | 新增 `Participation`，取代 `attendanceOverrides` | 出席資料一致 | 1 週 |
| MIG-003 | 座位 ↔ 代理連動 | 編輯器看得到請假/代理，一鍵套用 | 排座不用再請工程師 | 1 週 |
| MIG-004 | Console 外殼 | `/console` + 工具箱首頁，掛既有元件 | 新入口 | 1 週 |
| MIG-005 | 路由切換 | 舊網址 308 轉址、API alias | 網址改變 | 0.5 週 |
| MIG-006 | API v1 + Capability registry | 為 AI 準備統一操作面 | 無 | 1 週 |
| MIG-007 | Event 泛化 + 禮物抽獎 | 非週會活動、抽獎 | 新工具 | 1.5 週 |
| MIG-008 | 綠燈會員 | 計分快照 + PALMS 匯入 | 新工具 | 1.5 週 |
| MIG-009 | Super 商會 AI v0 | Copilot 面板 + MCP | AI 助理 | 2 週 |

MIG-000 ~ MIG-003 解決目前的痛點，可以先做；MIG-004 起才是路由搬家。

---

## 3. 批次細節

### MIG-000 清理與安全

- [ ] Commit 目前未提交的修正（pre-leave 時區、seating repository version、layout-0903/0917/0924）。
- [ ] 移除 `admin-access.ts` 的寫死 fallback 密碼；未設 `ADMIN_PASSWORD` 時拒絕登入。
- [ ] `auth.ts`：白名單為空時預設拒絕（保留 owner email）。
- [ ] `/seats` 索引頁加上與 `/admin` 相同的權限 gate。
- [ ] 把 `admin-poll-controls.tsx:41`、`admin-event-session-manager.tsx:51` 改呼叫 `/api/admin/**`，再刪除 `src/app/admin/api/**`。
- [ ] 兩支 pre-leave API 抽成同一個 `registerAttendanceIntent()` service。

回滾：純程式變更，revert commit。

### MIG-001 會員名冊 SSOT

- [ ] Schema：新增 `Person`；`Member` 加 `personId`、`status`、`adminGroup`、`roles`、`industry`、`joinedAt`（或新增 `Membership`，二擇一，建議 `Membership`）。所有新表加 `orgId`。
- [ ] Script `scripts/import-members.mjs --dry-run|--write`：把 `CHAPTER_MEMBER_DIRECTORY` 寫入 DB，以姓名比對既有 `Member`，比對不到的列出人工確認。
- [ ] Backfill `SeatAssignment.memberId`（目前靠 upsert 姓名建立，roles 為空）。
- [ ] `/pre-leave`、出席報表改讀 DB 名冊；`chapter-members.ts` 保留為 seed 來源並標註 deprecated。

驗收：DB 會員數 = 38（依 report-0924），每位都有 `personId`。

### MIG-002 出席與代理 SSOT（最重要）

- [ ] Schema：新增 `Participation`（見 ARC-006 §5）。
- [ ] Service：`src/modules/attendance/application/`
  - `registerIntent`（請假 / 代理 / 取消）
  - `checkIn` / `undoCheckIn`
  - `setStatusByStaff`
  - `getEventAttendance`（唯一的合併邏輯）
- [ ] **Backfill script**（`--dry-run` 先行）：
  1. 對每個 `MeetingSession` 的 `metadata.attendanceOverrides` → 建立/更新 `Participation`。
  2. 對每個 `SeatAssignment.status = checked_in` → `Participation.status = present`、`checkedInAt = updatedAt`。
  3. 對每個 `role = '代理'` 的座位 → 建立被代理會員的 `substitute` 紀錄；代理人姓名不明時標記 `metadata.needsReview`。
  4. 找出 `publicSlug` 以 `__draft__` 開頭、只有覆寫沒有座位的空殼 session，列出給人工合併（例：2026-09-23 → 2026-09-24）。
- [ ] **雙寫期（1~2 週）**：所有寫入同時寫 `Participation` 與舊 `metadata`；讀取改讀 `Participation`。
- [ ] 把 `mappers.ts:163` 與 `attendance-report.ts:55` 的合併邏輯改為呼叫 `getEventAttendance`。
- [ ] 簽到語意修正：代理登記 ≠ 已簽到；代理人需自己簽到才算到場。
- [ ] 停止寫 `metadata.attendanceOverrides`（保留欄位做歷史）。

驗收（寫入 ACC-004）：

- 同一位會員在公開頁、管理頁、Excel 報表的狀態一致。
- 登記代理後、代理人尚未簽到時，顯示「代理・未到」。
- 近 8 週的出席區間報表，backfill 前後數字相同（除已知 bug 修正）。

回滾：讀取切回舊 mapper（feature flag `ATTENDANCE_SOURCE=legacy|participation`），雙寫期內資料不會遺失。

### MIG-003 座位 ↔ 代理連動

- [ ] 座位編輯器側欄新增「本週請假 / 代理」清單（讀 `Participation`）。
- [ ] 新增「套用請假與代理」：產生變更預覽（誰從哪個座位移出、代理人坐哪），確認後寫入。
- [ ] `SeatAssignment` 加 `participationId`；存檔時建立連結。
- [ ] 驗證規則：已請假仍排座、代理人未綁會員、代理人座位未依規則（例：坐被代理者旁）。
- [ ] 「從名冊 + 意向產生座位草稿」：以上週座位或模板為底，自動處理請假/代理/來賓配對。完成後 `layout-MMDD.ts` 不再新增。
- [ ] 列印頁綁 `eventKey`（順便完成 SEAT-IA-006）。

驗收：以 09-24 的實際狀況（3 位代理、6 位來賓）重演，全程不需修改程式碼。

### MIG-004 Console 外殼

- [ ] 建立 route groups：`(public)`、`(member)`、`(console)`；搬移根 `layout.tsx` 的共用 provider。
- [ ] `(console)/console/layout.tsx`：左側工具箱導覽、活動切換器、右側 Copilot 面板佔位（先不接 AI）。
- [ ] 新頁面**直接掛既有元件**，先不重寫：

| 新頁面 | 掛載的既有元件/邏輯 |
| --- | --- |
| `/console/events` | `src/app/seats/page.tsx` 的清單 + `SeatMapCreatePanel` |
| `/console/events/[eventKey]` | `admin/events/[weekId]/page.tsx` 的總覽區塊 |
| `/console/events/[eventKey]/seating` | `SeatingArranger` |
| `/console/events/[eventKey]/attendance` | `AdminAttendanceEditor` → 改讀 `Participation` |
| `/console/events/[eventKey]/polls` | `AdminPollControls` |
| `/console/events/[eventKey]/exports` | Excel / PDF / 區間匯出元件 |
| `/console/templates` | `SeatTemplateSavePanel` 清單 |

- [ ] 根 `/` 改為工具箱入口：依登入狀態導向 `/console` 或 `/me`，未登入顯示公開入口（請假登記、最近活動）。

驗收：新舊路由同時可用、功能相同。

### MIG-005 路由切換

在 `next.config.ts` 的 `redirects()` 設定（靜態映射不需要 `proxy.ts`）：

| 舊路由 | 新路由 | 類型 | 保留期限 |
| --- | --- | --- | --- |
| `/w/:slug` | `/e/:eventKey` | 308 | **永久**（QR code） |
| `/w/:slug/vote` | `/e/:eventKey/vote` | 308 | **永久** |
| `/pre-leave` | `/leave` | 308 | **永久** |
| `/seats` | `/console/events` | 308 | 6 個月 |
| `/seats/:weekId` | `/console/events/:weekId/seating` | 308 | 6 個月 |
| `/seats/print` | `/console/events` | 307 | 3 個月（舊版靠 localStorage 狀態，無法對應） |
| `/admin` | `/console` | 308 | 6 個月 |
| `/admin/events/:weekId` | `/console/events/:weekId` | 308 | 6 個月 |

- `slug` → `eventKey`：目前 slug 為 `2026-09-24-9f3932`。做法：`Event` 保留 `legacySlug` 欄位，`/e/[eventKey]` 找不到時再以 `legacySlug` 查一次後轉到正式網址。這樣 `redirects()` 可直接 `/w/:slug → /e/:slug`，不需要查 DB。
- 週會 `eventKey` 沿用 `weekId`（`2026-09-24`），所以 `/seats/:weekId` 可直接映射。
- API：舊端點保留為薄 alias，內部呼叫同一個 service，並寫一筆 `legacy_api_hit` log；連續 4 週零呼叫後刪除。

驗收：舊網址清單全部自動化檢查一次（curl 看 308 與 Location）。

回滾：移除 `redirects()` 設定即可，舊頁面在此批次仍保留檔案；確認穩定 2 週後才刪舊頁面檔案。

### MIG-006 API v1 + Capability registry

- [ ] `src/capabilities/registry.ts`：`defineQuery` / `defineCommand`，含 zod schema、permission、risk。
- [ ] 先註冊：`events.list`、`events.get`、`attendance.get`、`attendance.registerIntent`、`attendance.checkIn`、`seating.get`、`seating.applyIntents`（preview + commit）、`polls.results`。
- [ ] `/api/v1/**` 由 registry 產生 handler；`GET /api/v1/capabilities` 輸出清單。
- [ ] `OperationLog` → `ActivityLog`：加 `actorType`、`agentRunId`、`approvedBy`、`before/after`。

### MIG-007 Event 泛化 + 禮物抽獎

- [ ] `MeetingSession` 以 `@@map` 延續同一個 collection，改名為 `Event`，加 `type`、`eventKey`、`legacySlug`。
- [ ] 移除「一日一活動」限制（`weekId @unique` → `eventKey @unique`）。
- [ ] 抽獎：`Prize`、`LotteryDraw`、`LotteryWinner`；console 設定頁與 `/e/[eventKey]/lottery/stage` 大螢幕。
- [ ] 抽獎紀錄保存 seed 與名單快照 hash。

### MIG-008 綠燈會員

- [ ] 向分會取得目前計分表 → 寫成 `ScoringRule` v1。
- [ ] `ScorecardSnapshot`；每週例會結束後產生快照。
- [ ] PALMS CSV 匯入（引薦、來賓、1-2-1、CEU）。
- [ ] `/console/scorecard` 與會員檔案的燈號區塊；`/me/attendance` 顯示自己的燈號。

### MIG-009 Super 商會 AI v0

- [ ] `/api/mcp`：把 registry 暴露為 MCP tools。
- [ ] Console Copilot 面板：帶入頁面上下文、顯示每次 tool call、write 類操作顯示預覽再確認。
- [ ] 第一個情境：「整理本週請假/代理並產生座位草稿」。
- [ ] 第二個情境：「列出本週未簽到會員」「燈號轉黃的會員與建議」。

---

## 4. 風險

| 風險 | 對策 |
| --- | --- |
| Backfill 把歷史出席算錯 | dry-run 輸出對照表；以近 8 週 Excel 報表做前後比對 |
| 例會當天路由切換出錯 | 週三、週四凍結；切換在週五 |
| 會員掃到舊 QR code | 舊公開網址永久轉址 |
| MongoDB 無交易保證的多文件寫入 | 雙寫期以 `Participation` 為主，`metadata` 失敗只記 log |
| 一次改太多無法定位問題 | 每批次獨立 PR 與 report |

## 5. 下一步

1. 使用者確認 ARC-006 §9 的五個決策。
2. 開 MIG-000 分支，同時撰寫 `ACC-004_participation-ssot-acceptance.md`。
3. 以 UIP-001 介面提案確認 console 外殼的導覽與頁面分區。
