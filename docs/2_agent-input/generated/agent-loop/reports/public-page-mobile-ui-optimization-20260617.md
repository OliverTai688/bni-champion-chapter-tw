# 公開頁面行動裝置與介面優化 — 20260617

## 目標

優化公開顯示頁面（`/w/[slug]` 與 `/w/[slug]/vote`），支援手機操作，並改善介面設計。

## 問題分析（優化前）

1. **座位圖在手機上不可用（最關鍵）**：`public-seat-map.tsx` 使用
   `gridTemplateColumns: repeat(${columns}, minmax(0,1fr))`。`columns` 可達 6–10，
   手機寬度下每格被壓縮到約 40px，內容截斷且難以點擊。
2. 投票流程在手機上需「選座位 → 往上捲回送出」，操作不連貫。
3. `publicStatus` 直接顯示英文 enum（draft/live…），非中文。
4. 出席訊息為行內文字會推擠版面；缺少即時更新的視覺提示。
5. 觸控目標偏小、間距偏緊。

## 變更檔案

- `src/components/public-seat-map.tsx`
  - 座位網格改為 `minmax(76px, 1fr)` 並包進 `overflow-x-auto` 容器：寬螢幕填滿、
    窄螢幕保留空間排列並可水平捲動，不再壓縮成不可讀。
  - 新增圖例（已抵達／已安排／空位）與手機「左右滑動」提示。
  - 加大座位卡與抵達按鈕觸控區（`min-h-[92px]`、按鈕 `py-2`、`active:scale`）。
- `src/components/public-attendance-live-panel.tsx`
  - 新增 Live 脈動指示點，標示 5 秒輪詢即時更新。
  - 新增「整體報到率」進度條；已抵達統計卡以 emerald 強調。
  - 操作訊息改為固定底部 toast（3.5 秒自動消失，錯誤保留），不再推擠版面。
  - 行動優先間距（`gap`/`mt` 在 sm 斷點調整）。
- `src/app/w/[slug]/page.tsx`
  - `publicStatus` 以中文對照表呈現；`live` 狀態顯示綠點徽章。
  - Hero 改為手機優先：標題 `text-3xl→6xl` 漸進、按鈕在手機全寬堆疊。
- `src/components/public-vote-client.tsx`
  - 新增手機固定底部送出列（顯示目前選擇 + 送出），免來回捲動。
  - 桌機維持側欄送出區塊（`lg:block`）。
  - 代碼輸入 `text-base`(避免 iOS 放大)、`autoCapitalize`、加大觸控。

## 契約 / 資料邊界

- 未變更任何 DTO、API 或 repository。純前端 UI/RWD 調整。
- 公開頁仍只顯示匿名統計與 `PublicSeatDTO`，未引入任何私密欄位。

## 驗證

```bash
pnpm run lint   # pass
pnpm run build  # pass（/w/[slug]、/w/[slug]/vote 正常輸出）
git diff --check # 無空白錯誤
```

## 待人工確認（MANUAL_REQUIRED）

- 於實機/手機瀏覽器檢查 `/w/[slug]`：座位圖可左右滑動、抵達按鈕可點、toast 出現。
- 於手機檢查 `/w/[slug]/vote`：點座位後底部送出列即時更新並可送出。

## 建議下一步

- SEAT-IA-006 列印路由清理（目前唯一未完成的 SEAT-IA 批次）。
- 視需要為座位圖加入候選人得票即時顯示（若 `resultVisibility` 允許）。
