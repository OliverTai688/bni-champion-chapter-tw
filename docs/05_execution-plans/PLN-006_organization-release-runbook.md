# PLN-006: 上線到分會的執行手冊

Status: Ready (等待正式環境存取)
Date: 2026-10-06
Related: ACC-004、ACC-005、ARC-006 §3

## 1. 這次補上的缺口

| 缺口 | 處理 |
| --- | --- |
| 後台密碼寫死的預設值 | 移除。未設 `ADMIN_PASSWORD` 時密碼登入關閉；cookie 12 小時到期，改密碼即全部登出 |
| `AUTH_SECRET` 預設值 | 移除。正式環境沒設就拒絕簽發任何 cookie |
| Google 白名單空白時全放行 | 改為只放行：擁有者、`AUTH_ALLOWED_EMAILS`/`AUTH_ALLOWED_DOMAIN`、Email 已登記的在籍會員 |
| 會員身份未驗證 | 移除「選姓名」。改為 LINE 登入（第一次自選姓名綁定）、Google（比對會員 Email）、幹部產生的一次性登入連結 |
| 幹部權限 | 後台密碼、白名單 Google，或「已登入會員 + 現任幹部任期」（Google 或 LINE 皆可） |
| `/seats` 等舊頁面 | 全部轉址到新網站；舊網址（含已印出的 `/w/` QR code）照常可用 |
| 格狀排座只能在舊頁面編輯 | 移到 `/console/events/[key]/seating/grid`，含請假／代理提醒、從上週或範本建立、存成範本 |
| 列印可能印到別場日期 | `/print/events/[key]` 直接讀資料庫中該場已儲存的版本 |
| 投票 CSV 沒有好話、只認密碼登入 | 加入好話欄（匿名）；所有幹部登入方式皆可下載；CSV 防公式注入 |
| 重複的 `/admin/api` 樹 | 刪除，連同不再使用的舊公開 API |
| 健康檢查洩漏資料庫主機 | 未登入只回 ok/狀態 |
| AI | `/console/ai` 建 API 金鑰；REST `/api/v1/ai/*` 與 MCP `/api/mcp` 可讀規則、名冊、出席並寫回座位表 |

## 2. Vercel 環境變數

| 變數 | 必要 | 說明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | 既有 |
| `AUTH_SECRET` | 是 | 既有；沒有就無法登入 |
| `AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET` | 是 | 既有 |
| `ADMIN_PASSWORD` | 建議 | 幹部共用密碼。請設一組新的，舊的寫死密碼已失效 |
| `AUTH_ALLOWED_EMAILS` | 建議 | 一定要能進後台的 Google 帳號（逗號分隔） |
| `AUTH_LINE_ID`、`AUTH_LINE_SECRET` | 要用 LINE 登入時 | LINE Developers 建立 LINE Login channel；Callback URL：`https://<網域>/api/auth/callback/line` |

## 3. 上線步驟

```bash
# 1. 檢查（唯讀）
DATABASE_URL=<正式> AUTH_SECRET=... pnpm run release:preflight

# 2. 推資料模型（只新增 collection 與 index，不改既有資料）
DATABASE_URL=<正式> pnpm run prisma:push

# 3. 部署
vercel deploy --prod   # 或 merge 到 Vercel 綁定的分支
```

部署後：

1. 用 `ADMIN_PASSWORD` 或白名單 Google 進 `/console`。
2. `/console/members` 按「從靜態名冊同步」（只需一次）。
3. `/console/settings/roles` 加上本屆幹部任期；之後幹部用自己的 LINE／Google 登入就有後台權限。
4. 在群組公告 `/login`：會員用 LINE 登入，第一次選自己的姓名。
5. `/console/ai` 建一把 API 金鑰，依頁面說明接上 Claude。
6. 再跑一次 `release:preflight` 確認 collections 與人數。

## 4. 回復方式

- 程式：Vercel 上把 Production 指回前一次部署（Instant Rollback）。
- 資料：這次只新增 collection（`MemberLoginLink`、`ApiToken`、`MemberIdentity`），舊程式不會讀到它們，不需要回復資料。
- AI 寫錯座位：每次寫入都是新版本（`SeatMapRevision`），在格狀排座頁手動調整後儲存即可；操作紀錄可查 `ai_seating_saved`。

## 5. 還沒有做的事

- 投票仍是「一台裝置一票」。會員可以登入後，可以改成「一位會員一票」，需要分會決定（PLN-005 §9）。
- 公開簽到頁仍不驗證身份（活動當天限定），和舊做法相同。
- 綠燈計分規則仍是示意值，需要分會現行計分表。
- PALMS 對不上的 6 個姓名需要人工確認。
- `/me/ai`、人脈與產業鏈、一對一追蹤仍是規劃中頁面。
