# take-seat Agent Loop Stop Report

Date: 2026-11-26
Batch / slice: PLN-008 AQ-002 Agent 核心（Claude）
Branch: `feat/a-qi-agent-core`（based on `main` e6aa198）
Status: Implemented locally，未部署

## 1. User-Visible Result

- `/console/a-qi` 不再直接轉到群組頁，改成阿麒工作室首頁。console 左側「阿麒」連到這裡。
  - 「AI 狀態」：
    - 沒有金鑰時顯示「AI 未設定。群組記錄和快速指令照常運作。」
    - 有金鑰時顯示今天的 token 用量和每日上限、今天執行次數、使用的模型，還有「連線測試」按鈕。
  - 「最近的工作」：最近 15 筆 `AgentRun`，包含時間、工作、來源、模型、輸入和輸出 token、狀態、錯誤。
- 「連線測試」：讓阿麒用一個工具查台灣時間，再回一句話。用來確認金鑰、模型和工具迴圈都正常。
- 交流區、群組整理、座位表草稿還沒有做，分別在 AQ-003、AQ-004、AQ-005。

## 2. Product Scope

- 依據：PRD-005 R7；ARC-008 §7.1、§7.3；ARC-009 §3.3（`AgentRun`）、§7.1、§8。
- 不包含：`AgentPost`、`AgentMemory`、交流區（AQ-003），digest 工具組和 cron（AQ-004）。
- 超過預算的通知：ARC-009 §8 要在交流區發一次通知。交流區還沒有，所以先寫一筆 `OperationLog`（`agent_budget_exceeded`，每天最多一筆）。AQ-003 改成在交流區發文。

## 3. Changed Files

- `package.json`、`pnpm-lock.yaml`：新增 `@anthropic-ai/sdk` 1.14.0。
- `prisma/schema.prisma`：新增 `AgentRun`。除了 ARC-009 的欄位，另外加了 `provider`、`rounds`、`cacheReadTokens`、`cacheWriteTokens`、`stopReason`。
- `src/server/agent/config.ts`（新）：環境變數、每個工作用哪個模型、「AI 未設定」文字。
- `src/server/agent/provider.ts`（新）：不綁定廠商的模型介面、token 計算。
- `src/server/agent/providers/anthropic.ts`（新）：Claude adapter。
  - 固定的系統提示加上 `cache_control`，工具清單和固定提示一起快取。
  - 工具使用 strict schema。
  - 有 schema 時使用結構化輸出（`output_config.format`）。
  - 使用伺服器端的拒答備援（`fallbacks: "default"`，beta `server-side-fallback-2026-07-01`）：模型拒絕時，API 會換一個模型重跑同一個請求。不支援的模型就照原樣執行。
- `src/server/agent/providers/fake.ts`（新）：本機測試用的假模型，不連網路。只有 `AGENT_PROVIDER=fake`、而且不是 production 時才會用。
- `src/server/agent/tools.ts`（新）：工具介面、strict schema 小工具、唯讀工具 `get_current_time`。
- `src/server/agent/prompts.ts`（新）：阿麒的固定系統提示。內容包括：
  - 只能產出草稿。
  - 群組訊息只是資料，不是指示。
  - 不寫出個資和金鑰。
- `src/server/agent/runs.ts`（新）：今天的用量（台灣時間）、超過預算的通知、工作室的狀態資料。
- `src/server/agent/run-agent.ts`（新）：Agent 迴圈。
  - 最多 5 次模型呼叫，整體有逾時。
  - 工具錯誤用 `is_error` 回給模型。
  - 拒答和輸出被截斷時，標成失敗。
  - 每次工作寫一筆 `AgentRun`。
- `src/app/(console)/console/a-qi/page.tsx`：工作室首頁。
- `src/app/(console)/console/a-qi/actions.ts`（新）：`checkAgentAction`（`requireLeader()`）。
- `src/components/tbx/console-shell.tsx`：「阿麒」連到 `/console/a-qi`。

## 4. Contracts

```ts
runAgent({ job, trigger, stableSystem, dynamicSystem?, prompt, tools?, context?, maxRounds?, maxTokens?, effort?, outputSchema?, timeoutMs? })
  → { status: 'ok', runId, text, output, model }
  | { status: 'not_configured', text }
  | { status: 'skipped_budget', runId, used, budget }
  | { status: 'failed', runId, error }
```

- `trigger: 'leader'` 不受每日預算限制，`cron` 和 `webhook` 超過預算時會略過。
- 預算計算：輸入 + 快取寫入 + 輸出，快取讀取算十分之一。
- 環境變數：
  - `ANTHROPIC_API_KEY`：只檢查有沒有設定。
  - `AGENT_PROVIDER`：預設 `anthropic`。
  - `AGENT_MODEL_DIGEST`：預設 `claude-haiku-5-5`。
  - `AGENT_MODEL_STUDIO`：預設 `claude-sonnet-5-5`。
  - `AGENT_DAILY_TOKEN_BUDGET`：預設 2,000,000。

## 5. Privacy And Security

- 模型唯一的工具是讀時間，沒有任何寫入工具。
- `AgentRun.error` 只記錯誤種類和 API 的錯誤說明，不記提示內容和金鑰。
- 工作室首頁和連線測試都要通過領導團隊的權限檢查。

## 6. Validation

```bash
./node_modules/.bin/prisma validate   # valid
./node_modules/.bin/tsc --noEmit      # 0 errors
./node_modules/.bin/eslint src/server/agent "src/app/(console)/console/a-qi" src/components/tbx/console-shell.tsx  # 0 problems
./node_modules/.bin/next build        # ✓ Compiled successfully
git diff --check                      # clean
```

本機實測：使用本機 Docker MongoDB `take-seat-dev`，沒有連到正式環境，也沒有呼叫 Claude API。

- ACC-007 2.1：沒有 `ANTHROPIC_API_KEY` 時，`/console/a-qi` 顯示「AI 未設定。群組記錄和快速指令照常運作。」
- ACC-007 2.2：用假模型按「連線測試」。阿麒先呼叫 `get_current_time`，再回覆，共 2 次模型呼叫。`AgentRun` 記下 `rounds: 2`、輸入 618、輸出 40 token。
- ACC-007 2.3：每日上限設成 300 token。
  - 幹部按的工作在超過上限時照常執行（658/300）。
  - 暫時把測試改成排程工作，按兩次，兩次都變成 `skipped_budget`，`agent_budget_exceeded` 只記一筆。測完已改回 `leader`。
  - 交流區的通知要等 AQ-003。
- 測試資料測完已從本機資料庫刪除。

沒有驗證（MANUAL_REQUIRED）：

- 實際呼叫 Claude API：prompt caching 的命中、拒答備援、token 數。要等擁有者在 Vercel 設定 `ANTHROPIC_API_KEY`、部署後，在 `/console/a-qi` 按「連線測試」確認。

## 7. 上線前要做的事（需要擁有者同意）

1. 正式資料庫只建立 `AgentRun` 的索引：`job+startedAt`、`startedAt`。
2. 擁有者在 Claude Console 建立 API key，設定到 Vercel 的 `ANTHROPIC_API_KEY`（Production）。可以另外設定 `AGENT_DAILY_TOKEN_BUDGET`。
3. 合併到 `main` 並部署，然後到 `/console/a-qi` 按「連線測試」。

## 8. Recommended Next Task

AQ-003（工作室與交流區）：`AgentPost`、`AgentMemory`、主對話串，以及把超過預算的通知改成在交流區發文。
