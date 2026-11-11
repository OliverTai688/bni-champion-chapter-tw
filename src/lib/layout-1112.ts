// 115/11/12 BNI長冠軍分會座位表
// 領導團隊：主席 古又帆（回歸）、副主席 黃子宜、教育協調 黎士銓、秘書 田謦蓉、活動 陳泓睿
//          蘇子茵回到會員座位
// 資訊組：值日生 戴宇星  音控 王致崴（Wade）  攝影 郭子郁（中間走道 二排6）
// 來賓 3 位（人才接龍，引薦人都是 程睿紳；來賓正後方為對應執事）
//   賓1 彭天宏（助理教授，關係 5 / 意願 1）／ 執事 陳志誠
//   賓2 陳清富（磨刀師，關係 5 / 意願 1）／ 執事 邱柏瀚（jerry）
//   賓3 魏志峰（國泰複委託，關係 5 / 意願 2）／ 執事 林家均
//       （原定 小樹 蘇冠霖，本週請代理，改由有經驗的執事 林家均）
// 程睿紳 坐三排1，與賓3 同一排長椅相鄰
// 導生 譚旭良 坐在 蘇子茵 與 馬廷軒 中間（一排 3 / 4 / 5）
// 新會員 陳軾 仍坐在導師 王柏詠 正後方；陳平的導師 蘇冠霖 本週代理，陳平坐三排4
// Mina 陳宜均固定 音控正後方（g-2-3）
// 代理人（網站登記）：叢晧日（劉庭羽）、張媁淇（余承諺）、林塏秢（林博彥）、蘇冠霖（黃信峰）、
//                  邱孟婷（陳虹蓁）、韓政諺（杜文魁）、黃柔涵（林英傑）
// 吳振綱 要提早離開，排在最後面（一排10）
// 英雄榜：廷軒 👉 建豐 ／ 柏瀚 👉 育群 👉 黃杰 👉 子晏
//
// 其他會員順序沿用 11/05
// 物理場地：欄0+1 = 第一排長桌（面對面），欄2+3 = 第二排長桌（面對面）

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_1112: Roster = {
  hostTeam: [
    { role: '活動協調', name: '陳泓睿' },
    { role: '財務秘書', name: '田謦蓉' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '黎士銓' },
  ],

  sound: '王致崴',
  duty:  '戴宇星',

  guests: [
    { number: '賓1', guestName: '彭天宏', hostName: '陳志誠' },
    { number: '賓2', guestName: '陳清富', hostName: '邱柏瀚' },
    { number: '賓3', guestName: '魏志峰', hostName: '林家均' },
  ],

  members: [
    '程睿紳',
    '蘇子茵', '王柏詠', '陳宜均',
    '譚旭良', '陳軾', '陳平', '黃佳琪',
    '馬廷軒', '林子晏', '林育群', '洪麗卿',
    '戴嘉慧', '郭子郁', '洪宗宏', '林道元',
    '王建豐', '陳俊鳴', '黃杰', '梁文齡',
    '黃嘉琪',
    '吳振綱',
  ],

  proxies: ['叢晧日', '張媁淇', '林塏秢', '蘇冠霖', '邱孟婷', '韓政諺', '黃柔涵'],

  industryChains: [],

  heroes: ['馬廷軒', '王建豐', '邱柏瀚', '林育群', '黃杰', '林子晏'],
};

export const LAYOUT_1112: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '陳泓睿', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '田謦蓉', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '黎士銓', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：賓1 / 賓2 / 程睿紳(引薦人) / 戴宇星(值日生)
    [
      { id: 'g-0-0', name: '彭天宏', isGuest: true, guestNumber: '賓1' },
      { id: 'g-0-1', name: '陳清富', isGuest: true, guestNumber: '賓2' },
      { id: 'g-0-2', name: '程睿紳', isGuest: false },
      { id: 'g-0-3', name: '戴宇星', isGuest: false, isDuty: true },
    ],
    // 列 1：陳志誠(執·賓1) / 邱柏瀚(執·賓2) / 賓3(三排2，緊鄰引薦人) / 王致崴(音控)
    [
      { id: 'g-1-0', name: '陳志誠', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-1-1', name: '邱柏瀚', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-1-2', name: '魏志峰', isGuest: true, guestNumber: '賓3' },
      { id: 'g-1-3', name: '王致崴', isGuest: false, isSound: true },
    ],
    // 列 2：蘇子茵 / 王柏詠 / 林家均(執·賓3) / 陳宜均(Mina 固定，音控正後方)
    [
      { id: 'g-2-0', name: '蘇子茵', isGuest: false },
      { id: 'g-2-1', name: '王柏詠', isGuest: false },
      { id: 'g-2-2', name: '林家均', isGuest: false, isHost: true, hostFor: '賓3' },
      { id: 'g-2-3', name: '陳宜均', isGuest: false },
    ],
    // 列 3：譚旭良(導生，蘇子茵與馬廷軒中間) / 陳軾(王柏詠正後方) / 陳平 / 黃佳琪
    [
      { id: 'g-3-0', name: '譚旭良', isGuest: false },
      { id: 'g-3-1', name: '陳軾', isGuest: false },
      { id: 'g-3-2', name: '陳平', isGuest: false },
      { id: 'g-3-3', name: '黃佳琪', isGuest: false },
    ],
    // 列 4：馬廷軒 / 林子晏 / 林育群 / 洪麗卿
    [
      { id: 'g-4-0', name: '馬廷軒', isGuest: false },
      { id: 'g-4-1', name: '林子晏', isGuest: false },
      { id: 'g-4-2', name: '林育群', isGuest: false },
      { id: 'g-4-3', name: '洪麗卿', isGuest: false },
    ],
    // 列 5：戴嘉慧 / 郭子郁(攝影，中間走道靠後) / 洪宗宏 / 林道元
    [
      { id: 'g-5-0', name: '戴嘉慧', isGuest: false },
      { id: 'g-5-1', name: '郭子郁', isGuest: false, isPhoto: true },
      { id: 'g-5-2', name: '洪宗宏', isGuest: false },
      { id: 'g-5-3', name: '林道元', isGuest: false },
    ],
    // 列 6：王建豐 / 陳俊鳴 / 黃杰 / 梁文齡
    [
      { id: 'g-6-0', name: '王建豐', isGuest: false },
      { id: 'g-6-1', name: '陳俊鳴', isGuest: false },
      { id: 'g-6-2', name: '黃杰', isGuest: false },
      { id: 'g-6-3', name: '梁文齡', isGuest: false },
    ],
    // 列 7：黃嘉琪 / 叢晧日(代理) / 張媁淇(代理) / 林塏秢(代理)
    [
      { id: 'g-7-0', name: '黃嘉琪', isGuest: false },
      { id: 'g-7-1', name: '叢晧日', isGuest: false, role: '代理' },
      { id: 'g-7-2', name: '張媁淇', isGuest: false, role: '代理' },
      { id: 'g-7-3', name: '林塏秢', isGuest: false, role: '代理' },
    ],
    // 列 8：蘇冠霖(代理) / 邱孟婷(代理) / 韓政諺(代理) / 黃柔涵(代理)
    [
      { id: 'g-8-0', name: '蘇冠霖', isGuest: false, role: '代理' },
      { id: 'g-8-1', name: '邱孟婷', isGuest: false, role: '代理' },
      { id: 'g-8-2', name: '韓政諺', isGuest: false, role: '代理' },
      { id: 'g-8-3', name: '黃柔涵', isGuest: false, role: '代理' },
    ],
    // 列 9：吳振綱(提早離開，最後面) / (空) / (空) / (空)
    [
      { id: 'g-9-0', name: '吳振綱', isGuest: false },
      null,
      null,
      null,
    ],
  ],

  sidebar: [],
};
