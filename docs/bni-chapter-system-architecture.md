# BNI 長冠軍分會內部系統架構草案

## 系統定位

本系統以 BNI 長冠軍分會的內部營運為核心，第一個正式模組是每週例會排座。後續會擴充為會員管理、商務關係、每週例會品質管理與活動管理的全端系統。

使用者分為兩種：

- 內部成員：查看例會資訊、座位、活動、商務關係與個人相關資料。
- 管理成員：每年由內部成員中選出，負責維護例會資料、座位安排、會員角色、活動與品質指標。

## 模組版圖

| 模組 | 主要責任 | 目前狀態 |
| --- | --- | --- |
| 排座模組 | 每週座位安排、規則檢查、列印與匯出 | 第一優先正式化 |
| 會員模組 | 成員基本資料、年度管理職、角色與出席狀態 | 待設計 |
| 商務關係模組 | 產業服務鍊、引薦、合作關係、目標客戶 | 待設計 |
| 例會品質模組 | 每週例會流程、品質檢核、KPI 與回顧 | 待設計 |
| 活動管理模組 | 活動、工作分配、報名、邀賓與追蹤 | 待設計 |

## 外部研究校準

BNI Connect 的公開支援文件把 chapter operations 拆成多個穩定流程，這些流程可作為後續系統模組的資料邊界：

- Visitor process 涵蓋邀請、登記、出席標記、PALMS credit 與追蹤，且會通知 President、Vice President、Secretary Treasurer、Visitor Hosts 與 Director Consultant。
- Chapter roster report 包含目前會員、leadership team、聯絡資料，以及近 90 天的 PALMS 活動快照。
- Roster 活動欄位包含 G（given referrals）、R（received referrals）、V（visitors）、1-2-1、late、absence，可作為例會品質與會員關係模組的指標來源。

因此後續不應只做單一「活動表單」或「會員表單」，而應把資料域拆成：

1. 會員主檔與年度管理職。
2. 來賓流程與邀請/出席追蹤。
3. 商務關係：引薦、1-2-1、產業服務鍊。
4. 例會品質：出席、遲到、缺席、PALMS 指標、每週回顧。
5. 活動管理：活動資料、邀請、工作分配、後續追蹤。

## 排座模組邊界

排座模組不直接負責會員總資料，也不直接判斷年度管理成員。它接收：

- 當週例會資料：日期、週次標題、分會名稱。
- 當週角色：主持團、音控、值日生。
- 當週名單：來賓、執事、一般成員、代理人、英雄榜。
- 產業服務鍊：A/B/C/D 組與成員對應。

輸出：

- 可互動座位工作台。
- 規則檢查結果。
- 本機草稿。
- CSV 匯出。
- PDF/列印頁。

## 資料儲存演進

目前採用本機 repository：

- `localSeatingWorkspaceRepository`
- 儲存位置：瀏覽器 `localStorage`
- key：`bni-long-champion:seating-workspace:{weekId}`

未來後端 repository 可保持相同介面：

```ts
interface SeatingWorkspaceRepository {
  load(weekId: string): SeatingWorkspaceState | null;
  save(state: SeatingWorkspaceState): void;
  clear(weekId: string): void;
}
```

Supabase/Prisma 擴充方向：

- `members`：會員主檔。
- `management_terms`：年度管理成員任期。
- `meeting_weeks`：每週例會。
- `seating_workspaces`：排座工作區快照。
- `industry_chains`：產業服務鍊。
- `events`：活動。
- `meeting_quality_reviews`：例會品質紀錄。

## 設計原則

1. 每個模組先有清楚 domain model，再接 UI。
2. 前端互動狀態不可直接綁死未來資料庫形狀。
3. 每週例會資料以 `weekId` 作為主要切換點。
4. 管理成員操作需保留草稿、匯出與人工確認空間。
5. 規則引擎只提示風險，不取代管理者的最終判斷。
