import { BookOpen, Moon, Play, Sun } from 'lucide-react';
import { AppView } from '../types/exam';

interface TopNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onStartFullMock: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const NAV_ITEMS: { id: AppView; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'chapters', label: 'Chapters' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'history', label: 'History' },
  { id: 'question-bank', label: 'Question Bank' },
];

export function TopNav({
  currentView,
  onNavigate,
  onStartFullMock,
  theme,
  onToggleTheme,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:gap-8 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white dark:bg-blue-600">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-display text-sm font-bold tracking-tight text-slate-900 sm:text-base dark:text-slate-100">
            NISM Series V-A Prep
          </span>
        </button>

        {/* Zone 2: Concise single-line navigation links (Desktop & Tablet) */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded ${
                  active
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute inset-x-0 -bottom-[19px] h-0.5 bg-blue-700 dark:bg-blue-400"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action + Theme toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onStartFullMock}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800 sm:px-3.5 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Start Mock</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Responsive Mobile & Small Tablet Navigation Strip */}
      <nav
        aria-label="Mobile Navigation"
        className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden dark:border-slate-800"
      >
        {NAV_ITEMS.map((item) => {
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
