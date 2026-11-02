import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, GraduationCap, LogIn, School } from 'lucide-react';
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

  useEffect(() => {
    if (user) navigate(user.role === 'TEACHER' ? '/teacher' : '/student', { replace: true });
  }, [user, navigate]);

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
      const from = (location.state as { from?: string } | null)?.from;
      const target = loggedIn.role === 'TEACHER' ? '/teacher' : '/student';
      navigate(from && from.startsWith(target) ? from : target, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
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

      {import.meta.env.DEV && (
        <div className="mt-5 rounded-xl border border-border bg-soft/60 p-3.5">
          <p className="text-xs font-semibold text-primary-700">Demo hisoblar (seed qilingan)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setUsername('oqituvchi');
                setPassword('teacher123');
              }}
              className="flex items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-2 text-left text-xs transition hover:border-primary/40"
            >
              <School className="h-4 w-4 text-primary" />
              <span>
                <span className="block font-semibold text-foreground">O‘qituvchi</span>
                <span className="text-muted-foreground">oqituvchi / teacher123</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('oquvchi');
                setPassword('student123');
              }}
              className="flex items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-2 text-left text-xs transition hover:border-primary/40"
            >
              <GraduationCap className="h-4 w-4 text-primary" />
              <span>
                <span className="block font-semibold text-foreground">O‘quvchi</span>
                <span className="text-muted-foreground">oquvchi / student123</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
