// 115/10/22 BNI長冠軍分會座位表
// 領導團隊：主席 黃子宜（古又帆出國代理）、副主席 叢晧日（叢導代理）、
//          教育協調 黎士銓（程睿紳回到會員座位）、秘書 田謦蓉、活動 陳泓睿
// 資訊組：值日生 王致崴  音控 戴宇星  攝影 林道元（郭子郁不在，林道元當資訊組長）
// 來賓 1 位：
//   賓1 劉彥余（動物醫事助理協會，引薦 林道元）／ 執事 林家均（正後方）／ 對面 林子晏
// 新會員坐前排，導師坐正後方：陳軾 → 王柏詠、陳平 → 蘇冠霖
// Mina 陳宜均固定 4-3：使用者的說法是第 4 欄（音控那一欄）第 3 個位子，即音控正後方 g-2-3
// 代理人（會員在網站登記，排最後）：古又帆（Kyle）、郭子郁（睿朋）、韓政諺（杜文魁）、黃杰（李瑋豪）
// 英雄榜：孟婷 👉 睿紳 👉 黃杰 👉 子茵 👉 宇星 👉 道元 👉 Jimmy
//
// 其他會員順序沿用 10/15
// 物理場地：欄0+1 = 第一排長桌（面對面），欄2+3 = 第二排長桌（面對面）

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_1022: Roster = {
  hostTeam: [
    { role: '活動協調', name: '陳泓睿' },
    { role: '財務秘書', name: '田謦蓉' },
    { role: '主席',    name: '黃子宜' },
    { role: '副主席',  name: '叢晧日' },
    { role: '教育協調', name: '黎士銓' },
  ],

  sound: '戴宇星',
  duty:  '王致崴',

  guests: [
    { number: '賓1', guestName: '劉彥余', hostName: '林家均' },
  ],

  members: [
    '林子晏', '陳軾',
    '陳平', '王柏詠',
    '邱孟婷', '蘇冠霖', '張媁淇', '陳宜均',
    '邱柏瀚', '吳振綱', '陳志誠', '蘇子茵',
    '馬廷軒', '程睿紳', '黃嘉琪', '梁文齡',
    '黃佳琪', '林育群', '洪麗卿', '戴嘉慧',
    '洪宗宏', '林道元', '林塏秢', '王建豐',
    '黃柔涵', '陳俊鳴',
  ],

  proxies: ['古又帆', '郭子郁', '韓政諺', '黃杰'],

  industryChains: [],

  heroes: ['邱孟婷', '程睿紳', '黃杰', '蘇子茵', '戴宇星', '林道元', 'Jimmy'],
};

export const LAYOUT_1022: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '陳泓睿', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '田謦蓉', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '黃子宜', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '叢晧日', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '黎士銓', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：賓1 / 林子晏(賓1對面) / 陳軾(新) / 王致崴(值日生)
    [
      { id: 'g-0-0', name: '劉彥余', isGuest: true, guestNumber: '賓1' },
      { id: 'g-0-1', name: '林子晏', isGuest: false },
      { id: 'g-0-2', name: '陳軾', isGuest: false },
      { id: 'g-0-3', name: '王致崴', isGuest: false, isDuty: true },
    ],
    // 列 1：林家均(執·賓1) / 陳平(新) / 王柏詠(陳軾導師) / 戴宇星(音控)
    [
      { id: 'g-1-0', name: '林家均', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '陳平', isGuest: false },
      { id: 'g-1-2', name: '王柏詠', isGuest: false },
      { id: 'g-1-3', name: '戴宇星', isGuest: false, isSound: true },
    ],
    // 列 2：邱孟婷 / 蘇冠霖(陳平導師) / 張媁淇 / 陳宜均(Mina 固定，音控正後方)
    [
      { id: 'g-2-0', name: '邱孟婷', isGuest: false },
      { id: 'g-2-1', name: '蘇冠霖', isGuest: false },
      { id: 'g-2-2', name: '張媁淇', isGuest: false },
      { id: 'g-2-3', name: '陳宜均', isGuest: false },
    ],
    // 列 3：邱柏瀚 / 吳振綱 / 陳志誠 / 蘇子茵
    [
      { id: 'g-3-0', name: '邱柏瀚', isGuest: false },
      { id: 'g-3-1', name: '吳振綱', isGuest: false },
      { id: 'g-3-2', name: '陳志誠', isGuest: false },
      { id: 'g-3-3', name: '蘇子茵', isGuest: false },
    ],
    // 列 4：馬廷軒 / 程睿紳 / 黃嘉琪 / 梁文齡
    [
      { id: 'g-4-0', name: '馬廷軒', isGuest: false },
      { id: 'g-4-1', name: '程睿紳', isGuest: false },
      { id: 'g-4-2', name: '黃嘉琪', isGuest: false },
      { id: 'g-4-3', name: '梁文齡', isGuest: false },
    ],
    // 列 5：黃佳琪 / 林育群 / 洪麗卿 / 戴嘉慧
    [
      { id: 'g-5-0', name: '黃佳琪', isGuest: false },
      { id: 'g-5-1', name: '林育群', isGuest: false },
      { id: 'g-5-2', name: '洪麗卿', isGuest: false },
      { id: 'g-5-3', name: '戴嘉慧', isGuest: false },
    ],
    // 列 6：洪宗宏 / 林道元(攝影) / 林塏秢 / 王建豐
    [
      { id: 'g-6-0', name: '洪宗宏', isGuest: false },
      { id: 'g-6-1', name: '林道元', isGuest: false, isPhoto: true },
      { id: 'g-6-2', name: '林塏秢', isGuest: false },
      { id: 'g-6-3', name: '王建豐', isGuest: false },
    ],
    // 列 7：黃柔涵 / 陳俊鳴 / 古又帆(代理) / 郭子郁(代理)
    [
      { id: 'g-7-0', name: '黃柔涵', isGuest: false },
      { id: 'g-7-1', name: '陳俊鳴', isGuest: false },
      { id: 'g-7-2', name: '古又帆', isGuest: false, role: '代理' },
      { id: 'g-7-3', name: '郭子郁', isGuest: false, role: '代理' },
    ],
    // 列 8：韓政諺(代理) / 黃杰(代理) / (空) / (空)
    [
      { id: 'g-8-0', name: '韓政諺', isGuest: false, role: '代理' },
      { id: 'g-8-1', name: '黃杰', isGuest: false, role: '代理' },
      null,
      null,
    ],
  ],

  sidebar: [],
};
