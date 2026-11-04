// 115/11/05 BNI長冠軍分會座位表
// 領導團隊：主席 黃子宜（代理主席）、副主席 蘇子茵（代理副主席）、
//          教育協調 黎士銓、秘書 田謦蓉、活動 陳泓睿（叢晧日回到會員座位）
// 資訊組：值日生 林子晏  音控 吳振綱  攝影 郭子郁
// 來賓 2 位（人才接龍，引薦人都是 黃佳琪；來賓正後方為對應執事）
//   賓1 葉瑋庭（廣告配音員）／ 執事 陳志誠
//   賓2 蔡嘉哲（錄音室老闆，金鐘得獎混音師）／ 執事 邱孟婷
// 新夥伴 譚旭良（10/29 來賓，企業金融）坐在 馬廷軒 旁邊：同一排長椅緊鄰（一排3 馬廷軒、一排4 譚旭良，格子上是正下方）
// 新會員陳軾、陳平仍坐在導師（王柏詠、蘇冠霖）正後方
// Mina 陳宜均固定 4-3（音控正後方 g-2-3）
// 代理人（排最後）：網站登記 韓政諺（杜文魁）、黃嘉琪（梁韋恩）；另依使用者 古又帆（代理人姓名未提供）
// 英雄榜：冠霖 👉 廷軒 👉 育群 ／ 柏瀚 👉 黃杰 👉 子晏
//
// 其他會員順序沿用 10/29
// 物理場地：欄0+1 = 第一排長桌（面對面），欄2+3 = 第二排長桌（面對面）

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_1105: Roster = {
  hostTeam: [
    { role: '活動協調', name: '陳泓睿' },
    { role: '財務秘書', name: '田謦蓉' },
    { role: '主席',    name: '黃子宜' },
    { role: '副主席',  name: '蘇子茵' },
    { role: '教育協調', name: '黎士銓' },
  ],

  sound: '吳振綱',
  duty:  '林子晏',

  guests: [
    { number: '賓1', guestName: '葉瑋庭', hostName: '陳志誠' },
    { number: '賓2', guestName: '蔡嘉哲', hostName: '邱孟婷' },
  ],

  members: [
    '黃佳琪', '程睿紳',
    '馬廷軒', '王柏詠', '蘇冠霖', '陳宜均',
    '譚旭良', '陳軾', '陳平', '郭子郁',
    '叢晧日', '林家均', '邱柏瀚', '林育群',
    '洪麗卿', '戴嘉慧', '洪宗宏', '林道元',
    '王建豐', '黃柔涵', '陳俊鳴', '王致崴',
    '黃杰', '戴宇星', '張媁淇', '林塏秢',
    '梁文齡',
  ],

  proxies: ['古又帆', '韓政諺', '黃嘉琪'],

  industryChains: [],

  heroes: ['蘇冠霖', '馬廷軒', '林育群', '邱柏瀚', '黃杰', '林子晏'],
};

export const LAYOUT_1105: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '陳泓睿', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '田謦蓉', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '黃子宜', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '蘇子茵', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '黎士銓', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：賓1 / 賓2 / 黃佳琪(引薦人) / 林子晏(值日生)
    [
      { id: 'g-0-0', name: '葉瑋庭', isGuest: true, guestNumber: '賓1' },
      { id: 'g-0-1', name: '蔡嘉哲', isGuest: true, guestNumber: '賓2' },
      { id: 'g-0-2', name: '黃佳琪', isGuest: false },
      { id: 'g-0-3', name: '林子晏', isGuest: false, isDuty: true },
    ],
    // 列 1：陳志誠(執·賓1) / 邱孟婷(執·賓2) / 程睿紳 / 吳振綱(音控)
    [
      { id: 'g-1-0', name: '陳志誠', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '邱孟婷', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-1-2', name: '程睿紳', isGuest: false },
      { id: 'g-1-3', name: '吳振綱', isGuest: false, isSound: true },
    ],
    // 列 2：馬廷軒 / 王柏詠 / 蘇冠霖 / 陳宜均(Mina 固定，音控正後方)
    [
      { id: 'g-2-0', name: '馬廷軒', isGuest: false },
      { id: 'g-2-1', name: '王柏詠', isGuest: false },
      { id: 'g-2-2', name: '蘇冠霖', isGuest: false },
      { id: 'g-2-3', name: '陳宜均', isGuest: false },
    ],
    // 列 3：譚旭良(新夥伴，一排緊鄰馬廷軒) / 陳軾(王柏詠正後方) / 陳平(蘇冠霖正後方) / 郭子郁(攝影)
    [
      { id: 'g-3-0', name: '譚旭良', isGuest: false },
      { id: 'g-3-1', name: '陳軾', isGuest: false },
      { id: 'g-3-2', name: '陳平', isGuest: false },
      { id: 'g-3-3', name: '郭子郁', isGuest: false, isPhoto: true },
    ],
    // 列 4：叢晧日 / 林家均 / 邱柏瀚 / 林育群
    [
      { id: 'g-4-0', name: '叢晧日', isGuest: false },
      { id: 'g-4-1', name: '林家均', isGuest: false },
      { id: 'g-4-2', name: '邱柏瀚', isGuest: false },
      { id: 'g-4-3', name: '林育群', isGuest: false },
    ],
    // 列 5：洪麗卿 / 戴嘉慧 / 洪宗宏 / 林道元
    [
      { id: 'g-5-0', name: '洪麗卿', isGuest: false },
      { id: 'g-5-1', name: '戴嘉慧', isGuest: false },
      { id: 'g-5-2', name: '洪宗宏', isGuest: false },
      { id: 'g-5-3', name: '林道元', isGuest: false },
    ],
    // 列 6：王建豐 / 黃柔涵 / 陳俊鳴 / 王致崴
    [
      { id: 'g-6-0', name: '王建豐', isGuest: false },
      { id: 'g-6-1', name: '黃柔涵', isGuest: false },
      { id: 'g-6-2', name: '陳俊鳴', isGuest: false },
      { id: 'g-6-3', name: '王致崴', isGuest: false },
    ],
    // 列 7：黃杰 / 戴宇星 / 張媁淇 / 林塏秢
    [
      { id: 'g-7-0', name: '黃杰', isGuest: false },
      { id: 'g-7-1', name: '戴宇星', isGuest: false },
      { id: 'g-7-2', name: '張媁淇', isGuest: false },
      { id: 'g-7-3', name: '林塏秢', isGuest: false },
    ],
    // 列 8：梁文齡 / 古又帆(代理) / 韓政諺(代理) / 黃嘉琪(代理)
    [
      { id: 'g-8-0', name: '梁文齡', isGuest: false },
      { id: 'g-8-1', name: '古又帆', isGuest: false, role: '代理' },
      { id: 'g-8-2', name: '韓政諺', isGuest: false, role: '代理' },
      { id: 'g-8-3', name: '黃嘉琪', isGuest: false, role: '代理' },
    ],
  ],

  sidebar: [],
};
