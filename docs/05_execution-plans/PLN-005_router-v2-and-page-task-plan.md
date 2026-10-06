# PLN-005: Router v2 與頁面任務計畫

Status: Implemented (CRUD), awaiting acceptance — see ACC-004
Date: 2026-10-06
Depends on: ARC-006（SSOT 與分層）、PLN-004（資料與路由搬遷批次）
Supersedes: ARC-006 §7 的路由樹（本文為最新版）

## 1. 這份文件決定什麼

1. 三個介面區域與各自的外殼。
2. Router v2：每個頁面一個 ID、一條路由。
3. 頁面任務清單：**一個頁面一個任務**，每個任務先做 HTML 提案，確認後才進設計定稿。
4. 三個工具的需求規格：綠燈會員（匯入 PALMS）、禮物抽獎、長冠軍之星。

## 2. 三個區域，一個系統

| 區域 | 路由前綴 | 使用者 | 主要裝置 | 外殼 |
| --- | --- | --- | --- | --- |
| 公開 | `/e/[eventKey]/*`、`/leave` | 來賓、代理人、未登入者 | 手機、大螢幕 | 無導覽，單一任務頁 |
| 會員 | `/me/*` | 所有會員（含幹部本人） | 手機 | 底部四個分頁：今日／活動／AI／我的 |
| 領導團隊 | `/console/*` | 當屆幹部 | 桌面、平板；現場用手機 | 左側工具列＋頂部活動列＋右側 AI 面板 |

規則：

- 同一個登入。幹部是「會員 + 職位任期」，`/console` 入口依任期自動出現與消失。
- 同一份資料。三區讀寫同一組 `Participation`、`Gift`、`Poll`、`Scorecard`。
- 同一個 AI。權限在資料層，依登入者身份決定看得到什麼。
- 現場會走動的職位（來賓接待、活動協調）用手機：`/console` 的簽到、來賓、抽獎頁必須有手機版。

## 3. Router v2

```txt
src/app/
├─ (public)/
│  ├─ e/[eventKey]/page.tsx                 PUB-01 活動公開頁
│  ├─ e/[eventKey]/check-in/page.tsx        PUB-02 簽到
│  ├─ e/[eventKey]/vote/page.tsx            PUB-03 長冠軍之星投票
│  ├─ e/[eventKey]/lottery/page.tsx         PUB-04 抽獎前台（大螢幕）
│  ├─ leave/page.tsx                        PUB-05 請假／代理登記
│  └─ login/page.tsx                        PUB-06 登入
│
├─ (member)/me/
│  ├─ page.tsx                              MEM-01 今日
│  ├─ events/page.tsx                       MEM-02 活動與請假
│  ├─ ai/page.tsx                           MEM-03 商會 AI
│  ├─ scorecard/page.tsx                    MEM-04 我的燈號（時序）
│  ├─ profile/page.tsx                      MEM-05 我的商務檔案（規劃）
│  └─ one-to-ones/page.tsx                  MEM-06 一對一（規劃）
│
├─ (console)/console/
│  ├─ layout.tsx                            CON-00 外殼
│  ├─ page.tsx                              CON-01 首頁（例會日／平日）
│  ├─ events/page.tsx                       CON-02 活動列表
│  ├─ events/[eventKey]/page.tsx            CON-03 例會中控
│  ├─ events/[eventKey]/attendance/page.tsx CON-04 出席與代理（含手機現場版）
│  ├─ events/[eventKey]/seating/page.tsx    CON-05 排座編輯器
│  ├─ events/[eventKey]/polls/page.tsx      CON-06 長冠軍之星管理
│  ├─ events/[eventKey]/gifts/page.tsx      CON-07 禮物管理
│  ├─ events/[eventKey]/exports/page.tsx    CON-08 匯出
│  ├─ venues/page.tsx                       CON-09 場地庫
│  ├─ venues/[venueId]/page.tsx             CON-10 場地配置編輯
│  ├─ scorecard/page.tsx                    CON-11 綠燈會員總覽（時序）
│  ├─ scorecard/import/page.tsx             CON-12 匯入 PALMS
│  ├─ members/page.tsx                      CON-13 會員名冊
│  ├─ members/[memberId]/page.tsx           CON-14 會員檔案
│  ├─ gifts/page.tsx                        CON-15 禮物總帳（跨活動）
│  ├─ ai/page.tsx                           CON-16 AI 工作區
│  ├─ settings/roles/page.tsx               CON-17 職位與任期
│  ├─ settings/audit/page.tsx               CON-18 操作紀錄
│  ├─ network/page.tsx                      CON-19 人脈與產業鏈（規劃）
│  └─ one-to-ones/page.tsx                  CON-20 一對一追蹤（規劃）
│
└─ api/
   ├─ v1/…                                  由 capability registry 產生
   ├─ public/v1/events/[eventKey]/…         公開 DTO、簽到、投票、抽獎前台
   └─ mcp/route.ts
```

與 ARC-006 §7 的差異：

- 抽獎拆成後台 `…/gifts`（管理禮物）與前台 `/e/…/lottery`（大螢幕抽）。
- 新增 `/console/scorecard/import`、`/console/venues`、`/console/settings/roles`。
- 投票維持公開路由（掃 QR 即可投），資格由簽到憑證決定，不強制登入。

舊路由對照與轉址沿用 PLN-004 MIG-005。

## 4. 頁面任務流程

每個任務只處理一個頁面：

```txt
① HTML 提案     canvas 上一組畫板：主要畫面 + 關鍵狀態（空、進行中、完成、錯誤）
② 回饋          使用者確認方向或指出要改的地方
③ 設計定稿      補齊所有狀態、手機／桌面、互動細節、元件與資料欄位對照
④ 實作          排入 PLN-004 對應批次
```

提案階段用範例資料，不放真實會員資料。

## 5. 頁面任務清單

> 2026-10-06 更新：使用者決定跳過逐頁提案，直接實作。下表所有頁面（規劃中者除外）已在分支 `feat/chamber-toolbox` 實作並接上資料庫，驗收清單見 `docs/08_acceptance-and-qa/ACC-004_chamber-toolbox-crud-acceptance.md`。下表的「狀態」欄是當時的提案進度，保留作為紀錄。

狀態：`已提案` = canvas 第二輪已有畫板；`待提案`；`沿用` = 現有頁面搬家即可。

### 第一波：這次指定的三個工具

| 任務 | 頁面 | 路由 | 裝置 | 狀態 |
| --- | --- | --- | --- | --- |
| T01 | PUB-03 長冠軍之星投票 | `/e/[eventKey]/vote` | 手機 | 待提案 |
| T02 | CON-06 長冠軍之星管理 | `…/polls` | 桌面 | 待提案 |
| T03 | CON-07 禮物管理 | `…/gifts` | 桌面、手機 | 待提案 |
| T04 | PUB-04 抽獎前台 | `/e/[eventKey]/lottery` | 大螢幕 | 待提案 |
| T05 | CON-12 匯入 PALMS | `/console/scorecard/import` | 桌面 | 待提案 |
| T06 | CON-11 綠燈會員總覽 | `/console/scorecard` | 桌面 | 待提案 |
| T07 | MEM-04 我的燈號 | `/me/scorecard` | 手機 | 已提案（需加時序） |

### 第二波：外殼與例會當天

| 任務 | 頁面 | 路由 | 裝置 | 狀態 |
| --- | --- | --- | --- | --- |
| T08 | CON-00 外殼 + CON-01 首頁 | `/console` | 桌面 | 已提案（外殼）；首頁待提案 |
| T09 | CON-03 例會中控 | `/console/events/[eventKey]` | 桌面 | 已提案 |
| T10 | CON-04 出席與代理 | `…/attendance` | 桌面、手機現場版 | 待提案 |
| T11 | PUB-02 簽到 | `/e/[eventKey]/check-in` | 手機 | 待提案 |
| T12 | MEM-01 今日 | `/me` | 手機 | 已提案（需加中控入口） |
| T13 | MEM-03 商會 AI | `/me/ai` | 手機 | 已提案 |
| T14 | PUB-05 請假／代理 | `/leave` | 手機 | 沿用 `/pre-leave`，需重新設計 |

### 第三波：場地與排座

| 任務 | 頁面 | 路由 | 裝置 | 狀態 |
| --- | --- | --- | --- | --- |
| T15 | CON-09 場地庫 | `/console/venues` | 桌面 | 已提案 |
| T16 | CON-10 場地配置編輯 | `/console/venues/[venueId]` | 桌面 | 待提案 |
| T17 | CON-05 排座編輯器 | `…/seating` | 桌面 | 已提案 |
| T18 | PUB-01 活動公開頁 | `/e/[eventKey]` | 手機 | 沿用 `/w/[slug]`，需改為空間平面圖 |

### 第四波：名冊、設定、其餘

| 任務 | 頁面 | 路由 | 狀態 |
| --- | --- | --- | --- |
| T19 | CON-02 活動列表 | `/console/events` | 沿用 `/seats` |
| T20 | CON-13、CON-14 會員名冊與檔案 | `/console/members/*` | 待提案 |
| T21 | CON-17 職位與任期 | `/console/settings/roles` | 待提案 |
| T22 | CON-15 禮物總帳 | `/console/gifts` | 待提案 |
| T23 | CON-08 匯出、CON-18 操作紀錄 | — | 沿用 |
| T24 | MEM-02 活動與請假、PUB-06 登入 | — | 待提案 |
| T25 | CON-16 AI 工作區 | `/console/ai` | 待提案 |
| — | MEM-05、MEM-06、CON-19、CON-20 | — | 規劃中，暫不排任務 |

## 6. 工具規格：長冠軍之星（T01、T02）

目標：會員在例會現場用手機，三步內投完票。

投票頁（PUB-03）：

1. 開啟後直接是候選人牆：已到場會員的姓名大按鈕，依座位區或姓名排序，上方有搜尋。
2. 點一位會員即選定，底部出現「投給 ○○○」。
3. 選填一句「他哪裡表現不錯」：提供幾個快速短語（例如 引薦品質好、主題分享精彩、熱心協助來賓），也可自行輸入。
4. 送出。結束前可以改票。

管理頁（CON-06）：開啟／結束投票、即時票數、已投人數、好話清單、公布結果、歷屆得主。

資料：

- 既有 `LivePoll`、`LivePollOption`、`LivePollVote` 沿用。
- `LivePollVote` 新增 `comment`（選填，上限 100 字）、`commentVisibility`。
- 資格由簽到憑證決定（一人一票），取代共用投票碼；既有 `tokenHash` 欄位可沿用。

預設決定（可改）：

| 項目 | 預設 |
| --- | --- |
| 投票是否匿名 | 匿名 |
| 好話給誰看 | 得票者本人與領導團隊；不顯示留言者 |
| 能否改票 | 投票結束前可改 |
| 代理人 | 可投票，不列為候選人 |
| 能否投自己 | 不可 |

## 7. 工具規格：禮物抽獎（T03、T04）

目標：領導團隊隨時加禮物、記錄誰提供；前台隨機抽；之後隨時能改「誰提供」與「誰抽走」。

禮物管理（CON-07）：

- 新增禮物：品名、數量、提供者（選會員、來賓，或自由輸入）、備註、照片（選填）。
- 清單每列：禮物、提供者、狀態（待抽／已抽）、得主、抽出時間。
- 任何時間都能編輯提供者與得主（例如得主不在場改給下一位、事後補登提供者）。每次修改留紀錄。
- 抽獎池設定：已簽到會員／來賓／代理人可勾選；是否排除本場已中獎者。
- 「開啟前台」按鈕，連到大螢幕頁。

抽獎前台（PUB-04）：

- 大螢幕全畫面：目前禮物、提供者、抽獎池人數。
- 主持人按「開抽」→ 名字滾動 → 停在得主。
- 得主不在場：按「重抽」，原結果留在紀錄。
- 操作權限：只有登入的領導團隊能按開抽；未登入者只能觀看。

資料：

```prisma
model Gift {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  orgId        String   @db.ObjectId
  eventId      String   @db.ObjectId
  name         String
  quantity     Int      @default(1)
  donorPersonId String? @db.ObjectId   // 提供者是系統內的人
  donorName    String?                 // 或自由輸入
  note         String?
  imageAssetId String?  @db.ObjectId
  position     Int
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  awards       GiftAward[]
}

model GiftAward {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  giftId          String   @db.ObjectId
  winnerPersonId  String?  @db.ObjectId
  winnerName      String                 // 快照，改名不影響紀錄
  method          String                 // random | manual
  status          String                 // awarded | redrawn | edited
  poolSize        Int?
  seed            String?
  drawnAt         DateTime @default(now())
  editedBy        String?
  editReason      String?
}
```

說明：先前 ARC-006 提的是「抽完鎖定、可重算驗證」。依這次需求改為**可隨時編輯，但保留修改紀錄**；隨機抽的 seed 與抽獎池人數仍會記下。

## 8. 工具規格：綠燈會員（T05、T06、T07）

目標：領導團隊匯入當期 PALMS 檔就算出燈號，並能看時序變化。

### 8.1 實際檔案格式（依 2026-09-24 匯出的範例檔）

- 副檔名 `.xls`，內容是 **SpreadsheetML 2003（XML）**，不是二進位 Excel。現有的 `exceljs` 讀不了，要用 XML parser。
- 單一工作表 `Report`。第 3 列：匯出者、匯出時間、地區、分會。第 5～7 列：分會、`從`、`至`（期間）。
- 第 8 列是表頭，之後每列一位會員：

| 欄 | 表頭 | 對應 |
| --- | --- | --- |
| 1、2 | 姓氏、名字 | 會員比對 |
| 3～7 | 出席、缺席、遲到、病假、替代人 | P / A / L / M / S |
| 8、10 | 提供內部引薦、提供外部引薦 | 引薦（給出） |
| 11、12 | 收到內部引薦、收到外部引薦 | 參考，不計分 |
| 13 | 來賓 | 來賓 |
| 14 | 一對一會面 | 一對一 |
| 15 | 交易價值 | TYFCB |
| 16 | 分會教育單位 | CEU |

- 第 9 欄不存在（合併儲存格），必須依 `ss:Index` 讀欄位，不能依順序。
- 結尾三列 `來賓`、`BNI`、`總數` 不是會員；`總數` 可用來核對匯入是否完整。
- 「名字」欄有 8 位帶英文別名（例：`道元 Lam,Kirin`），比對時只取中文部分。
- 範例檔 39 位會員，與 `chapter-members.ts` 的 39 位比對後，**各有 3 位對不上**：檔案有 簡偉志、葉宸妡、劉庭羽；名冊有 葉心琳、陳軾、陳平。可能是本名／常用名不同或名冊未更新，所以匯入流程一定要有人工對名步驟，並記住對應結果。

### 8.2 匯入流程（CON-12）

```txt
① 上傳檔案      拖放 .xls
② 讀取期間      自動帶出 從／至、分會、匯出時間；分會不符就擋下
③ 會員對名      自動比對；對不上的列出，讓幹部選「對應到哪位會員」或「新增會員」或「略過」
                 對應結果存成別名，下次自動套用
④ 檢查          與「總數」列核對；標示與上一期差異特別大的數字
⑤ 確認匯入      產生這一期的快照與燈號
```

- 同一期間重複匯入：新檔取代舊檔，舊檔保留為歷史版本（月中匯一次、月底再匯一次是常態；範例檔就是 9/24 匯出 9/1～9/30）。
- 期間未結束的匯入標示為「期中」。

### 8.3 計分與時序

- 每次匯入 = 一期的原始數字（`PalmsPeriod` + 每位會員一列）。
- 燈號以「近 6 個月合計」計算；同時顯示「當期」數字。匯入不足 6 期時照算，並標示「資料 N / 6 期」。
- 計分規則版本化（`ScoringRule`）。研究查到的常見版本是五項各 20 分、70 分以上綠燈，但各地區不同，**上線前要拿到分會現行計分表**。規則改版不回頭改舊快照。
- 出席類數字：系統內有 `Participation` 之後，可與 PALMS 的出席／缺席／替代人互相核對，不一致時提示。

時序呈現：

- 總覽（CON-11）：分會燈號分布的逐期變化；會員列表每列一條分數走勢與「上期 → 本期」燈號變化；可篩選「轉黃／轉紅」。
- 我的燈號（MEM-04）：自己近 6 期的分數走勢與五個分項，差幾分到下一個燈號。

資料：

```prisma
model PalmsPeriod {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  orgId       String   @db.ObjectId
  from        DateTime
  to          DateTime
  exportedAt  DateTime
  exportedBy  String?
  isPartial   Boolean  @default(false)
  version     Int      @default(1)
  sourceAssetId String? @db.ObjectId
  totals      Json
  importedBy  String
  createdAt   DateTime @default(now())
  rows        PalmsMemberRow[]
  @@index([orgId, from, to])
}

model PalmsMemberRow {
  id            String  @id @default(auto()) @map("_id") @db.ObjectId
  periodId      String  @db.ObjectId
  membershipId  String? @db.ObjectId
  rawLastName   String
  rawFirstName  String
  present Int
  absent Int
  late Int
  medical Int
  substitute Int
  referralsGivenInside Int
  referralsGivenOutside Int
  referralsReceivedInside Int
  referralsReceivedOutside Int
  visitors Int
  oneToOnes Float
  tyfcb Float
  ceu Int
  @@index([periodId])
  @@index([membershipId])
}

model MemberAlias {          // 對名結果
  id            String @id @default(auto()) @map("_id") @db.ObjectId
  orgId         String @db.ObjectId
  membershipId  String @db.ObjectId
  alias         String
  source        String  // palms | manual
  @@unique([orgId, alias])
}

model ScorecardSnapshot {
  id            String @id @default(auto()) @map("_id") @db.ObjectId
  orgId         String @db.ObjectId
  membershipId  String @db.ObjectId
  periodId      String @db.ObjectId      // 以哪一期為結尾
  windowPeriods Int                       // 實際用了幾期
  ruleVersion   Int
  metrics       Json
  score         Int
  light         String                    // green | yellow | red | grey
  @@unique([membershipId, periodId, ruleVersion])
}
```

## 9. 需要確認的事

1. 第一波任務順序：預設 T01 → T07，照表進行。
2. 長冠軍之星 §6 的五個預設。
3. 抽獎：代理人與來賓預設是否進抽獎池。
4. 綠燈：分會現行計分表；PALMS 是每月匯一次還是每週。
5. 範例檔裡對不上的 6 個姓名，哪些是同一人。
