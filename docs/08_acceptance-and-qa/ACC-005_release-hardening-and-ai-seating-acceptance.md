# ACC-005: 上線強化、LINE 登入、舊資料搬遷與 AI 排座 API 驗收

Status: Local evidence collected; production pending
Date: 2026-10-06
Related: PLN-006、ACC-004

本機驗證環境：Docker MongoDB（`take-seat-dev`），`next dev` 與 `next build`。正式資料庫與 Vercel 尚未連線（本 session 的網路政策擋住 `api.vercel.com`，也沒有 `DATABASE_URL`）。

## 1. 安全

| 項目 | 結果 | 證據 |
| --- | --- | --- |
| 未設 `ADMIN_PASSWORD` 時無法用密碼登入 | PASS（程式） | `admin-access.ts` 無預設值；`/api/admin/access` 回 503 |
| 錯誤密碼被拒 | PASS | 瀏覽器：「密碼不正確，請再試一次。」 |
| 正式環境缺 `AUTH_SECRET` 拒絕簽發 | PASS（程式） | `server/auth/secrets.ts` |
| 空白白名單不再全放行 | PASS（程式） | `auth.ts` `canSignIn` |
| `/seats`、`/admin` 不再公開 | PASS | 轉址到 `/console*`，未登入顯示閘門 |
| `GET /api/seats/[weekId]` 需幹部 | PASS（程式） | route 先檢查 `hasLeaderAccess` |
| 健康檢查不洩漏資料庫主機 | PASS（程式） | 未登入只回 ok/status |
| CSV 防公式注入 | PASS（程式） | 投票與出席 CSV 前綴 `'` |

## 2. 會員登入

| 項目 | 結果 | 證據 |
| --- | --- | --- |
| 未登入進 `/me` 導到 `/login` | PASS | `/me -> /login?next=/me` |
| 幹部產生一次性登入連結，會員按「確認登入」進 `/me` | PASS | 瀏覽器：黃子宜登入後看到自己的座位「副主席」 |
| 同一連結第二次使用被拒 | PASS | 「這個登入連結已經用過了。」 |
| LINE 登入第一次綁定姓名 | MANUAL_REQUIRED | 需要 LINE channel；設定 `AUTH_LINE_ID/SECRET` 後用手機登入一次，確認綁定後再登入直接進 `/me` |
| 幹部解除 LINE 綁定 | MANUAL_REQUIRED | 同上，在會員檔案按「解除 LINE 綁定」 |
| 有現任幹部任期的會員用 LINE/Google 進 `/console` | MANUAL_REQUIRED | 需要真實 OAuth |

## 3. 舊資料在新網站操作

| 項目 | 結果 | 證據 |
| --- | --- | --- |
| 舊網址轉址 | PASS | `/seats`→`/console/events`、`/seats/2026-10-01`→`…/seating/grid`、`/admin/events/x`→`/console/events/x`、`/pre-leave`→`/leave`、`/w/x`→`/e/x` |
| 中控首頁顯示格狀座位表與出席狀態 | PASS | 截圖 hub |
| 在中控編輯並儲存格狀座位表 | PASS | 「已儲存到資料庫：第 2 版」 |
| 從最近一場例會建立新一週座位表 | PASS | 2026-10-08 由 10-01 複製 |
| 列印讀資料庫、日期正確 | PASS | `/print/events/2026-10-01` 標題「115/10/01 座位表」；出席報表可列印 |
| 公開頁找座位（格狀） | PASS | `/e/2026-10-01?q=古又帆` →「古又帆 的座位：主席」 |
| 會員今日頁顯示自己的座位 | PASS | 截圖 me |

## 4. AI 排座 API

| 項目 | 結果 | 證據 |
| --- | --- | --- |
| `/console/ai` 建立金鑰，只顯示一次 | PASS | 截圖 ai |
| 無金鑰 401 | PASS | `GET /api/v1/ai/events` → 401 |
| 讀取排座資料（規則、39 位會員、出席、grid v1） | PASS | `GET …/2026-10-08/seating` |
| 驗證不儲存 | PASS | `POST …/validate` → ok, score 82 |
| 儲存為新版本 | PASS | `PUT …/seating` → version 2 |
| 舊版本覆寫被擋 | PASS | 409「座位表已經被更新為第 2 版」 |
| 同一人排兩個位置被擋 | PASS | 422 |
| MCP initialize / tools/list / tools/call | PASS | 5 個工具；`get_seating_context` 回 grid.version 2 |
| 從 Claude Code 實際接上 | MANUAL_REQUIRED | 部署後在 `/console/ai` 複製指令執行 |

## 5. 驗證指令

```bash
pnpm exec tsc --noEmit -p .
pnpm run lint
pnpm run build
git diff --check
pnpm run release:preflight   # 需要 DATABASE_URL
```
