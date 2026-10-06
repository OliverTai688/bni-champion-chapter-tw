# ARC-007: 商會工具箱實作慣例

Status: Active
Date: 2026-10-06
Related: ARC-006, PLN-005

本文是實作 PLN-005 頁面時的共同規則。新頁面與既有頁面（`/seats`、`/admin`、`/w`、`/pre-leave`）並存，**不得改動或刪除既有頁面與 API**。

## 1. 技術基線

- Next.js 16 App Router、React 19、Prisma 6（MongoDB）、Tailwind v3、`lucide-react`。
- Next 16 與舊版不同：`params`、`searchParams`、`cookies()` 都是 Promise，要 `await`。寫之前讀 `node_modules/next/dist/docs/01-app/` 相關章節。
- 頁面預設是 Server Component；只有互動元件加 `'use client'`。
- 每個讀資料庫的 `page.tsx` 不需自己宣告 dynamic：三個區域的 layout 已經 `export const dynamic = 'force-dynamic'`。
- 寫入一律用 Server Action（`actions.ts`，檔案頂端 `'use server'`），結尾 `revalidatePath(...)`。大螢幕輪詢等需要 JSON 的地方才用 Route Handler。

## 2. 三個區域與目錄

```txt
src/app/(public)/…            公開：/e/[eventKey]/*、/leave、/login      layout 已有 .tbx 外層
src/app/(member)/me/…         會員：未選身份會被導去 /login              layout 已有底部分頁
src/app/(console)/console/…   領導團隊：未授權顯示密碼閘門                layout 已有左側工具列
src/app/(console)/console/events/[eventKey]/…   單場活動，layout 已有活動標頭與分頁
```

- `eventKey` = `MeetingSession.weekId`（週會是日期字串）。用 `getEventByKey(eventKey)` 取得活動；公開頁用 `getPublicEventByKey`（未發布回 `null` → `notFound()`）。
- 連結一律用 `encodeURIComponent(event.weekId)`。

## 3. 共用模組（只能使用，不要修改）

| 模組 | 內容 |
| --- | --- |
| `@/server/db/prisma` | `prisma` |
| `@/server/tbx/viewer` | `getViewer()`、`requireLeader()`、`requireMember()`、`isLeader()`、`MEMBER_COOKIE`、`createMemberToken()` |
| `@/server/tbx/events` | `getEventByKey`、`getPublicEventByKey`、`isEventPublic`、`listEvents`、`getFocusEvent`、`listUpcomingEvents`、`buildEventKey` |
| `@/server/tbx/participation` | `getAttendance(sessionId)` → `{ rows, summary }`、`ensureParticipations`、`registerIntent`、`checkIn`、`checkInSubstitute`、`undoCheckIn`、`setParticipationStatus`、`addGuest`、`updateGuest`、`removeGuest`、`summarize`、`presentPeople(rows)` |
| `@/server/tbx/members` | `listChapterMembers()`、`syncMemberDirectory()`、`normalizeMemberName()` |
| `@/server/tbx/log` | `logOperation({ sessionId, actorRole, actorName, action, targetType, targetId, metadata })` |
| `@/server/tbx/action` | `ok()`、`fail(error)`、`text(formData,key)`、`optionalText`、`intValue`、`isObjectId`、型別 `ActionState` |
| `@/lib/tbx/labels` | `STATUS_LABEL`、`LEADERSHIP_ROLES`、`eventTypeLabel`、`formatEventDate`、`formatDateTime`、`formatTime`、`taipeiDateKey` |
| `@/components/tbx/ui` | `PageHeader`、`Card`、`StatusChip`、`Empty`、`Stat`、`PlannedPage` |
| `@/components/tbx/client` | `ActionForm`、`SubmitButton`、`DialogButton`、`ConfirmSubmit`、`NavLink`、`AutoRefresh` |

需要共用模組沒有的功能時：在自己的模組目錄內新增檔案（例如 `src/server/tbx/gifts.ts`、`src/components/tbx/gifts/*`），不要改上表的檔案；真的必須改就在回報中說明。

**不要修改**：`prisma/schema.prisma`、`tailwind.config.js`、`src/app/toolbox.css`、各區 `layout.tsx`、`package.json`。資料模型已經備齊（見 schema 尾端「Chamber toolbox」區塊）。

## 4. Server Action 寫法

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/server/db/prisma';
import { fail, ok, text, type ActionState } from '@/server/tbx/action';
import { logOperation } from '@/server/tbx/log';
import { requireLeader } from '@/server/tbx/viewer';

export async function createGiftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();          // 每個領導團隊 action 的第一行
    const name = text(formData, 'name');
    if (!name) throw new Error('請填寫禮物名稱。');
    // … prisma 寫入 …
    await logOperation({ actorRole: 'admin', actorName: viewer.leaderName, action: 'gift_created', targetType: 'Gift' });
    revalidatePath('/console/events');
    return ok('已新增禮物');
  } catch (error) {
    return fail(error);
  }
}
```

- 領導團隊的 action 一律先 `requireLeader()`；會員的 action 用 `requireMember()`，而且只能改自己的資料。
- 公開頁的 action 不能信任前端傳來的身份，只接受該頁允許的最小操作。
- 所有 id 參數先用 `isObjectId` 檢查。
- 錯誤訊息用繁體中文，說明發生什麼事與怎麼修正。
- 所有寫入都呼叫 `logOperation`（`actorRole`：`admin`=領導團隊、`member`、`system`）。

表單：

```tsx
<ActionForm action={createGiftAction} className="flex flex-col gap-3" resetOnSuccess>
  <input type="hidden" name="eventKey" value={event.weekId} />
  <label className="tb-label" htmlFor="gift-name">禮物名稱<input id="gift-name" name="name" className="tb-input" required /></label>
  <SubmitButton>新增禮物</SubmitButton>
</ActionForm>
```

- 編輯用 `DialogButton`（`children` 是 `(close) => ReactNode`，表單 `onSuccess={close}`）。`DialogButton` 是 Client Component，所以對話框內容要放在你自己的 Client Component 裡，Server Action 用 import 的方式帶入。
- 刪除用 `<form action={...}><ConfirmSubmit>刪除</ConfirmSubmit></form>` 兩段式確認，不用 `confirm()`。
- 每個表單控制項要有穩定的 `id` 與對應的 `<label>`。

## 5. 視覺

- 外層已有 `.tbx`（深色、金色只用於「需要你按」與「待處理」）。不要再加自己的背景色主題。
- 顏色用 Tailwind token：`bg-tb-bg`、`bg-tb-surf`、`bg-tb-surf2`、`text-tb-text`、`text-tb-muted`、`text-tb-faint`、`border-tb-line`、`text-tb-gold`、`bg-tb-gold`、`text-tb-gold-ink`、`text-tb-ok`、`text-tb-late`、`text-tb-bad`、`text-tb-sub`、`text-tb-guest`，以及 `bg-tb-*-soft`。這些 token 是 CSS 變數，**不支援 `/50` 這類透明度寫法**。
- 元件 class：`tb-btn`（搭配 `tb-btn-gold`、`tb-btn-outline`、`tb-btn-quiet`、`tb-btn-danger`、`tb-btn-sm`、`tb-btn-lg`）、`tb-card`、`tb-card-head`、`tb-card-body`、`tb-banner`（`-ok`、`-bad`）、`tb-label`、`tb-input`、`tb-select`、`tb-textarea`、`tb-chip`（`-present`、`-late`、`-absent`、`-substitute`、`-guest`、`-gold`、`-plain`）、`tb-table-wrap` + `tb-table`（數字欄加 `num`）、`tb-tabs` + `tb-tab`、`tb-eyebrow`、`tb-mono`、`tb-num`（大數字）、`tb-plan-grid`（平面圖底紋）。
- 每頁結構：`<div className="flex flex-col gap-5">` → `PageHeader` → 內容。單場活動頁因為 layout 已有活動標頭，直接放內容，不要再放大標題。
- 版面用 flex / grid + `gap`。桌面頁在 400px 寬也要能用（表格放 `tb-table-wrap`，欄位改單欄）。會員與公開頁以手機為主（最大寬 520px），觸控目標至少 44px。
- 圖示用 `lucide-react`，不用 emoji。
- 空狀態用 `Empty`，要告訴使用者下一步做什麼。
- 文案：繁體中文、用使用者的說法（「禮物」「代理人」），按鈕寫出會發生什麼事（「新增禮物」「開抽」）。不寫破折號插入語、不寫「不是 X 而是 Y」。

## 6. 資料與隱私

- 公開頁只輸出需要的欄位；會員電話、Email、備註不得出現在公開頁或傳給公開頁的 Client Component。
- 會員區只顯示該會員自己的燈號與紀錄。
- 範例或測試資料只寫本機開發資料庫。

## 7. 驗證（每個模組完成前）

```bash
pnpm exec tsc --noEmit -p .
pnpm exec eslint <你新增或修改的檔案>
```

- **不要執行** `pnpm build`、`pnpm dev`、`prisma db push`、`prisma generate`，也不要改 `.env`。這些由整合階段統一處理。
- 需要用腳本檢查資料時，一律加上本機連線：
  `DATABASE_URL='mongodb://127.0.0.1:27027/take-seat-dev?replicaSet=rs0&directConnection=true'`。
  **絕對不要連 `.env` 裡的正式資料庫。**
- 不要 `git commit`、不要切換分支。
