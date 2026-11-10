import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  ChevronRight,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Plus,
  School,
  Trophy,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { cn, fullName, initials } from '@/lib/utils';
import { ProfileDialog } from '@/components/profile-dialog';

const teacherNav = [
  { to: '/teacher', label: 'Asosiy', icon: LayoutDashboard, end: true },
  { to: '/teacher/classrooms', label: 'Sinflarim', icon: School },
  { to: '/teacher/tests', label: 'Testlarim', icon: FileText },
  { to: '/teacher/results', label: 'Natijalar', icon: BarChart3 },
  { to: '/teacher/ranking', label: 'Reyting', icon: Trophy },
];

const studentNav = [
  { to: '/student', label: 'Bosh sahifa', icon: LayoutDashboard, end: true },
  { to: '/student/tests', label: 'Testlarim', icon: FileText },
  { to: '/student/results', label: 'Natijalarim', icon: BarChart3 },
  { to: '/student/ranking', label: 'Reyting', icon: Trophy },
];

function Avatar({ className }: { className?: string }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <span
      className={cn(
        'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-700 text-[11px] font-bold text-white shadow-glass-sm ring-2 ring-white/70',
        className,
      )}
    >
      {initials(user)}
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
    </span>
  );
}

function SidebarContent({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { user } = useAuth();
  const nav = user?.role === 'TEACHER' ? teacherNav : studentNav;

  if (!user) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[76px] items-center px-5">
        <Brand />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {user.role === 'TEACHER' && (
          <div className="mb-5 px-1">
            <Button asChild className="w-full justify-start" size="lg">
              <Link to="/teacher/tests/new">
                <Plus className="h-4 w-4" />
                Yangi test yaratish
              </Link>
            </Button>
          </div>
        )}

        <nav className="space-y-1.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-white/70 bg-white/80 text-primary-700 shadow-glass-sm'
                    : 'border-transparent text-muted-foreground hover:border-white/50 hover:bg-white/45 hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'h-[18px] w-[18px] shrink-0 transition',
                      isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600',
                    )}
                  />
                  {item.label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gradient-to-br from-primary-500 to-indigo-500 shadow-sm" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 rounded-2xl border border-white/60 bg-gradient-to-br from-white/75 to-primary-50/60 p-3.5 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-primary-700">
            <GraduationCap className="h-4 w-4" />
            <p className="text-xs font-bold uppercase tracking-wide">
              {user.role === 'TEACHER' ? 'O‘qituvchi' : 'O‘quvchi'}
            </p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {user.role === 'TEACHER'
              ? 'PDF yuklang — AI savollarni yechib, test tayyorlaydi.'
              : 'Testlarni yeching va sinf reytingida o‘z o‘rningizni ko‘ring.'}
          </p>
        </div>
      </div>

      <div className="border-t border-white/50 p-3">
        <button
          type="button"
          onClick={onOpenProfile}
          className="group flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/55 p-2.5 text-left backdrop-blur-xl transition-all duration-200 hover:border-white/80 hover:bg-white/85 hover:shadow-glass-sm"
        >
          <Avatar className="h-10 w-10 text-xs" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">{fullName(user)}</p>
            <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
        </button>
      </div>
    </div>
  );
}

export function AppShell() {
  const { user } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const nav = user?.role === 'TEACHER' ? teacherNav : studentNav;

  return (
    <div className="relative min-h-screen">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[30rem] w-[30rem] animate-float rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-28 top-20 h-[26rem] w-[26rem] animate-drift rounded-full bg-violet-400/15 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-[24rem] w-[24rem] animate-float rounded-full bg-cyan-300/15 blur-3xl [animation-delay:2s]" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-white/50 bg-white/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/50 lg:block">
        <SidebarContent onOpenProfile={() => setProfileOpen(true)} />
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/50 bg-white/70 px-4 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/50 lg:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            {user?.role === 'TEACHER' && (
              <Link
                to="/teacher/tests/new"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/70 bg-white/60 text-primary shadow-glass-sm backdrop-blur-md transition hover:bg-white/90"
                aria-label="Yangi test yaratish"
              >
                <Plus className="h-[18px] w-[18px]" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="rounded-full p-0.5 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Profilni ochish"
            >
              <Avatar />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1320px] px-4 pb-28 pt-5 sm:px-6 sm:py-8 lg:px-8 lg:pb-8">
          <Outlet />
          <footer className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-white/50 pt-5 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} MathTest AI</p>
            <p>
              {user?.role === 'TEACHER'
                ? 'Matematika o‘qituvchilari uchun AI platforma'
                : 'Bilim — eng katta boylik'}
            </p>
          </footer>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 lg:hidden" aria-label="Asosiy navigatsiya">
        <div className="border-t border-white/70 bg-white shadow-[0_-8px_30px_-18px_rgba(15,23,42,0.35)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/95">
          <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'group flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors',
                    isActive ? 'text-primary-700' : 'text-slate-500 hover:text-slate-700',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-8 w-10 items-center justify-center rounded-xl transition-all duration-200',
                        isActive
                          ? 'bg-primary/10 shadow-glass-sm ring-1 ring-primary/10'
                          : 'group-hover:bg-white/70',
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="max-w-full truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
