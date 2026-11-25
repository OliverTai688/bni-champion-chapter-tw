// 115/11/26 BNI長冠軍分會座位表
// 領導團隊：主席 古又帆、副主席 黃子宜、活動 陳泓睿、財務秘書 田謦蓉、教育協調 程睿紳
//          （自 11/26 起教育協調改由程睿紳擔任，黎士銓回到會員座位）
// 來賓名單 11/25 更新：周怡君 取消，改為 陳建業
// 資訊組：值日生 王致崴  音控 戴宇星  攝影 林子晏（中間走道 二排7）
// 來賓 4 位（人才接龍；來賓正後方為對應執事）
//   賓1 蕭竹彧（水土保持技師，引薦 陳軾，關係 5 / 意願 3，想了解BNI、認識人脈）／ 執事 陳志誠
//   賓2 李茜芸（花藝師，引薦 古又帆，關係 3 / 意願 3，與各產業交流；11/19 第二次來）／ 執事 蘇子茵
//   賓3 林道宏（游泳滑雪教練，引薦 林道元，關係 5 / 意願 2，產業交流）／ 執事 林家均
//   賓4 陳建業（醫美整形，引薦 田謦蓉，關係 3 / 意願 5，加入長冠軍）／ 執事 叢晧日（叢導）
// 引薦人 陳軾 坐三排2（賓1 正前方，同一排長椅），林道元 坐二排3（賓3 正前方）；古又帆、田謦蓉在主持團
// 新會員 陳軾 坐在導師 王柏詠 正後方；陳平 坐在導師 蘇冠霖 正後方
// 導生 譚旭良 坐在 馬廷軒 旁邊（一排 6 / 7）
// Mina 陳宜均固定 音控正後方（g-2-3）
// 代理人（網站登記）：張媁淇（李詩智）、韓政諺（杜文魁）、黃杰（李瑋豪）
// 洪宗宏 已離會（11/26 起不排座位）
// 英雄榜：家均 👉 佳琪 👉 宇星 👉 又帆 ／ 柏瀚 👉 育群 👉 子晏 👉 黃杰
//
// 其他會員順序沿用 11/19
// 物理場地：欄0+1 = 第一排長桌（面對面），欄2+3 = 第二排長桌（面對面）

import { Roster, SeatingLayout } from '@/types/seating';

export const ROSTER_1126: Roster = {
  hostTeam: [
    { role: '活動協調', name: '陳泓睿' },
    { role: '財務秘書', name: '田謦蓉' },
    { role: '主席',    name: '古又帆' },
    { role: '副主席',  name: '黃子宜' },
    { role: '教育協調', name: '程睿紳' },
  ],

  sound: '戴宇星',
  duty:  '王致崴',

  guests: [
    { number: '賓1', guestName: '蕭竹彧', hostName: '陳志誠' },
    { number: '賓2', guestName: '李茜芸', hostName: '蘇子茵' },
    { number: '賓3', guestName: '林道宏', hostName: '林家均' },
    { number: '賓4', guestName: '陳建業', hostName: '叢晧日' },
  ],

  members: [
    '王柏詠', '陳軾', '林道元', '陳宜均',
    '陳俊鳴', '吳振綱', '黎士銓', '郭子郁',
    '邱柏瀚', '黃佳琪', '馬廷軒', '譚旭良',
    '林育群', '蘇冠霖', '陳平', '洪麗卿',
    '林子晏', '王建豐', '梁文齡', '黃嘉琪',
    '邱孟婷', '戴嘉慧', '林塏秢', '黃柔涵',
  ],

  proxies: ['張媁淇', '韓政諺', '黃杰'],

  industryChains: [],

  heroes: ['林家均', '黃佳琪', '戴宇星', '古又帆', '邱柏瀚', '林育群', '林子晏', '黃杰'],
};

export const LAYOUT_1126: SeatingLayout = {
  topRoles: [
    { id: 'top-活動協調', name: '陳泓睿', role: '活動協調', isGuest: false },
    { id: 'top-財務秘書', name: '田謦蓉', role: '財務秘書', isGuest: false },
    { id: 'top-主席',    name: '古又帆', role: '主席',     isGuest: false },
    { id: 'top-副主席',  name: '黃子宜', role: '副主席',   isGuest: false },
    { id: 'top-教育協調', name: '程睿紳', role: '教育協調', isGuest: false },
  ],

  mainGrid: [
    // 列 0：賓2(引薦人古又帆在主持團) / 賓4(引薦人田謦蓉在主持團) / 王柏詠 / 王致崴(值日生)
    [
      { id: 'g-0-0', name: '李茜芸', isGuest: true, guestNumber: '賓2' },
      { id: 'g-0-1', name: '陳建業', isGuest: true, guestNumber: '賓4' },
      { id: 'g-0-2', name: '王柏詠', isGuest: false },
      { id: 'g-0-3', name: '王致崴', isGuest: false, isDuty: true },
    ],
    // 列 1：蘇子茵(執·賓2) / 叢晧日(執·賓4) / 陳軾(王柏詠正後方，引薦·賓1) / 戴宇星(音控)
    [
      { id: 'g-1-0', name: '蘇子茵', isGuest: false, isHost: true, hostFor: '賓2' },
      { id: 'g-1-1', name: '叢晧日', isGuest: false, isHost: true, hostFor: '賓4' },
      { id: 'g-1-2', name: '陳軾', isGuest: false },
      { id: 'g-1-3', name: '戴宇星', isGuest: false, isSound: true },
    ],
    // 列 2：陳俊鳴 / 林道元(引薦·賓3) / 賓1(緊鄰引薦人陳軾) / 陳宜均(Mina 固定，音控正後方)
    [
      { id: 'g-2-0', name: '陳俊鳴', isGuest: false },
      { id: 'g-2-1', name: '林道元', isGuest: false },
      { id: 'g-2-2', name: '蕭竹彧', isGuest: true, guestNumber: '賓1' },
      { id: 'g-2-3', name: '陳宜均', isGuest: false },
    ],
    // 列 3：吳振綱 / 賓3(緊鄰引薦人林道元) / 陳志誠(執·賓1) / 黎士銓
    [
      { id: 'g-3-0', name: '吳振綱', isGuest: false },
      { id: 'g-3-1', name: '林道宏', isGuest: true, guestNumber: '賓3' },
      { id: 'g-3-2', name: '陳志誠', isGuest: false, isHost: true, hostFor: '賓1' },
      { id: 'g-3-3', name: '黎士銓', isGuest: false },
    ],
    // 列 4：郭子郁 / 林家均(執·賓3) / 邱柏瀚 / 黃佳琪
    [
      { id: 'g-4-0', name: '郭子郁', isGuest: false },
      { id: 'g-4-1', name: '林家均', isGuest: false, isHost: true, hostFor: '賓3' },
      { id: 'g-4-2', name: '邱柏瀚', isGuest: false },
      { id: 'g-4-3', name: '黃佳琪', isGuest: false },
    ],
    // 列 5：馬廷軒 / 林育群 / 蘇冠霖 / 洪麗卿
    [
      { id: 'g-5-0', name: '馬廷軒', isGuest: false },
      { id: 'g-5-1', name: '林育群', isGuest: false },
      { id: 'g-5-2', name: '蘇冠霖', isGuest: false },
      { id: 'g-5-3', name: '洪麗卿', isGuest: false },
    ],
    // 列 6：譚旭良(導生，馬廷軒旁邊) / 林子晏(攝影，中間走道靠後) / 陳平(蘇冠霖正後方) / 王建豐
    [
      { id: 'g-6-0', name: '譚旭良', isGuest: false },
      { id: 'g-6-1', name: '林子晏', isGuest: false, isPhoto: true },
      { id: 'g-6-2', name: '陳平', isGuest: false },
      { id: 'g-6-3', name: '王建豐', isGuest: false },
    ],
    // 列 7：梁文齡 / 黃嘉琪 / 邱孟婷 / 戴嘉慧
    [
      { id: 'g-7-0', name: '梁文齡', isGuest: false },
      { id: 'g-7-1', name: '黃嘉琪', isGuest: false },
      { id: 'g-7-2', name: '邱孟婷', isGuest: false },
      { id: 'g-7-3', name: '戴嘉慧', isGuest: false },
    ],
    // 列 8：林塏秢 / 張媁淇(代理) / 韓政諺(代理) / 黃柔涵
    [
      { id: 'g-8-0', name: '林塏秢', isGuest: false },
      { id: 'g-8-1', name: '張媁淇', isGuest: false, role: '代理' },
      { id: 'g-8-2', name: '韓政諺', isGuest: false, role: '代理' },
      { id: 'g-8-3', name: '黃柔涵', isGuest: false },
    ],
    // 列 9：黃杰(代理) / (空) / (空) / (空)
    [
      { id: 'g-9-0', name: '黃杰', isGuest: false, role: '代理' },
      null,
      null,
      null,
    ],
  ],

  sidebar: [],
};
