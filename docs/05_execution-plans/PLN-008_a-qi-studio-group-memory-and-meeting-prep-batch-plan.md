# PLN-008: 阿麒工作室、群組記憶與會議準備分批計畫

Status: Draft
Date: 2026-11-25
Related: PRD-005、ARC-009、ACC-007、PLN-007

照順序做。每一批做完都要跑驗證、留證據（`docs/2_agent-input/generated/agent-loop/reports/`），再進下一批。驗收項目對應 ACC-007 的編號。

驗證指令：

```bash
pnpm run lint
pnpm run build
git diff --check
```

有改 Prisma schema 的批次，再加：

```bash
pnpm run prisma:generate
pnpm run prisma:validate
```

正式環境的索引建立、環境變數、LINE 後台設定，都要擁有者同意後才做。正式資料庫目前缺少 `MemberIdentity`、`MemberLoginLink`、`ApiToken` 的索引（2026-11-25 檢查），所以不要直接跑整份 `prisma db push`：每一批只建立自己新增的索引，或先跟擁有者確認。

和 PLN-007 的關係：

- AQ-001 取代 LINE-008（群組訊息記錄）。
- AQ-002、AQ-003 取代 LINE-006（Agent 核心）。原本的 `/console/agent` 改成 `/console/a-qi`。
- LINE-005 的分享、LINE-007 的 LINE 一對一 AI 回答、LINE-009 的推播，仍然照 PLN-007 做。LINE-007 排在 AQ-002 之後。

先做 AQ-001 的原因：群組記錄不需要 AI，越早開始，阿麒在 AI 上線時就有越多資料可以學。

---

## AQ-000：開放群組

Status: In progress

- [x] 正式資料庫建立 `LineChat`（`lineId` unique、`kind`）和 `LineWebhookReceipt`（`webhookEventId` unique、`receivedAt`）的索引。只建這兩張表的索引，沒有跑整份 `db push`。建立前已確認沒有重複資料（`LineChat` 14 筆、`LineWebhookReceipt` 60 筆，2026-11-25）。
- [ ] 官方帳號後台：設定 → 帳號設定 → 功能切換 →「加入群組或多人聊天室」改成「接受邀請」（MANUAL_REQUIRED，擁有者登入 LINE Official Account Manager）。
- [ ] 建一個測試群組，邀請阿麒，確認：收到自我介紹、平常不說話、@阿麒 有回覆、打「簽到」只提醒一次（ACC-006 §3）。

這一批還沒有記錄訊息，所以目前的自我介紹不提記錄。AQ-001 上線時改成 PRD-005 R2.1 的版本。

## AQ-001：群組名冊與訊息記錄

Status: Not started

- [ ] Prisma：`LineChat` 新增群組檔案欄位、新增 `LineMessage`（ARC-009 §3.1、§3.2）。
- [ ] webhook：記錄中的群組，文字訊息寫入 `LineMessage`；附件在 `after()` 下載，存到 R2，建立 `Asset`。
- [ ] 加入群組時：用 Messaging API 取得群組名稱和人數，記錄預設打開，自我介紹改成 PRD-005 R2.1 的版本。
- [ ] 舊群組第一次打開記錄時，發一次公告（R2.5）。
- [ ] 一對一指令「刪除我的群組訊息」：先確認，再刪除這位使用者的訊息和 R2 檔案（R2.6）。
- [ ] `/console/a-qi/groups`：群組清單、記錄開關、訊息瀏覽與搜尋、附件用 presigned URL 檢視、刪除整個群組的記錄（要二次確認）。
- [ ] 正式資料庫只建立這一批新增的索引。

驗收：ACC-007 §1。

## AQ-002：Agent 核心（Claude）

Status: Not started

- [ ] `src/server/agent/*`（ARC-008 §7）。先做 Anthropic adapter，使用結構化輸出和工具呼叫。
- [ ] 模型、預算、cron 的環境變數（ARC-009 §8）。設定金鑰由擁有者自己做。
- [ ] `AgentRun`：每次呼叫都記錄 token 用量。每日預算檢查。
- [ ] 沒有金鑰時，回傳「AI 未設定」，不影響記錄和快速指令。
- [ ] 固定內容使用 prompt caching。

驗收：ACC-007 §2。

## AQ-003：工作室與交流區

Status: Not started

- [ ] Prisma：`AgentPost`、`AgentMemory`。
- [ ] `/console/a-qi`：主對話串、本日用量、待確認事項數、最近草稿。
- [ ] 幹部發文 → `after()` 跑 Agent（`studio` 工具組，這一批先只有唯讀工具）→ 阿麒回覆。
- [ ] 長期記憶：阿麒提議記住、幹部在 `/console/a-qi/memory` 修改和刪除。
- [ ] console 導覽列加「阿麒工作室」。

驗收：ACC-007 §3。

## AQ-004：讀群組，整理事項和群組用途

Status: Not started

- [ ] Prisma：`AgentNote`。
- [ ] `/api/cron/a-qi/digest`、累積 30 則觸發、「現在整理」按鈕（ARC-009 §5.1）。
- [ ] 結構化輸出的伺服器檢查、`subjectKey` 去重、個資遮蔽。
- [ ] 群組用途建議 → 群組檔案顯示「阿麒的推測」→ 幹部確認。
- [ ] `/console/a-qi/notes`：事項清單、確認或不採用、點開看來源訊息。
- [ ] 確認 Vercel 方案的 cron 次數限制，再決定 digest 的排程。

驗收：ACC-007 §4。

## AQ-005：依情境排座位表草稿

Status: Not started

- [ ] `docs/02_architecture-and-rules/seating-playbook.md`：從 `weekly-seating` skill 搬出排座位規則。skill 改成引用這份文件，阿麒也讀它（ARC-009 §6）。
- [ ] Prisma：`AgentDraft`。
- [ ] `/api/cron/a-qi/meeting-prep` 和交流區的「現在排」（ARC-009 §5.2）。
- [ ] 草稿頁：唯讀座位圖、每個安排的理由、驗證結果、需要決定的事。
- [ ] 交流區可以要求修改草稿，產生新版本。
- [ ] 「採用」：server action 重新驗證，再呼叫 `saveGridArrangement`，建立新的座位表版本和操作紀錄。
- [ ] 用 11/26 的實際資料做一次對照：阿麒的草稿 vs 實際排法，記錄差異。

驗收：ACC-007 §5。

## AQ-006：其他會議工具

Status: Not started

- [ ] 來賓名單草稿，附會後交流建議（R6.1）。
- [ ] 群組公告草稿 → 幹部按「發送」→ push 到指定群組。發送前顯示人數和本月剩餘則數（R6.2、ARC-008 §9）。
- [ ] 一對一配對建議（R6.3）。
- [ ] 工具提案（R6.4）：只在交流區發文，不寫程式。

驗收：ACC-007 §6。

---

## 建議的停止點

- AQ-001 做完：阿麒在群組裡安靜記錄，幹部可以看群組和訊息。這時還不需要 AI 金鑰。
- AQ-003 做完：幹部可以在工作室跟阿麒聊、問群組裡發生了什麼。
- AQ-005 做完：例會前一天就有依情境排好的座位表草稿。這是這個計畫的主要目標。
