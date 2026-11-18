'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { LIFF_ID, isLineInAppBrowser } from '@/lib/line-client';

// One attempt per tab: a failed or refused LIFF login must not loop.
const ATTEMPT_KEY = 'take-seat-liff-attempt';

function alreadyTried() {
  try {
    if (sessionStorage.getItem(ATTEMPT_KEY)) return true;
    sessionStorage.setItem(ATTEMPT_KEY, '1');
  } catch {
    // Storage blocked: still try once for this page load.
  }
  return false;
}

async function hasSession() {
  try {
    const response = await fetch('/api/auth/session', { cache: 'no-store' });
    if (!response.ok) return false;
    const session = (await response.json()) as { user?: unknown } | null;
    return Boolean(session?.user);
  } catch {
    return false;
  }
}

/**
 * Inside LINE, signs the visitor in with their LINE account without a login screen.
 * LIFF must also initialise on the endpoint root, where LINE lands with `liff.state`
 * before forwarding to the requested path. Outside LINE, or without a LIFF id, it does nothing.
 */
export function LiffBoot() {
  const router = useRouter();

  useEffect(() => {
    if (!LIFF_ID || !isLineInAppBrowser(navigator.userAgent)) return;
    let cancelled = false;

    (async () => {
      const { default: liff } = await import('@line/liff');
      await liff.init({ liffId: LIFF_ID });
      if (cancelled || !liff.isInClient()) return;
      if (await hasSession()) return;
      if (alreadyTried()) return;

      const idToken = liff.getIDToken();
      if (!idToken) return;
      const result = await signIn('liff', { idToken, redirect: false });
      if (!cancelled && result?.ok && !result.error) router.refresh();
    })().catch((error: unknown) => {
      console.error('[liff] auto login failed', error instanceof Error ? error.message : error);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
