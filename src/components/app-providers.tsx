'use client';

import { SessionProvider } from 'next-auth/react';
import { LiffBoot } from '@/components/liff-boot';
import { ThemeProvider } from '@/components/theme-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <LiffBoot />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
