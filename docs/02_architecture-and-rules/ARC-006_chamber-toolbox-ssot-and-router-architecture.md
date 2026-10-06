# ARC-006: 商會工具箱 SSOT 與 Router 架構提案

Status: Proposal
Date: 2026-09-30
Related: ARC-001 ~ ARC-005, REF-002, PLN-004, UIP-001

## 0. 一句話

把 `take-seat` 從「每週排座工具」升級為「商會工具箱」，並以**出席（Participation）為核心的單一資料源（SSOT）**，讓座位表、代理人簽到、長冠軍之星、禮物抽獎、綠燈會員都讀寫同一份資料；每個功能同時以 UI、REST、AI Tool 三種介面暴露，為之後的「Super 商會 AI」預留操作面。

---

## 1. 現況盤點（2026-09-30）

### 1.1 工具成熟度

| 工具 | 狀態 | 已有的東西 | 主要缺口 |
| --- | --- | --- | --- |
| 座位表 | 已上線、成熟 | `/seats` 索引、`/seats/[weekId]` 拖拉編輯、模板、列印/PDF、Excel | 每週座位仍靠 `src/lib/layout-MMDD.ts` + seed script（目前 19 份），需要工程師介入；看不到請假/代理 |
| 長冠軍之星投票 | 已上線 | `LivePoll*` models、每場活動一個 poll、投票碼、選項以 `memberId` 綁人 | 投票資格和「是否到場」無關；結果/歷史沒有進會員檔案 |
| 代理人簽到 | 部分上線 | `/pre-leave` 登記、`/admin/events/[weekId]` 出席覆寫、公開頁「抵達」按鈕 | **資料存在 `MeetingSession.metadata.attendanceOverrides` JSON，以姓名為 key，與座位表沒有真正連動**（詳見 §2） |
| 綠燈會員 | 未開發 | `attendance-range-report.ts` 已能算區間出席/代理次數 | 沒有指標模型、沒有 PALMS 匯入 |
| 活動禮物抽獎 | 未開發 | — | 需要以「已簽到名單」為抽獎池 |

### 1.2 路由盤點

| 類型 | 路由 | 備註 |
| --- | --- | --- |
| 頁面 | `/` | 泛用行銷頁（文案寫「婚宴、會議」），不是商會工具箱 |
| 頁面 | `/seats`, `/seats/[weekId]`, `/seats/print` | 排座；`/seats` 未驗證也能看到活動清單 |
| 頁面 | `/admin`, `/admin/events/[weekId]` | 管理後台、單場活動中控（有密碼 gate） |
| 頁面 | `/w/[slug]`, `/w/[slug]/vote` | 公開活動頁、投票；**QR code 已印出，網址必須永久可用** |
| 頁面 | `/pre-leave` | 請假/代理登記 |
| API | `/api/seats*`, `/api/seat-templates` | 排座 CRUD（有驗證） |
| API | `/api/admin/events/**` | 活動、投票、出席、匯出 |
| API | `/admin/api/events/**` | **與 `/api/admin/events/**` 完全重複**（只差 RouteContext 型別字串） |
| API | `/api/public/pre-leave` 與 `/api/public/events/[slug]/pre-leave` | **兩份幾乎相同的覆寫邏輯** |
| API | `/api/public/events/[slug]/{attendance,polls}` | 公開簽到與投票 |

---

## 2. 代理人 ↔ 座位表：斷點分析

使用者感受到的「代理人跟座位表沒有連動好」，根因是**同一個事實有四個來源、以姓名字串當 key、而且只在讀取時才臨時合併**。

### 2.1 「誰今天是代理」有四份真相

| # | 位置 | 形狀 | 誰寫 |
| --- | --- | --- | --- |
| A | `src/lib/layout-MMDD.ts` → `Roster.proxies` + `SeatData.role === '代理'` | 程式碼常數 | 工程師每週手改 |
| B | `SeatAssignment.kind = proxy` / `role = '代理'` | DB | 座位編輯器儲存、seed script |
| C | `MeetingSession.metadata.attendanceOverrides[姓名] = { status, proxyName }` | DB JSON | `/pre-leave`、公開頁、管理員出席編輯器 |
| D | `CHAPTER_MEMBER_DIRECTORY[].note = '代理'` | 程式碼常數 | 工程師 |

### 2.2 具體症狀

1. **登記頁的承諾沒有兌現**：`src/app/pre-leave/page.tsx` 成功畫面寫「當管理員建立座位表時，將會自動帶入此設定」，但建立/編輯座位表的流程完全沒讀 `attendanceOverrides`。實際上是工程師在 report 裡手動把人改成代理（見 report-0924 §5、§6）。
2. **編輯器看不到請假/代理**：`SeatingArranger` 只認 `role === '代理'`（來源 A/B）。管理員排座時不知道誰已請假。
3. **合併邏輯寫了兩次且不一致**：`src/application/events/mappers.ts:163` 和 `src/server/attendance/attendance-report.ts:55` 各自把覆寫套到座位上。報表還會為「沒座位但登記代理」的人產生虛擬列，公開頁不會。
4. **簽到狀態有兩套**：公開頁「抵達」寫 `SeatAssignment.status = checked_in`；覆寫寫 `metadata`。覆寫為 `proxy` 時會被**直接當成 checked_in**，代理人實際沒到也顯示已到。
5. **代理人沒有身份**：`proxyName` 是自由文字，無法統計「誰常來代理」、無法進抽獎池、無法轉成潛在會員（代理人本身常是好的邀賓名單）。
6. **姓名即主鍵**：覆寫、座位、`Member.displayName @unique` 都用姓名。改名、同名、英文名（例如 Eason吳）都會斷。會員名冊還同時存在靜態 `CHAPTER_MEMBER_DIRECTORY` 與 DB `Member`（`roles: []`）兩份。
7. **日期即活動**：`weekId` = 日期字串且唯一。登記到還沒建立的日期會產生 `__draft__` 空殼 session；09-24 發生的時區 bug 就是把登記寫到 `2026-09-23` 的空殼上。之後要做非週會活動（尾牙、參訪、抽獎）也放不進這個模型。

### 2.3 結論

修法不是再補一個同步腳本，而是**新增一個以 ID 為 key 的 `Participation`（活動 × 人）紀錄**，把「預計狀態（請假/代理）」和「實際簽到」都放在同一筆，座位、投票、抽獎、報表、綠燈分數全部讀它。

---

## 3. 其他技術債（建議在 migration 前先處理）

| 項目 | 位置 | 風險 |
| --- | --- | --- |
| 管理員密碼有寫死的 fallback | `src/server/admin/admin-access.ts:7` | 未設 `ADMIN_PASSWORD` 時任何人知道原始碼就能進後台 |
| Google 白名單為空時全放行 | `src/auth.ts:25` | 未設 env 時任何 Google 帳號都能登入 |
| `/seats` 清單頁未驗證 | `src/app/seats/page.tsx` | 活動清單與座位資訊外洩 |
| 公開簽到/請假無身份驗證 | `/api/public/events/[slug]/{attendance,pre-leave}` | 任何拿到連結的人可替任何人簽到或請假 |
| 重複的 admin API 樹 | `src/app/admin/api/**` 與 `src/app/api/admin/**` | 改一邊忘一邊；目前 `admin-poll-controls.tsx:41`、`admin-event-session-manager.tsx:51` 呼叫的是 `/admin/api`，其他元件呼叫 `/api/admin` |
| 未 commit 的修正 | pre-leave 時區、seating repository version | 已部署版本仍有 bug（report-0924 §6） |

---

## 4. 各工具研究與開發方向

### 4.1 代理人簽到 → 「出席與代理」模組（SSOT 核心）

流程：

```txt
會前：會員登記 請假 / 代理(指定代理人)          → Participation.intent
排座：編輯器自動標示、一鍵「套用請假與代理」      → SeatAssignment.participationId
當天：代理人掃 QR → 選「我代理誰」→ 簽到          → Participation.checkIn
會後：出席報表 / PALMS 匯出 / 綠燈分數            → 讀 Participation
```

狀態對齊 BNI PALMS 出席代碼（P 出席、A 缺席、L 遲到、M 醫療、S 代理），之後匯出到 BNI Connect 或算綠燈分數不用再轉換：

| PALMS | `Participation.status` | 說明 |
| --- | --- | --- |
| P | `present` | 已簽到 |
| L | `late` | 遲到簽到 |
| A | `absent` | 缺席（含請假無代理） |
| M | `medical` | 醫療假（管理員設定） |
| S | `substitute` | 有代理人出席 |

> PALMS 代碼與各代碼是否計入缺席的規則，請以分會 Director Consultant 與 BNI Connect 當期說明為準；本文只借用其分類。

### 4.2 座位表

- 座位資料改由 DB 驅動，`layout-MMDD.ts` 退為「匯入來源」，不再每週新增。
- 新增「從名冊 + 出席意向產生草稿」：主持團、音控、值日生、來賓/執事配對、代理人座位規則由 `seating-validation.ts` 延伸成產生器。
- 編輯器側欄顯示「本週請假 / 代理」清單，拖到座位即建立連結。
- 驗證規則新增：「已請假但仍排座」、「代理人未綁定會員」。

### 4.3 長冠軍之星 → 通用投票引擎

- `LivePoll` 保留，新增 `kind`（star / election / survey）。
- 資格可選 `checked_in_only`：簽到時發一次性投票憑證，一人一票，不再依賴共用投票碼。
- 候選人 = 當場已簽到的會員（代理人是否可被投、可否投票，需分會決定，見 §9）。
- 每次得獎寫入會員檔案（榮譽紀錄），之後綠燈分數或 AI 摘要可引用。

### 4.4 禮物抽獎（新）

- 模型：`Prize`（品名、數量、贊助會員）、`LotteryDraw`（活動、獎項、池子規則、seed、名單快照 hash）、`LotteryWinner`。
- 抽獎池 = 該活動 `Participation` 中已簽到者，可篩選會員 / 來賓 / 代理人，可排除已中獎者。
- 公平性：抽獎前固定名單快照與隨機 seed 並寫入紀錄，事後可重算驗證。
- 大螢幕：`/e/[eventKey]/lottery/stage` 全螢幕顯示。
- AI 可以「準備」抽獎，但「開抽」一律要人按。

### 4.5 綠燈會員（新）

BNI 的紅綠燈報告以近 6 個月的會員行為計分（出席、引薦、來賓、1-2-1、培訓 CEU、推薦見證等），依分數區分綠 / 黃 / 紅 / 灰。確切權重與門檻會隨地區與年度版本變動，**上線前需向分會取得目前使用的計分表**。

建議分兩段：

1. **系統自有資料先算**：出席、缺席、代理、遲到（已有）。
2. **匯入補齊**：從 BNI Connect 匯出的 PALMS CSV 匯入引薦、來賓、1-2-1、CEU。之後若系統內也做 1-2-1 與引薦紀錄，就改為系統產生。

模型：`ScorecardSnapshot`（會員、期間、各指標原始值、分數、燈號、計分規則版本）。規則版本化，換規則時舊分數不會被改寫。

### 4.6 之後的模組（先保留位置）

- 會員檔案：產業、服務、目標客戶、年度職務、榮譽、出席、燈號。
- 人脈與產業鏈：沿用 `industry-chains.ts` 的 A/B/C/D 分組，升級為 `IndustryChain` + `Relationship` 圖。
- 1-2-1 持續追蹤：`OneToOne`（兩位會員、日期、摘要、下一步、提醒）。
- 引薦：`Referral`（給誰、內外部、狀態、成交金額 TYFCB）。

---

## 5. 目標資料模型（SSOT）

```txt
Organization ──< Membership >── Person
     │                              │
     └──< Event ──< Participation >─┘      ← SSOT：活動 × 人
             │          │
             │          ├── SeatAssignment (participationId)
             │          ├── PollBallot / PollCandidate
             │          └── LotteryEntry / LotteryWinner
             ├──< SeatMap ──< Seat
             ├──< Poll
             └──< LotteryDraw

Membership ──< ScorecardSnapshot
Person ──< Relationship / OneToOne / Referral >── Person
ActivityLog（actorType: human | ai | system）記錄一切寫入
```

關鍵設計：

- **Person 與 Membership 分開**：來賓、代理人、講者都是 Person；只有會員有 Membership。代理人第一次出現就建立 Person，之後能追蹤、能邀請入會。
- **Event 取代 MeetingSession 的「日期即活動」**：`eventKey` 唯一（週會沿用 `2026-09-24`，其他活動用 `2026-12-18-year-end`），`type`: `weekly_meeting | activity | training | social`。
- **所有表加 `orgId`**：網址先不放組織，但資料從第一天就能多分會。
- **ActivityLog 升級自 OperationLog**：加 `actorType`、`agentRunId`、`approvedBy`，AI 做的每件事都可追溯、可回滾。

`Participation` 草案（Prisma / MongoDB）：

```prisma
enum ParticipationRole { member guest substitute visitor_host staff speaker }
enum ParticipationStatus { expected present late absent medical substitute canceled }

model Participation {
  id              String              @id @default(auto()) @map("_id") @db.ObjectId
  orgId           String              @db.ObjectId
  eventId         String              @db.ObjectId
  personId        String              @db.ObjectId
  membershipId    String?             @db.ObjectId   // 會員才有
  role            ParticipationRole
  status          ParticipationStatus @default(expected)
  representsId    String?             @db.ObjectId   // 代理人 → 被代理會員的 Participation
  intentSource    String?             // pre_leave_form | admin | ai | import
  intentAt        DateTime?
  checkedInAt     DateTime?
  checkInMethod   String?             // qr | staff | self | ai
  guestNumber     String?             // 賓1
  hostPersonId    String?             @db.ObjectId   // 執事
  metadata        Json?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@unique([eventId, personId])
  @@index([eventId, status])
  @@index([membershipId])
  @@index([representsId])
}
```

---

## 6. 分層：一份能力，三種介面

```txt
src/modules/<module>/
  domain/          型別、規則、純函式（無 IO）
  application/     commands / queries（zod 輸入輸出、權限、風險等級）
  infrastructure/  Prisma repository、R2、外部匯入
  ui/              該模組的 React 元件

src/capabilities/registry.ts   彙整所有 commands/queries 的清單
```

每個 command 都宣告：

```ts
defineCommand({
  name: 'attendance.registerSubstitute',
  description: '為會員登記代理人',
  input: z.object({ eventKey: z.string(), memberId: z.string(), substituteName: z.string() }),
  permission: 'member:self | staff',
  risk: 'write',            // read | write | irreversible
  handler: async (input, ctx) => { ... },
});
```

同一份 registry 同時產生：

| 介面 | 用途 |
| --- | --- |
| Server Actions / Route Handlers | 網頁 UI |
| `/api/v1/**` | 外部整合、LINE bot、排程 |
| `/api/mcp`（MCP server） | Super 商會 AI 與其他 agent |

AI 規則：`read` 直接執行；`write` 產生「變更預覽」讓人確認；`irreversible`（抽獎開抽、發送通知、刪除）一定要人按。

---

## 7. Router 提案

> 最新的路由樹、頁面 ID 與頁面任務清單見 `docs/05_execution-plans/PLN-005_router-v2-and-page-task-plan.md`。以下為第一版，保留作為設計理由的紀錄。

用 route group 依「受眾」切分，URL 用「工具」命名，活動用 `eventKey`。

```txt
src/app/
├─ (public)/                         無需登入，只吃 Public DTO
│  ├─ e/[eventKey]/                  活動公開頁（取代 /w/[slug]）
│  │  ├─ page.tsx                    座位圖 + 出席統計
│  │  ├─ check-in/page.tsx           QR 簽到（會員 / 代理人 / 來賓）
│  │  ├─ vote/page.tsx               長冠軍之星
│  │  └─ lottery/stage/page.tsx      抽獎大螢幕
│  └─ leave/page.tsx                 請假/代理登記（取代 /pre-leave）
│
├─ (member)/me/                      會員登入後
│  ├─ page.tsx                       我的下一場活動、我的座位
│  ├─ attendance/page.tsx            我的出席與燈號
│  └─ profile/page.tsx               我的商務檔案
│
├─ (console)/console/                幹部/管理員，layout 內含 AI Copilot 面板
│  ├─ page.tsx                       工具箱首頁：今日活動 + 待辦 + AI 建議
│  ├─ events/
│  │  ├─ page.tsx                    活動清單（取代 /seats 索引）
│  │  ├─ new/page.tsx                建立活動（週會/活動/培訓）
│  │  └─ [eventKey]/
│  │     ├─ layout.tsx               活動標頭 + 工具分頁
│  │     ├─ page.tsx                 活動中控總覽
│  │     ├─ attendance/page.tsx      出席與代理
│  │     ├─ seating/page.tsx         座位表編輯（取代 /seats/[weekId]）
│  │     ├─ seating/print/page.tsx   列印（取代 /seats/print，綁定 eventKey）
│  │     ├─ polls/page.tsx           長冠軍之星
│  │     ├─ lottery/page.tsx         禮物抽獎
│  │     └─ exports/page.tsx         匯出
│  ├─ members/
│  │  ├─ page.tsx                    會員名冊（SSOT）
│  │  └─ [memberId]/page.tsx         會員檔案
│  ├─ scorecard/page.tsx             綠燈會員
│  ├─ network/page.tsx               人脈與產業鏈（規劃）
│  ├─ one-to-ones/page.tsx           1-2-1 追蹤（規劃）
│  ├─ templates/page.tsx             座位模板
│  ├─ ai/page.tsx                    AI 工作區：對話、建議佇列、執行紀錄
│  └─ settings/{access,audit}/page.tsx
│
└─ api/
   ├─ v1/                            需驗證，resource 導向，與 AI 共用
   │  ├─ events/[eventKey]/{participations,seating,polls,lottery,exports}
   │  ├─ members/, scorecards/, templates/
   │  └─ capabilities/               列出所有能力（給 AI / 文件）
   ├─ public/v1/events/[eventKey]/   公開 DTO、簽到、投票
   ├─ mcp/route.ts                   MCP server
   ├─ auth/[...nextauth]/
   └─ health/
```

設計理由：

- **受眾切分對應 AGENTS.md 的四層隱私規則**（public / member / staff / admin），每個 group 的 layout 只能拿到該層 DTO。
- **活動是第一層容器**：所有「單場」工具都在 `/console/events/[eventKey]/*` 下，符合 ARC-005「營運操作屬於單一活動」的結論，也讓 AI 的上下文天然是「目前這場活動」。
- **跨活動工具放 console 根層**：會員、綠燈、人脈、1-2-1 是長期資料，不屬於任何一場。
- **`/console` 而不是 `/admin`**：會員之後也會有 `/me`，幹部不一定是管理員；`/admin` 可保留為 redirect。
- **驗證放在 layout + data access layer**，`proxy.ts`（Next 16 由 middleware 更名）只做樂觀的 cookie 轉址，依 Next 官方 data-security 建議不把它當唯一防線。

### 7.1 權限矩陣

| 區域 | 公開 | 會員 | 幹部 | 管理員 | AI（代表某人） |
| --- | --- | --- | --- | --- | --- |
| `/e/*` | 匿名統計 | 自己的座位 | — | — | 讀 |
| `/leave` | 需身份確認 | 自己 | 代他人 | 代他人 | 預覽後送出 |
| `/me/*` | — | 自己 | 自己 | 自己 | 以該會員身份讀 |
| `/console/events/*` | — | — | 讀寫 | 讀寫 | 讀；寫需確認 |
| `/console/members/*` | — | — | 讀 | 讀寫 | 讀；寫需確認 |
| 抽獎開抽、發通知、刪除 | — | — | 需確認 | 需確認 | 不可自行執行 |

---

## 8. Super 商會 AI 的預留位置

介面：

- `(console)` layout 右側常駐 **Copilot 面板**，自動帶入目前頁面的上下文（哪場活動、哪位會員）。
- `/console/ai` 工作區：對話、**建議佇列**（AI 主動提出、人審核）、執行紀錄。
- 每個頁面都可以有「AI 建議」卡片，按下只會產生預覽，不直接改資料。

能力（依序開放）：

1. 活動營運：整理請假/代理 → 產生座位草稿 → 提醒尚未簽到者。
2. 會員經營：燈號轉黃/紅時提醒、建議 1-2-1 配對。
3. 人脈與產業鏈：依會員檔案與引薦紀錄找缺口產業、建議邀賓方向。
4. 1-2-1 持續追蹤：會後摘要、下一步、到期提醒。

護欄：

- AI 只透過 capability registry 操作，不直接連 DB。
- AI 帶著「代表誰」的身份執行，權限等同該使用者。
- 所有 AI 寫入進 ActivityLog，附 `agentRunId`，可一鍵回滾。
- 公開 DTO 規則對 AI 一樣適用：面對會員的 AI 不會拿到其他會員的私人資料。

---

## 9. 需要分會決定的事

1. 代理人能不能投長冠軍之星？能不能被投？能不能參加抽獎？
2. 會員身份驗證：沿用 Google、改用 LINE Login，或手機一次性碼？（影響公開簽到/請假的防冒用）
3. 綠燈計分表：取得分會目前使用的版本與門檻。
4. 後台網址用 `/console` 還是維持 `/admin`。
5. 是否預計支援其他分會（影響 `orgId` 是否要進網址）。
