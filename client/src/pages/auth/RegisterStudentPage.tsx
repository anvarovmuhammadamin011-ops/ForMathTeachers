import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, School } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { api, errorMessage } from '@/lib/api';

interface JoinCodeInfo {
  classroom: { name: string; teacherName: string };
}

export default function RegisterStudentPage() {
  const { registerStudent, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    confirm: '',
    joinCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeState, setCodeState] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    classroom?: { name: string; teacherName: string };
    message?: string;
  }>({ status: 'idle' });

  useEffect(() => {
    if (user) navigate(user.role === 'TEACHER' ? '/teacher' : '/student', { replace: true });
  }, [user, navigate]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function checkCode() {
    const code = form.joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setCodeState({ status: 'idle' });
      return;
    }
    setCodeState({ status: 'checking' });
    try {
      const data = await api<JoinCodeInfo>(`/api/auth/join-code/${encodeURIComponent(code)}`);
      setCodeState({ status: 'valid', classroom: data.classroom });
    } catch (err) {
      setCodeState({ status: 'invalid', message: errorMessage(err) });
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (form.firstName.trim().length < 2 || form.lastName.trim().length < 2) {
      setError('Ism va familiyani to‘liq kiriting.');
      return;
    }
    if (!/^[a-zA-Z0-9._@+-]{3,60}$/.test(form.username.trim())) {
      setError('Username kamida 3 belgi; faqat harf, raqam va . _ @ + - bo‘lishi mumkin.');
      return;
    }
    if (form.password.length < 8) {
      setError('Parol kamida 8 belgidan iborat bo‘lishi kerak.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Parollar bir xil emas.');
      return;
    }
    if (form.joinCode.trim().length < 4) {
      setError('Sinf qo‘shilish kodini kiriting.');
      return;
    }
    setLoading(true);
    try {
      await registerStudent({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        password: form.password,
        joinCode: form.joinCode.trim().toUpperCase(),
      });
      navigate('/student', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="O‘quvchi sifatida ro‘yxatdan o‘tish"
      subtitle="Sinf qo‘shilish kodi orqali o‘qituvchingizning sinfiga qo‘shiling."
      footer={
        <p>
          Hisobingiz bormi?{' '}
          <Link to="/kirish" className="font-semibold text-primary hover:underline">
            Kirish
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-soft/60 p-3.5 text-sm text-danger-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ism" htmlFor="firstName" required>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(event) => update('firstName', event.target.value)}
              placeholder="Muhammadamin"
              autoComplete="given-name"
            />
          </Field>
          <Field label="Familiya" htmlFor="lastName" required>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(event) => update('lastName', event.target.value)}
              placeholder="Toshmatov"
              autoComplete="family-name"
            />
          </Field>
        </div>

        <Field label="Username" htmlFor="username" required>
          <Input
            id="username"
            value={form.username}
            onChange={(event) => update('username', event.target.value)}
            placeholder="muhammadamin"
            autoComplete="username"
          />
        </Field>

        <Field label="Sinf qo‘shilish kodi" htmlFor="joinCode" required>
          <div className="relative">
            <Input
              id="joinCode"
              value={form.joinCode}
              onChange={(event) => {
                update('joinCode', event.target.value.toUpperCase());
                setCodeState({ status: 'idle' });
              }}
              onBlur={checkCode}
              placeholder="8A2026"
              className="pr-11 font-mono uppercase tracking-[0.18em]"
              maxLength={12}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {codeState.status === 'checking' && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {codeState.status === 'valid' && <CheckCircle2 className="h-4 w-4 text-success" />}
            </div>
          </div>
          {codeState.status === 'valid' && codeState.classroom && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-xs text-success-foreground">
              <School className="h-4 w-4" />
              <span>
                <strong>{codeState.classroom.name}</strong> sinfi — {codeState.classroom.teacherName}
              </span>
            </div>
          )}
          {codeState.status === 'invalid' && (
            <p className="mt-2 text-xs font-medium text-danger">{codeState.message}</p>
          )}
          {codeState.status === 'idle' && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Kodni o‘qituvchingiz beradi. Kod kiritilgach avtomatik tekshiriladi.
            </p>
          )}
        </Field>

        <Field label="Parol" htmlFor="password" hint="Kamida 8 belgi." required>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition hover:bg-muted"
              aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Field label="Parolni tasdiqlang" htmlFor="confirm" required>
          <Input
            id="confirm"
            type={showPassword ? 'text' : 'password'}
            value={form.confirm}
            onChange={(event) => update('confirm', event.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Ro‘yxatdan o‘tish
        </Button>
      </form>
    </AuthLayout>
  );
}
