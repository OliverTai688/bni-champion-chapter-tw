# take-seat Agent Loop Stop Report

Date: 2026-11-25
Batch / slice: PLN-008 AQ-001 群組名冊與訊息記錄
Branch: `feat/a-qi-group-archive`（based on `main` 0e16949）
Status: Implemented locally，未部署

## 1. User-Visible Result

- `/console/a-qi` 轉到 `/console/a-qi/groups`。console 左側多了「阿麒」。
- `/console/a-qi/groups`：群組清單，顯示名稱、類型和用途、人數、訊息數、最近一則、記錄狀態。
- `/console/a-qi/groups/[chatId]`：
  - 群組檔案：類型、用途，儲存後標為「已確認」。
  - 記錄：開始或停止記錄。從沒公告過的群組，第一次開始記錄時用兩步確認，並提示會用掉推播額度。
  - 刪除全部記錄：兩步確認。
  - 訊息：最新的在上面，可以搜尋文字、發言者、檔名，每頁 50 則，有「更早的訊息」。
  - 附件有存到 R2 的，用 presigned URL 開啟。
- LINE：
  - 阿麒被加入群組時，自我介紹加上記錄說明（PRD-005 R2.1），並且直接開始記錄。
  - 一對一打「刪除我的群組訊息」，會出現「確認刪除」按鈕。確認後刪除這位使用者在所有群組的訊息和檔案。
  - 「說明」多一行刪除指令的說明。

## 2. Product Scope

- 依據：PRD-005 R1.1、R1.2、R1.4、R2.1 到 R2.8；ARC-009 §3.1、§3.2、§4。
- 不包含：AI 整理、群組用途推測（AQ-004）、交流區（AQ-003）。

## 3. Changed Files

- `prisma/schema.prisma`：`LineChat` 新增群組檔案和記錄欄位；新增 `LineMessage`。
- `src/server/line/messaging.ts`：quick reply 按鈕、群組名稱和人數、群組成員名稱、下載訊息內容。
- `src/server/line/archive.ts`（新）：記錄訊息、`after()` 補發言者名稱和存附件到 R2、presigned URL、使用者刪除、整個群組刪除、群組資料更新、舊群組公告。
- `src/server/line/events.ts`：記錄中的群組，每一則訊息都存下來；新的加入訊息；`memberJoined` / `memberLeft` 更新人數；刪除指令和 postback。
- `src/app/api/line/webhook/route.ts`：`maxDuration = 60`，讓附件可以在回應之後下載。
- `src/server/a-qi/groups.ts`（新）：群組頁的資料。
- `src/app/(console)/console/a-qi/**`（新）：工作室入口、群組清單、群組頁、server actions。
- `src/components/tbx/console-shell.tsx`：導覽列「阿麒」。

## 4. Privacy And Security

- 所有 `/console/a-qi/*` 頁面都在 console layout 的領導團隊檢查之後，頁面本身也再檢查 `isLeader()`。每個 server action 都用 `requireLeader()`。
- `LineMessage` 只有 `src/server/line/archive.ts`、`src/server/a-qi/groups.ts`、`src/server/line/events.ts`（計數）讀取，不在任何公開或會員 DTO 裡。
- 刪除請求會清掉文字、檔名、發言者名稱、LINE userId、會員 id、R2 檔案和 `Asset`，只留下「已刪除」的列。操作紀錄只記數量。
- 連到 LINE API 失敗的錯誤訊息只寫狀態碼和路徑前段，不寫群組 id 以外的內容，也不寫訊息內容。
- 附件上限 50MB，超過的標為 `too_large`，不保存。

## 5. Validation

```bash
./node_modules/.bin/prisma validate        # valid
./node_modules/.bin/eslint <changed files> # 0 problems
./node_modules/.bin/next build             # ✓ Compiled successfully
git diff --check                           # clean
```

`tsc --noEmit`：改到的檔案沒有錯誤。

本機實測：使用本機 Docker MongoDB `take-seat-dev`，LINE 和 R2 都用假的設定，沒有連到正式環境。

- 用假的群組和訊息看群組清單、群組頁、搜尋「請假」、儲存群組檔案、停止和開始記錄，都正常。
- 用假的 channel secret 簽名，送 webhook 到本機：
  - 簽名錯誤：401。
  - `join`：建立 `LineChat`，`archiveEnabled: true`，有 `recordingAnnouncedAt`。
  - 文字、照片訊息：寫入 `LineMessage`，照片在沒有 R2 時標為 `not_stored`。
  - 同一個 `webhookEventId` 重送：只存一次。
  - 刪除 postback：這位使用者的 3 則訊息被清空，並標為已刪除；群組頁顯示「傳送者已要求刪除這則訊息。」
- 對 LINE API 的呼叫（回覆、群組資料）用假 token，都得到 401，被記錄下來，不影響訊息記錄。
- 測試資料測完已從本機資料庫刪除。

沒有驗證（MANUAL_REQUIRED）：

- 真正的 LINE 群組：加入訊息、照片下載和存到 R2。要在部署後，用測試群組在手機上確認。
- Vercel 正式環境是否有設定 `R2_*` 環境變數。本機 `.env` 有設定；Vercel 端沒有查到（CLI 沒有連到這個專案）。沒設定時，附件會標為 `not_stored`，文字照常記錄。

## 6. 上線前要做的事（需要擁有者同意）

1. 正式資料庫只建立 `LineMessage` 的索引：`lineMessageId` unique、`chatId+sentAt`、`lineUserId`、`expiresAt`。不要跑整份 `prisma db push`（正式資料庫另外還缺 `MemberIdentity`、`MemberLoginLink`、`ApiToken` 的索引，要另外處理）。
2. 確認 Vercel 有 `R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET_NAME`。
3. 合併到 `main` 並部署。
4. 官方帳號後台打開「接受邀請加入群組」（AQ-000）。
5. 在測試群組驗收 ACC-007 §0、§1。

## 7. Recommended Next Task

AQ-002（Agent 核心，Claude）。需要擁有者在 Vercel 設定 `ANTHROPIC_API_KEY`。
