// Shared labels and small formatters for the chamber toolbox (safe on client and server).

export type ParticipationStatusKey = 'expected' | 'present' | 'late' | 'absent' | 'medical' | 'substitute';

export const STATUS_LABEL: Record<ParticipationStatusKey, string> = {
  expected: '未到',
  present: '已簽到',
  late: '遲到',
  absent: '請假',
  medical: '病假',
  substitute: '代理',
};

// PALMS attendance codes, for exports and the scorecard.
export const STATUS_PALMS: Record<ParticipationStatusKey, string> = {
  expected: '',
  present: 'P',
  late: 'L',
  absent: 'A',
  medical: 'M',
  substitute: 'S',
};

export const LEADERSHIP_ROLES = [
  '主席',
  '副主席',
  '秘書財務',
  '來賓接待',
  '教育協調',
  '活動協調',
  '導師協調',
  '會員委員',
] as const;

export const EVENT_TYPE_LABEL: Record<string, string> = {
  weekly_meeting: '每週例會',
  activity: '活動',
  training: '培訓',
  social: '聯誼',
};

export function eventTypeLabel(value: string | null | undefined) {
  return EVENT_TYPE_LABEL[value ?? 'weekly_meeting'] ?? '活動';
}

const dateFormatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
});

const dateTimeFormatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const timeFormatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatEventDate(value: Date | string) {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return '';
  return dateTimeFormatter.format(new Date(value));
}

export function formatTime(value: Date | string | null | undefined) {
  if (!value) return '';
  return timeFormatter.format(new Date(value));
}

// YYYY-MM-DD in Taiwan time. Avoids the UTC off-by-one that bit /pre-leave.
export function taipeiDateKey(value: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
