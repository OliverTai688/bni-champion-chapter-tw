'use client';

import { LiffBoot } from '@/components/liff-boot';
import { ThemeProvider } from '@/components/theme-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <LiffBoot />
      {children}
    </ThemeProvider>
  );
}
