import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  LogIn,
  School,
} from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/api';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<'TEACHER' | 'STUDENT' | null>(null);

  useEffect(() => {
    if (user) navigate(user.role === 'TEACHER' ? '/teacher' : '/student', { replace: true });
  }, [user, navigate]);

  function redirectAfterLogin(role: 'TEACHER' | 'STUDENT') {
    const from = (location.state as { from?: string } | null)?.from;
    const target = role === 'TEACHER' ? '/teacher' : '/student';
    navigate(from && from.startsWith(target) ? from : target, { replace: true });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Username va parolni kiriting.');
      return;
    }
    setLoading(true);
    try {
      const loggedIn = await login(username.trim(), password);
      redirectAfterLogin(loggedIn.role);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(role: 'TEACHER' | 'STUDENT') {
    if (loading || demoLoading) return;
    const demo =
      role === 'TEACHER'
        ? { username: 'oqituvchi', password: 'teacher123' }
        : { username: 'oquvchi', password: 'student123' };
    setError('');
    setUsername(demo.username);
    setPassword(demo.password);
    setDemoLoading(role);
    try {
      const loggedIn = await login(demo.username, demo.password);
      redirectAfterLogin(loggedIn.role);
    } catch (err) {
      setError(
        `${errorMessage(err)} Demo hisoblar mavjud emas — serverda "npm run seed" buyrug‘ini ishga tushiring.`,
      );
    } finally {
      setDemoLoading(null);
    }
  }

  return (
    <AuthLayout
      title="Tizimga kirish"
      subtitle="O‘qituvchi yoki o‘quvchi hisobingiz bilan davom eting."
      footer={
        <div className="space-y-3">
          <p>
            Hisobingiz yo‘qmi?{' '}
            <Link to="/royxatdan-otish/oqituvchi" className="font-semibold text-primary hover:underline">
              O‘qituvchi
            </Link>{' '}
            yoki{' '}
            <Link to="/royxatdan-otish/oquvchi" className="font-semibold text-primary hover:underline">
              o‘quvchi
            </Link>{' '}
            bo‘lib ro‘yxatdan o‘ting.
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-soft/60 p-3.5 text-sm text-danger-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Field label="Username" htmlFor="username" required>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            placeholder="masalan: oqituvchi"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoFocus
          />
        </Field>

        <Field label="Parol" htmlFor="password" required>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Parolingiz"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {!loading && <LogIn className="h-4 w-4" />}
          Kirish
        </Button>
      </form>

      <div className="mt-5 rounded-xl border border-border bg-soft/60 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-primary-700">Demo hisoblar</p>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            Bir bosishda kirish
          </span>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleDemoLogin('TEACHER')}
            disabled={loading || demoLoading !== null}
            className="flex items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-2 text-left text-xs transition hover:border-primary/40 disabled:pointer-events-none disabled:opacity-60"
          >
            {demoLoading === 'TEACHER' ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <School className="h-4 w-4 text-primary" />
            )}
            <span>
              <span className="block font-semibold text-foreground">
                Matematika o‘qituvchisi
              </span>
              <span className="text-muted-foreground">oqituvchi / teacher123</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => void handleDemoLogin('STUDENT')}
            disabled={loading || demoLoading !== null}
            className="flex items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-2 text-left text-xs transition hover:border-primary/40 disabled:pointer-events-none disabled:opacity-60"
          >
            {demoLoading === 'STUDENT' ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <GraduationCap className="h-4 w-4 text-primary" />
            )}
            <span>
              <span className="block font-semibold text-foreground">O‘quvchi</span>
              <span className="text-muted-foreground">oquvchi / student123</span>
            </span>
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Demo hisoblar serverda <code className="rounded bg-white/80 px-1 py-0.5">npm run seed</code>{' '}
          buyrug‘i bilan yaratiladi.
        </p>
      </div>
    </AuthLayout>
  );
}
