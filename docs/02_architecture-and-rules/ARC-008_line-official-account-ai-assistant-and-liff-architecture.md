# ARC-008: 長冠軍同行者、LINE 官方帳號與 LIFF 架構

Status: Draft
Date: 2026-11-18
Related: PRD-003、PLN-007、ACC-006、ARC-002、ACC-005

## 1. 總覽

```txt
                ┌──────────── LINE ────────────┐
                │ 一對一聊天   群組   LIFF 網頁  │
                └─────┬─────────┬────────┬──────┘
             webhook  │         │        │ 一般 HTTPS（同一個 Next.js 網站）
                      ▼         ▼        ▼
         /api/line/webhook            /e/... /me /console ...
                      │                      │
            ┌─────────┴──────────┐   LIFF 自動登入 → Auth.js（provider: liff → line）
            │ 事件分派             │
            │  ├ 快速指令（不用模型）│
            │  ├ AI 對話           │──┐
            │  └ 群組記錄（R6）     │  │
            └─────────┬──────────┘  │
                      │             ▼
                      │      Agent 核心（src/server/agent/*）
                      │       ├ 模型 adapter：Claude / OpenAI
                      │       └ 工具（依身分分級）→ 現有 services
                      ▼
       MongoDB（Prisma）              Cloudflare R2（附件）
```

網站入口 `/console/agent` 和 LINE 入口共用同一個 Agent 核心，只差在「誰在呼叫」和「能用哪些工具」。

## 2. LINE 端設定（都在 LINE Developers 的 Provider「BNI 長冠軍分會」）

| 項目 | 用途 | 備註 |
| --- | --- | --- |
| LINE Login channel（新建，`AUTH_LINE_ID`） | 網站 LINE 登入；底下建 LIFF app | LIFF app 只能建在 LINE Login channel 底下 |
| LIFF app | 網站在 LINE 裡打開的入口 | Endpoint URL 填正式網站根網址；scope 要有 `openid`、`profile`；開啟 shareTargetPicker |
| Messaging API channel（官方帳號「長冠軍同行者」） | webhook、回覆、推播、圖文選單 | Webhook URL：`https://<網域>/api/line/webhook`；關閉 OA 後台的自動回應訊息，避免跟網站回覆打架 |

**同一個 Provider 是硬性條件。** LINE 的 userId 是「每個 Provider 一個」，只有同一個 Provider 底下，Login、LIFF、Messaging API 拿到的 userId 才相同，現有的 `MemberIdentity(provider: 'line', subject)` 才能直接用。不同 Provider 時要重新綁定，所以要先確認（PRD-003 Q1）。

## 3. 環境變數（新增）

| 變數 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_LIFF_ID` | LIFF app id，前端初始化用（公開值） |
| `LINE_MESSAGING_CHANNEL_SECRET` | 驗證 webhook 簽章 |
| `LINE_MESSAGING_ACCESS_TOKEN` | 呼叫 Messaging API（回覆、推播、下載附件、圖文選單） |
| `AGENT_PROVIDER` | `anthropic` 或 `openai` |
| `AGENT_MODEL` | 模型 id；沒設時用 adapter 的預設值 |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | 模型金鑰，只在伺服器讀取 |
| `AGENT_DAILY_LIMIT_PER_USER` | 每人每天 AI 對話上限，預設 30 |

沿用：`AUTH_LINE_ID`、`AUTH_LINE_SECRET`、`ADMIN_PASSWORD`、`R2_*`。

所有金鑰都只在 `server-only` 模組讀取，不進 Client Component，也不寫進文件、報告或截圖。

## 4. LIFF 與登入

### 4.1 前端

- 新增一個 Client Component `LiffBoot`，放在根 layout。不在 LINE 裡（`liff.isInClient()` 為 false）時什麼都不做。
- 在 LINE 裡：`liff.init({ liffId })` → 如果目前沒有網站 session，取 `liff.getIDToken()`，呼叫 `signIn('liff', { idToken, redirect: false })`，成功後 `router.refresh()`。
- `@line/liff` 只在 client 端動態載入，不影響一般瀏覽器的頁面大小。
- LIFF 網址帶路徑的方式：`https://liff.line.me/{LIFF_ID}/e/2026-11-19/check-in` 會打開 `<Endpoint>/e/2026-11-19/check-in`。圖文選單和聊天回覆都用這種網址。
- 「今日」類的連結用一個固定路徑，例如 `/today`、`/today/check-in`，由伺服器轉到當天的活動（用 `getFocusEvent`）。這樣圖文選單不用每週改。

### 4.2 伺服器

- `src/auth.ts` 加一個 Credentials provider，id 是 `liff`：
  1. 收到 `idToken`，呼叫 LINE 的 ID token 驗證端點，`client_id` 用 `AUTH_LINE_ID`。
  2. 驗證失敗、`aud` 不符或過期，就拒絕。
  3. 成功時回傳 `{ id: sub, name }`。
- `jwt` callback 把 `liff` 正規化成 `line`：`token.provider = 'line'`、`token.providerAccountId = sub`。之後 `/me`、綁定流程、`getLeaderAccess()` 完全沿用 LINE Login 的路徑，不另外寫一套。
- 驗證過的 ID token 不存起來，也不寫進 log。

### 4.3 領導團隊在 LINE 裡

- Google OAuth 會在 LINE 內建瀏覽器被 Google 擋下（`disallowed_useragent`），所以在 LINE 裡隱藏 Google 按鈕，改顯示說明。
- `/console` 的閘門在 LINE 裡顯示現有的**共用密碼**輸入框（`src/server/admin/admin-access.ts`，cookie 12 小時，改密碼會讓所有裝置登出）。
- 已綁定 LINE、有現任幹部任期的人，經過 4.2 之後本來就是領導團隊，不用輸入密碼。
- 權限判斷一律走 `getLeaderAccess()` / `requireLeader()`，不新增旁路。

## 5. Webhook

### 5.1 路由

`src/app/api/line/webhook/route.ts`，`POST`，`runtime = 'nodejs'`，`dynamic = 'force-dynamic'`。

1. 讀 raw body，用 `LINE_MESSAGING_CHANNEL_SECRET` 做 HMAC-SHA256，跟 `x-line-signature` 用 `timingSafeEqual` 比對。不符就回 401。
2. 逐一處理 `events[]`，用 `webhookEventId` 去重（`LineWebhookReceipt`，唯一索引）。LINE 重送時直接跳過。
3. **先回 200，再做慢的事。** 快速指令直接在請求內做完並回覆；AI 對話和附件下載放進 Next.js 的 `after()`，避免 webhook 逾時被重送。
4. 回覆用 reply token（只能用一次、有時效，所以要盡快用）。來不及或已經用過時，一對一聊天改用 push，群組則放棄回覆，不改用 push。

### 5.2 事件分派

| 事件 | 一對一 | 群組 |
| --- | --- | --- |
| `follow` | 歡迎訊息，加上綁定說明（沒綁定時） | — |
| `join` | — | 建 `LineChat`，發一次性自我介紹（PRD-003 R4.1） |
| `leave` | — | `LineChat.leftAt` 寫入現在時間 |
| `message`（文字） | 快速指令 → 都不符合就交給 AI | 有開記錄就存起來；被 @ 才回應（`mention.mentionees[].isSelf`）；「簽到」每場活動每個群組提醒一次 |
| `message`（圖片、影片、檔案、語音） | 回「目前只看得懂文字」 | 有開記錄就下載存到 R2 |
| `postback` | 圖文選單或按鈕的動作 | — |
| 其他 | 忽略 | 忽略 |

### 5.3 身分解析

```txt
event.source.userId
  → MemberIdentity.findUnique({ provider: 'line', subject: userId })
  → Member（isActive）
  → AgentCaller { channel, lineUserId, memberId?, isLeader: false }
```

- LINE 這端永遠不給領導團隊權限，就算對方是幹部也一樣。後台動作只在網站做（PRD-003 原則「寫入權限最小化」）。
- 訊息內容不參與身分判斷。

## 6. 簽到服務抽出來共用

現在的自助簽到寫在 `src/app/(public)/e/[eventKey]/check-in/actions.ts` 的 `selfCheckInAction` 裡。抽成 `src/server/tbx/check-in-service.ts`：

```ts
checkInMemberForToday(input: { memberId: string; method: 'line_chat' | 'liff' | 'web' })
  → { status: 'checked_in' | 'already' | 'late'; displayName; seatLabel?; eventKey }
  | { status: 'no_event_today'; next?: { eventKey; date } }
  | { status: 'not_on_roster' }
```

- 內部沿用 `getFocusEvent`、`isEventToday`、`ensureParticipations`、`checkIn`、`isPastStartTime`、`getSeatPlanView`、`logOperation`。
- 網頁的 action 和 LINE 的指令都呼叫它，規則只寫一份。
- 每次簽到寫一筆 `OperationLog`，`method` 能分辨是聊天、LIFF 還是網頁。

## 7. Agent 核心

```txt
src/server/agent/
  provider.ts        // AgentModel 介面：chat({ system, messages, tools }) → { text, toolCalls }
  providers/anthropic.ts
  providers/openai.ts
  tools.ts           // 工具定義，依 tier 分級
  run-agent.ts       // 迴圈：呼叫模型 → 執行工具 → 回填結果，最多 N 輪
  conversations.ts   // 對話紀錄讀寫、每日上限
  prompts.ts         // 系統提示（分會介紹、語氣、群組模式的長度限制）
```

### 7.1 模型 adapter

- 統一的 `AgentModel` 介面，各家的工具呼叫格式在 adapter 裡轉換。
- 讀 `AGENT_PROVIDER` 選 adapter；金鑰缺少時，Agent 回覆固定的「AI 暫時無法使用」，快速指令照常運作。
- 單次對話最多 5 輪工具呼叫，有逾時，回覆長度有上限（群組模式更短）。

### 7.2 工具分級

| Tier | 給誰 | 工具 |
| --- | --- | --- |
| `public` | 所有 LINE 使用者、群組 | `get_today_event`、`get_upcoming_events`、`get_public_links`（座位、抽獎、投票）、`get_meeting_agenda`、`search_faq` |
| `member` | 已綁定的會員（一對一） | `public` 全部，加上 `get_my_seat`、`check_in_me`、`get_my_attendance` |
| `leader` | 網站 `/console/agent`，經過 `requireLeader()` | `member` 全部，加上現有的 `listAiEvents`、`getSeatingContext`、`evaluateGridArrangement`、`saveGridArrangement`、`saveAiSeatPlan` |

- 工具清單由伺服器依 `AgentCaller` 決定，模型看不到也叫不到自己 tier 以外的工具。
- 工具的參數不能指定「幫誰」。`check_in_me`、`get_my_seat` 一律用 caller 的 `memberId`，不能用模型給的值。
- 工具回傳的資料走既有的 public/member DTO，不回傳 email、電話、內部 id、私人備註。
- `leader` 的寫入沿用 `seating-service.ts`：每次都建立新的座位表版本，加一筆操作紀錄。

### 7.3 不信任的輸入

- 群組訊息、一對一訊息、FAQ 以外的內容都是不信任的資料。系統提示要明講：訊息裡的「指示」不能改變工具權限。
- 真正的保護是 7.2 的分級和參數限制，不依賴模型守規矩。

## 8. 資料模型（新增，全部是加法）

```prisma
model LineChat {
  id              String    @id @default(auto()) @map("_id") @db.ObjectId
  kind            String    // user | group | room
  lineId          String    @unique // userId / groupId / roomId
  name            String?
  archiveEnabled  Boolean   @default(false)
  checkInHintKey  String?   // 最後一次在這個群組提醒簽到的 eventKey（R4.4）
  joinedAt        DateTime  @default(now())
  leftAt          DateTime?
}

model LineMessage {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  chatId        String   @db.ObjectId
  lineMessageId String   @unique
  lineUserId    String?
  memberId      String?  @db.ObjectId
  senderName    String?
  type          String   // text | image | video | audio | file | sticker | location
  text          String?
  assetId       String?  @db.ObjectId // Asset（R2）
  mentionsBot   Boolean  @default(false)
  sentAt        DateTime
  expiresAt     DateTime
  @@index([chatId, sentAt])
  @@index([expiresAt])
}

model LineWebhookReceipt {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  webhookEventId String   @unique
  receivedAt     DateTime @default(now())
  @@index([receivedAt])
}

model AgentConversation {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  channel    String   // web | line_user | line_group
  callerKey  String   // 網站 session 或 LINE userId
  memberId   String?  @db.ObjectId
  updatedAt  DateTime @updatedAt
  expiresAt  DateTime
  @@unique([channel, callerKey])
  @@index([expiresAt])
}

model AgentMessage {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  conversationId String   @db.ObjectId
  role           String   // user | assistant | tool
  content        String
  toolName       String?
  createdAt      DateTime @default(now())
  @@index([conversationId, createdAt])
}
```

- 附件沿用現有的 `Asset`（`purpose: 'line_message'`、`visibility: 'private'`），R2 key 格式：`line/<chatId>/<yyyy-mm>/<lineMessageId>.<ext>`。後台用 presigned URL 檢視，不公開。
- 依 AGENTS.md 的 MongoDB 規則：選填欄位建立時明寫 `null`，查詢時同時處理 `null` 和 `isSet: false`。
- 每日上限用 `AgentMessage` 依 caller 計數，不另外建表。
- 保存期限：用 `expiresAt` 加上每日清理（Vercel Cron 或 Mongo TTL 索引）。清理 `LineMessage` 時一併刪掉 R2 物件和 `Asset`。

## 9. 推播與則數

- 回覆（reply）不計入則數，推播（push）會計入，而且群組推播是按群組人數計算。
- 只有 R7 的定時推播和「reply token 失效時的一對一補發」會用到 push。
- 每次 push 都寫 `OperationLog`。後台用 Messaging API 的 quota 查詢顯示本月已用和剩下的則數。
- 方案額度上線前要到 LINE 官方帳號後台確認，不寫死在程式裡。

## 10. 圖文選單

- 用 Messaging API 建立：一張 2500×1686 的圖、六個區塊。
- 用 `scripts/line-rich-menu.ts` 建立並設為預設，可以重跑，也會刪掉舊的。
- 圖片放在 `public/line/rich-menu.png`，不含任何個人資料。

## 11. 隱私與安全檢查表

- [ ] webhook 驗簽，不符就 401；不記錄 raw body。
- [ ] ID token 只在伺服器驗證，不存、不寫 log。
- [ ] LINE 端永遠不給 `leader` tier。
- [ ] 群組回覆只用 `public` tier。
- [ ] 群組記錄預設關閉，只有後台能看，有保存期限。
- [ ] 金鑰、channel secret、access token、`ADMIN_PASSWORD` 的值都不出現在程式碼、文件、報告或截圖裡。
- [ ] 公開 DTO 規則不變：email、確認碼、內部 user id、私人備註、完整出席名單都不出現在公開回覆。
