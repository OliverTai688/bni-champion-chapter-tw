# PLN-007: 長冠軍同行者、LINE 官方帳號與 LIFF 分批計畫

Status: Draft
Date: 2026-11-18
Related: PRD-003、ARC-008、ACC-006

照順序做。每一批做完都要跑驗證、留證據（`docs/2_agent-input/generated/agent-loop/reports/`），再進下一批。驗收項目對應 ACC-006 的編號。

每一批的驗證指令：

```bash
pnpm run lint
pnpm run build
git diff --check
```

有改 Prisma schema 的批次再加：

```bash
pnpm run prisma:generate
pnpm run prisma:validate
```

正式環境的 `prisma:push`、環境變數設定、LINE 後台設定，都要擁有者同意後才做。

---

## LINE-001：LINE 後台設定與決策鎖定

Status: In progress（MANUAL_REQUIRED，需要擁有者）

- [x] 確認網站 LINE 登入的現況：正式環境只開 Google 登入，沒有既有的 LINE channel 或綁定（2026-11-18）。
- [x] 建立 Provider「BNI 長冠軍分會」（2026-11-18）。
- [x] 建立 LINE Login channel（Channel ID `2012686828`，地區台灣，Web app，2026-11-18），名稱「阿麒」，圖示和說明用 PRD-004 的阿麒。目前狀態是 Developing。
- [x] 設定 Callback URL：`https://bni-champion-chapter-tw.yzedtech.com/api/auth/callback/line`（2026-11-18）。
- [x] 建立 LIFF app「阿麒」（2026-11-18，原名「長冠軍同行者」）：LIFF ID `2012686828-cJBksfQD`，網址 `https://liff.line.me/2012686828-cJBksfQD`，Size Full，Endpoint 是正式網站根網址，scope 選 `openid`、`profile`，Add friend option 先設 Off（官方帳號建好後改成 On (Normal)）。
- [x] 開啟 shareTargetPicker（2026-11-18，擁有者同意）：已同意 LY 的「Agreement Regarding Use of Information」。LY 會收集透過分享功能送出的內容和傳送資訊，可能提供給關係企業，也可能用於廣告。
- [ ] 把 `AUTH_LINE_ID`（Channel ID）和 `AUTH_LINE_SECRET`（Channel secret）設到正式環境。secret 不寫進文件或聊天。
- [ ] 把 channel 從 Developing 改成 Published。Developing 狀態下只有 channel 管理員能登入。
- [x] 建立官方帳號「阿麒」（2026-11-18）：基本 ID `@354afrmf`，輕用量方案，公司名稱「BNI 長冠軍分會」，業種「企業、組織（其他）」，聯絡 email 是團隊信箱。未申請認證帳號。擁有者同意了 LY「同意我們使用您的資訊」。
- [x] 確認 LINE 官方帳號使用條款更新通知（2025-02-19 版，擁有者自己按的）。
- [x] 開啟 Messaging API，綁定 Provider「BNI 長冠軍分會」（擁有者按「同意」，2026-11-18）。Messaging API Channel ID `2012687088`。
- [x] 官方帳號頭像換成阿麒（2026-11-18）。LINE 規定換頭像後 1 小時內不能再改。
- [x] LINE Login channel 的 Linked LINE Official Account 設為 `@354afrmf`，LIFF app 的 Add friend option 改成 On (Normal)（2026-11-18）。
- [ ] 重新發行 Messaging API 的 Channel secret：2026-11-18 設定時，secret 曾出現在 AI 助理的瀏覽器讀取結果裡。上線前在 LINE Developers 重新發行，新的 secret 只放 Vercel 環境變數。
- [ ] 把 `LINE_MESSAGING_CHANNEL_SECRET`、`LINE_MESSAGING_ACCESS_TOKEN` 設到正式環境（ARC-008 §3）。
- [ ] 官方帳號後台：關閉自動回應訊息，開啟 webhook，允許加入群組（目前是「不接受邀請加入群組或多人聊天室」）。
- [ ] 決定 PRD-003 Q2（預設模型）、Q3（群組記錄範圍）、Q4（保存期限）。頭像已定為阿麒（PRD-004）。
- [ ] 確認正式環境已設定 `ADMIN_PASSWORD`（領導團隊在 LINE 裡用）。

完成條件：決策寫回 PRD-003「已決定」，環境變數清單補進 PLN-006。

## LINE-002：LIFF 自動登入

Status: Deployed（2026-11-19，`main` commit `2fadf5c`）；手機在 LINE 裡的實測還沒做

- [x] 加入 `@line/liff` 2.32，`src/components/liff-boot.tsx` 放在 `AppProviders`，只在 LINE 內建瀏覽器而且有設 `NEXT_PUBLIC_LIFF_ID` 時，才動態載入 SDK。每個分頁只自動登入一次，失敗不會一直重試。
- [x] `src/auth.ts` 新增 Credentials provider `liff`：`src/server/auth/liff.ts` 用 LINE 的 verify API 驗證 ID token（`client_id` = `AUTH_LINE_ID`，同時檢查 `aud`），token 不存、不寫 log。`jwt` callback 把 `liff` 正規化成 `line`，所以綁定、`/me`、`getLeaderAccess()` 都沿用 LINE Login 的流程。
- [x] 在 LINE 裡（用 user agent 判斷，`src/lib/line-client.ts`）隱藏 Google 登入：`/login` 改顯示「用預設瀏覽器開啟」的說明，`/console` 閘門提示用後台密碼。已綁定的 LINE 使用者在 LINE 裡打開 `/login` 會直接前往 `next`。
- [x] `/today`、`/today/check-in`、`/today/lottery`、`/today/vote`（`src/app/(public)/today/[[...section]]/page.tsx`）：用 `getFocusEvent({ publicOnly: true })` 轉到今天或下一場已發布的活動；都沒有時顯示空狀態。正式環境已確認 `/today` → `/e/2026-11-19`、`/today/check-in` → `/e/2026-11-19/check-in`，不合法的路徑回 404（2026-11-19）。
- [x] PLN-006 和 `.env.example` 補上 `NEXT_PUBLIC_LIFF_ID`。

驗收：ACC-006 §1。

## LINE-003：簽到服務抽出來

Status: Implemented locally（2026-11-19，branch `feat/line-check-in-service`）；沒有資料庫可以實測

- [x] 新增 `src/server/tbx/check-in-service.ts`：`selfCheckIn()` 處理一筆名單的簽到（已簽到、請假或代理、遲到、寫入、操作紀錄、重新整理頁面快取），`checkInMemberForToday()` 用會員 id 找今天已發布的活動和名單（給 LINE 聊天用），`describeCheckIn()` 是統一的回覆文字。
- [x] `/e/[eventKey]/check-in` 的 `selfCheckInAction` 和 `/me` 的 `memberCheckInAction` 都改用 `selfCheckIn()`，各自的文字和行為不變。
- [x] `OperationLog` 的 `metadata.method` 記錄簽到方式：網頁維持 `self`，之後 LINE 聊天用 `line_chat`。
- [ ] 實測：網頁自助簽到、`/me` 簽到、遲到、已簽到、請假（ACC-006 2.1–2.3、2.9）。要本機資料庫或正式環境。

驗收：ACC-006 §2 的網頁回歸項目。

## LINE-004：Webhook 與快速指令

Status: Not started

- [ ] Prisma：`LineChat`、`LineWebhookReceipt`。
- [ ] `src/app/api/line/webhook/route.ts`：驗簽、去重、事件分派（ARC-008 §5）。
- [ ] `src/server/line/*`：Messaging API client（reply、push、取得內容、quota），只在伺服器用。
- [ ] 一對一：`簽到`、`座位`、`座位表`、`抽獎`、`投票`、`說明`（PRD-003 R3）。
- [ ] 群組：加入時自我介紹一次；被 @ 才回應；「簽到」每場活動每個群組提醒一次。
- [ ] `follow` 歡迎訊息。

驗收：ACC-006 §2、§3。

## LINE-005：圖文選單與分享到群組

Status: Not started

- [ ] `scripts/line-rich-menu.ts` 加上 `public/line/rich-menu.png`，六格連到 `/today/*` 和 `/me`。
- [ ] 活動頁在 LINE 裡顯示「分享到群組」（shareTargetPicker），分享 Flex 卡片：座位表、抽獎。

驗收：ACC-006 §4。

## LINE-006：Agent 核心與網站 AI 頁

Status: Not started

- [ ] `src/server/agent/*`：adapter 介面、先做 PRD-003 Q2 選定的供應商、工具分級、對話迴圈（ARC-008 §7）。
- [ ] Prisma：`AgentConversation`、`AgentMessage`。
- [ ] `/console/agent`：領導團隊的對話頁，使用 `leader` tier 工具。
- [ ] 每日上限、逾時、工具呼叫輪數上限。
- [ ] 沒設金鑰時顯示「AI 未設定」，不壞掉。

驗收：ACC-006 §5。

## LINE-007：LINE 一對一與群組的 AI 回答

Status: Not started

- [ ] 一對一裡，快速指令以外的文字交給 Agent（`public` / `member` tier）。
- [ ] 群組被 @ 時交給 Agent（`public` tier，短回覆模式）。
- [ ] 回覆放進 `after()`；reply token 失效時，一對一改用 push，群組放棄回覆。
- [ ] 常見問題的來源（先用 `docs/` 下一份 FAQ markdown，之後再做後台編輯）。
- [ ] 補上第二家模型 adapter。

驗收：ACC-006 §6。

## LINE-008：群組訊息記錄

Status: Not started（依 PRD-003 Q3、Q4 的決定）

- [ ] Prisma：`LineMessage`。
- [ ] 有開記錄的群組：文字存 MongoDB；附件在 `after()` 下載，存到 R2，建立 `Asset`。
- [ ] `/console/line`：群組清單、記錄開關、訊息瀏覽與搜尋、附件用 presigned URL 檢視。
- [ ] 每日清理過期的訊息和 R2 物件。

驗收：ACC-006 §7。

## LINE-009：定時推播（選用）

Status: Not started

- [ ] 例會當天早上推播座位表卡片到指定群組，預設每週最多一則。
- [ ] 後台顯示本月 quota 已用和剩下的則數。

驗收：ACC-006 §8。

---

## 建議的停止點

- LINE-002 做完：在 LINE 裡打開網站、自動登入，可以先給大家用。
- LINE-005 做完：不需要 AI，也已經能在 LINE 裡完成簽到和看座位表。這是第一個可以正式上線的版本。
- LINE-007 做完：AI 上線。
