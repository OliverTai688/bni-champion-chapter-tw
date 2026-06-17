'use client';

import * as React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';

type ThemeValue = 'light' | 'system' | 'dark';

const OPTIONS: { value: ThemeValue; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: '淺色', Icon: Sun },
  { value: 'system', label: '系統', Icon: Monitor },
  { value: 'dark', label: '深色', Icon: Moon },
];

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const current: ThemeValue = (mounted ? (theme as ThemeValue) : 'system') ?? 'system';

  const handleSelect = (value: ThemeValue, event: React.MouseEvent<HTMLButtonElement>) => {
    if (value === current) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const supportsVT =
      typeof document !== 'undefined' &&
      typeof document.startViewTransition === 'function';

    if (!supportsVT || prefersReducedMotion) {
      setTheme(value);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    document.documentElement.style.setProperty('--reveal-x', `${x}px`);
    document.documentElement.style.setProperty('--reveal-y', `${y}px`);
    document.documentElement.style.setProperty('--reveal-r', `${endRadius}px`);

    // Determine if the reveal should look like darkness arriving or daylight arriving
    const nextResolved = value === 'system' ? resolvedTheme : value;
    document.documentElement.setAttribute('data-theme-reveal', nextResolved === 'dark' ? 'dark' : 'light');

    document.startViewTransition(() => {
      setTheme(value);
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label="主題切換"
      className="
        relative inline-flex items-center gap-0.5 rounded-full
        border border-black/10 bg-white/80 p-1 shadow-sm backdrop-blur-md
        dark:border-white/10 dark:bg-white/[0.04]
      "
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={(e) => handleSelect(value, e)}
            className="
              relative z-10 flex h-8 w-8 items-center justify-center rounded-full
              text-black/50 transition-colors duration-200
              hover:text-black focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-black/30 dark:text-white/50 dark:hover:text-white
              dark:focus-visible:ring-white/30
              data-[active=true]:text-white dark:data-[active=true]:text-black
            "
            data-active={active}
          >
            {active && (
              <motion.span
                layoutId="theme-toggle-pill"
                aria-hidden
                className="absolute inset-0 rounded-full bg-black dark:bg-white"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <Icon className="relative h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
