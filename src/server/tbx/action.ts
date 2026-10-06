import 'server-only';

import type { ActionState } from '@/lib/tbx/action-state';

export type { ActionState };

export function ok(message = '已儲存'): ActionState {
  return { ok: true, message };
}

export function fail(error: unknown, fallback = '操作失敗，請再試一次。'): ActionState {
  const message = error instanceof Error && error.message ? error.message : fallback;
  return { ok: false, message };
}

export function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? value : null;
}

export function intValue(formData: FormData, key: string, fallback = 0) {
  const parsed = Number.parseInt(text(formData, key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function isObjectId(value: string) {
  return /^[a-f0-9]{24}$/i.test(value);
}
