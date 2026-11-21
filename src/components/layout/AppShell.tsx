import type { ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Download,
  Dumbbell,
  PersonStanding,
  Settings,
  Upload,
  WifiOff,
} from 'lucide-react';
import type { AppTab } from '@/types/workout';

interface NavItem {
  id: AppTab;
  label: string;
  shortLabel: string;
  icon: typeof BarChart3;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Statistics', shortLabel: 'Stats', icon: Activity },
  { id: 'distribution', label: 'Muscle Distribution', shortLabel: 'Radar', icon: BarChart3 },
  { id: 'body', label: 'Body Distribution', shortLabel: 'Body', icon: PersonStanding },
  { id: 'exercises', label: 'Main Exercises', shortLabel: 'Exercises', icon: Dumbbell },
  { id: 'calendar', label: 'Calendar', shortLabel: 'Calendar', icon: CalendarDays },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
];

interface AppShellProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  workoutCount: number;
  onOpenImport: () => void;
  canInstallPwa?: boolean;
  isOnline?: boolean;
  onInstallPwa?: () => void;
  children: ReactNode;
}

export function AppShell({
  activeTab,
  onSelectTab,
  workoutCount,
  onOpenImport,
  canInstallPwa = false,
  isOnline = true,
  onInstallPwa,
  children,
}: AppShellProps) {
  const currentNav = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-heavy-bg text-heavy-text flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 border-r border-heavy-border bg-heavy-surface/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-heavy-border">
          <div className="w-9 h-9 rounded-xl bg-heavy-blue/15 border border-heavy-blue/40 flex items-center justify-center text-heavy-blue">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm tracking-tight text-white">Heavy Report</p>
            <p className="text-[11px] text-heavy-muted">
              {workoutCount} {workoutCount === 1 ? 'workout' : 'workouts'} stored
            </p>
          </div>
        </div>

        <div className="p-3 space-y-2">
          <button
            type="button"
            onClick={onOpenImport}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-heavy-blue hover:bg-heavy-blue/90 active:scale-[0.99] text-white font-medium text-sm transition cursor-pointer shadow-lg shadow-heavy-blue/20"
          >
            <Upload className="w-4 h-4" />
            Import Heavy CSV
          </button>

          {canInstallPwa && onInstallPwa && (
            <button
              type="button"
              onClick={onInstallPwa}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-heavy-surface-elevated hover:bg-heavy-border text-heavy-text border border-heavy-border font-medium text-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-heavy-blue" />
              Install App (PWA)
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-heavy-blue/15 text-heavy-blue border border-heavy-blue/30'
                    : 'text-heavy-muted hover:text-heavy-text hover:bg-heavy-surface-elevated border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-heavy-border text-[11px] text-heavy-subtle flex items-center justify-between">
          <span>100% Local · IndexedDB</span>
          {!isOnline ? (
            <span className="inline-flex items-center gap-1 text-amber-400">
              <WifiOff className="w-3 h-3" />
              Offline
            </span>
          ) : (
            <span>PWA Ready</span>
          )}
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:pl-64 min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-14 md:h-16 px-4 md:px-8 border-b border-heavy-border bg-heavy-bg/90 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="md:hidden w-8 h-8 rounded-lg bg-heavy-blue/15 border border-heavy-blue/40 flex items-center justify-center text-heavy-blue">
              <Activity className="w-4 h-4" />
            </div>
            <h1 className="text-base md:text-lg font-semibold tracking-tight text-white">
              {currentNav.label}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <WifiOff className="w-3 h-3" />
                Offline
              </span>
            )}
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-heavy-surface border border-heavy-border text-heavy-muted">
              {workoutCount} {workoutCount === 1 ? 'workout' : 'workouts'}
            </span>
            <button
              type="button"
              onClick={onOpenImport}
              className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-heavy-blue text-white text-xs font-medium active:scale-95 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 px-4 py-5 md:px-8 md:py-6 pb-24 md:pb-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-heavy-border bg-heavy-surface/95 backdrop-blur-md px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-6 gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 rounded-lg transition cursor-pointer ${
                  isActive ? 'text-heavy-blue' : 'text-heavy-muted'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-medium leading-tight truncate max-w-full">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
