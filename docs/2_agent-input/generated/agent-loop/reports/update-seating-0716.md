# take-seat Seating Update Report for 2026-07-16

Date: 2026-07-15
Agent loop cycle: Seating Update 07-16
Batch / slice: Operational Data Update
Task IDs: SEAT-UPDATE-0716

## 1. User-Visible Result

- **Routes updated**: `/seats/2026-07-16` is now pre-loaded with the updated layout from MongoDB.
- **Seating arranged**:
  - **Guests and Hosts**:
    1. 葉子豪 (賓1) hosted by 邱孟婷 (seat idx 0 & idx 4)
    2. 梁訓銘 (賓2) hosted by 田謦蓉 (seat idx 1 & idx 5)
    3. 羅士翔 (賓3) hosted by 叢晧日 (seat idx 2 & idx 6)
    4. 馮羿嘉 (賓4) hosted by 邱柏瀚 (seat idx 8 & idx 12)
  - **Duty Officer (值日生)**: 王致崴 (seat idx 3)
  - **Audio/Video Control (音控)**: 郭子郁 (seat idx 7)
  - **Proxy (代理人)**: 戴宇星 (seat idx 32, role: 代理)
  - **Additional Members**: 洪麗卿 (seat idx 13, row 3 col 1), 韓政諺 (seat idx 16, row 4 col 0), 林塏秢 (seat idx 35, row 8 col 3), 黃杰 (seat idx 15, row 3 col 3)
  - **New Member Guidance Rules (新會員導引規則)**:
    - 洪麗卿 is placed at row 3 col 1 (idx 13), directly above 蘇子茵 (row 4 col 1, idx 17).
    - 韓政諺 is placed at row 4 col 0 (idx 16), directly below 邱柏瀚 (row 3 col 0, idx 12) and directly above 洪宗宏 (row 5 col 0, idx 20).
    - 黃杰 is placed at row 3 col 3 (idx 15), directly below 馬廷軒 (row 2 col 3, idx 11) and directly above 黎士銓 (row 4 col 3, idx 19).
  - **Hero Roll (英雄榜)**: 宜均 👉 致崴 👉 俊鳴 👉 道元 👉 睿紳 👉 宗宏 👉 又帆 👉 子宜 (mapped to full name directory in `layout-0716.ts` and saved in MongoDB)

## 2. Product Scope

- **Included**:
  - Full grid seat alignment and mapping for 2026-07-16.
  - Seeding / persisting the update in MongoDB database.
  - Creating local TypeScript static seed layout `src/lib/layout-0716.ts`.
  - Updating fallback defaults in `src/lib/seating-week.ts`.
  - Restoring missing members (`劉庭羽` and `林塏秢`) to the general `memberRoster` list to ensure the chapter system directory maps exactly to all 38 active members.
  - Adjusting grid seat assignments to enforce new member rules (positioning 洪麗卿/蘇子茵, 韓政諺/洪宗宏/邱柏瀚, 黃杰/黎士銓/馬廷軒).
- **Not included**:
  - Any backend routes changes or schema modifications.

## 3. Frontend Changes

- **Files changed**:
  - `src/lib/seating-week.ts`: Pointed `CURRENT_MEETING_WEEK` to `2026-07-16` and layout to `LAYOUT_0716`.

## 4. Backend / API / Server Changes

- No API modifications.

## 5. Data / System Architecture

- **Models touched**: `SeatMap` (upserted for session 2026-07-16), `Seat` and `SeatAssignment` (deleted previous assignments/seats and recreated matching layout-0716), `SeatMapRevision` (created version 2 revision snapshot for history audit), `OperationLog` (recorded `seating_draft_saved` action).

## 6. Privacy And Security Boundaries

- DTO boundaries remain unaffected. No private details are exposed.

## 7. Tests And Evidence

- **Validation commands run**:
  - `pnpm run lint` - Passed with no errors.
  - `pnpm run build` - Successfully compiled and built Next.js pages.
  - `npx tsx check-mismatch.ts` - Verified that snapshot array elements and db seats match perfectly.

## 8. Decisions Needed

- None.

## 9. Next Recommended Task

- The 07-16 seating arrangement has been completely updated and verified in the database and code. The user may now check it in the local running workspace or deploy it.
