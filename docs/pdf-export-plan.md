# PDF 匯出方案規劃

## 問題診斷

現有 `html2canvas + jsPDF` 做法的根本缺陷：

| 問題 | 原因 |
|------|------|
| 小徽章文字糊掉 | html2canvas 輸出點陣圖，9 px 文字壓縮到 A4 後僅 ~4 pt |
| 卡片背景洗白 | `backdrop-filter: blur()` 在 html2canvas 完全不支援 |
| CSS 變數/Tailwind 異色 | 克隆 DOM 後計算樣式有時未正確繼承 |

## 方案比較

| 方案 | 向量輸出 | 中文支援 | 複雜度 | 額外依賴 |
|------|---------|---------|--------|---------|
| html2canvas + jsPDF（現況） | ❌ 點陣 | ⚠️ 粗糙 | 低 | html2canvas, jspdf |
| @react-pdf/renderer | ✅ | ⚠️ 需嵌入字型 | 高（整個重寫） | react-pdf + TTF 字型 |
| Puppeteer API route | ✅ | ✅ | 中（需後端） | puppeteer + chromium ~130 MB |
| **瀏覽器原生列印（選定）** | ✅ | ✅ | 低 | 零 |

## 選定方案：專屬列印路由 + `window.print()`

瀏覽器本身將「列印 → 儲存為 PDF」輸出為真正向量 PDF，字體由作業系統渲染——中文、英文、小字體皆完美清晰。

### 核心思路

1. 建立 `/seats/print` Client Route：無 glassmorphism、純實心色，專為列印設計。
2. 「匯出 PDF」按鈕：將當前座位狀態寫入 `sessionStorage`，再以 `window.open('/seats/print')` 開新分頁。
3. Print 頁面載入後自動呼叫 `window.print()`，使用者選「儲存為 PDF」即可。

### 步驟

#### Step 1 — 建立 `/seats/print/page.tsx`

- `'use client'`，`useEffect` 讀取 `sessionStorage` 取得 `{ topRoles, items, heroes }`
- 以純實心色重繪座位表（不使用 `backdrop-filter`、`rgba` 透明背景）
- `@page { size: A4 portrait; margin: 1cm; }` 放入 `<style>` tag
- 載入後 `setTimeout(() => window.print(), 400)` 讓 DOM 穩定後觸發列印

#### Step 2 — 列印頁樣式規則

```css
@page { size: A4 portrait; margin: 1cm; }
body { font-family: 'Noto Sans TC', sans-serif; background: #fff; }

/* 英雄榜 */
.print-hero  { border: 2px solid #f59e0b; background: #fefce8; border-radius: 16px; padding: 12px 16px; margin-bottom: 16px; }

/* 主持團 5 格 */
.print-roles { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 20px; }
.print-role-card { border: 2px solid; border-radius: 12px; text-align: center; padding: 8px 4px; }

/* 座位格 */
.print-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.print-seat {
  position: relative;
  border: 1.5px solid #d1d5db;
  border-radius: 12px;
  padding: 10px 8px;
  text-align: center;
  min-height: 56px;
  display: flex; align-items: center; justify-content: center;
}

/* 類別顏色（實心，不透明） */
.print-seat.guest  { background: #eef2ff; border-color: #818cf8; }
.print-seat.host   { background: #fffbeb; border-color: #fbbf24; }
.print-seat.proxy  { background: #f3f4f6; border-color: #9ca3af; }
.print-seat.sound  { background: #f0f9ff; border-color: #38bdf8; }
.print-seat.duty   { background: #f0fdf4; border-color: #4ade80; }
.print-seat.empty  { border-style: dashed; opacity: 0.3; }

/* 角落徽章 */
.print-badge {
  position: absolute; top: -8px; right: -8px;
  font-size: 11px; font-weight: 900;
  color: #fff; border-radius: 99px;
  padding: 2px 7px; line-height: 1.4;
}
.print-badge.guest-badge { background: #6366f1; }
.print-badge.host-badge  { background: #f59e0b; }
.print-badge.proxy-badge { background: #6b7280; }
.print-badge.sound-badge { background: #0ea5e9; }
.print-badge.duty-badge  { background: #22c55e; }

/* 產業鍊標籤 */
.print-chain-tags { display: flex; gap: 3px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }
.print-chain-tag  { font-size: 10px; font-weight: 900; padding: 1px 5px; border-radius: 3px; }
```

#### Step 3 — 更新 `SeatingArranger.tsx`

將「匯出 PDF」按鈕的 `onClick` 改為：

```tsx
const handleExportPDF = () => {
  sessionStorage.setItem('print-state', JSON.stringify({ topRoles, items, heroes, industryChains }));
  window.open('/seats/print', '_blank', 'width=900,height=1100');
};
```

移除 `html2canvas`、`jspdf` 依賴（可以保留 package 以免 lock file 衝突，但不再使用）。

#### Step 4 — 清理

- 移除 `SeatingArranger.tsx` 的 `handleExportPDF` async 函式（html2canvas 版本）
- `isExporting` state 可一併移除
- 保留 `@media print` 的 `.no-print` CSS（browser print 仍會用到）

### 預期結果

- 文字向量輸出，任何縮放皆清晰
- 徽章文字（賓1、執·賓1、音控、值日）11 px 在 A4 上清晰可讀
- 無 backdrop-filter 問題
- 中文完美渲染
- 零額外依賴
