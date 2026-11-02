import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  School,
  Trophy,
  X,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { cn, fullName, initials } from '@/lib/utils';

const teacherNav = [
  { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true },
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

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nav = user?.role === 'TEACHER' ? teacherNav : studentNav;

  useEffect(() => {
    onNavigate?.();
  }, [location.pathname, onNavigate]);

  if (!user) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[76px] items-center px-5">
        <Brand />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {user.role === 'TEACHER' && (
          <div className="mb-5 px-1">
            <Button asChild className="w-full justify-start shadow-sm" size="lg">
              <Link to="/teacher/tests/new">
                <Plus className="h-4 w-4" />
                Yangi test yaratish
              </Link>
            </Button>
          </div>
        )}

        <nav className="space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-soft text-primary-700'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
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
                  {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 rounded-xl border border-border bg-gradient-to-br from-soft to-white p-3.5">
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

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">
            {initials(user)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{fullName(user)}</p>
            <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
          </div>
          <button
            type="button"
            title="Chiqish"
            aria-label="Chiqish"
            onClick={async () => {
              await logout();
              navigate('/kirish');
            }}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger-soft hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-border bg-white lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-[286px] animate-slide-in-right border-r border-border bg-white shadow-pop">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg p-2 text-muted-foreground hover:bg-muted"
              aria-label="Menyuni yopish"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-white/85 px-4 backdrop-blur-md lg:hidden">
          <Brand />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-foreground"
            aria-label="Menyuni ochish"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
          <footer className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} MathTest AI</p>
            <p>
              {user?.role === 'TEACHER'
                ? 'Matematika o‘qituvchilari uchun AI platforma'
                : 'Bilim — eng katta boylik'}
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
