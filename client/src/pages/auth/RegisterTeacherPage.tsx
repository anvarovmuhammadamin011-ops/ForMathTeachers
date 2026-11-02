import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/api';

export default function RegisterTeacherPage() {
  const { registerTeacher, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    schoolName: '',
    password: '',
    confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === 'TEACHER' ? '/teacher' : '/student', { replace: true });
  }, [user, navigate]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (form.firstName.trim().length < 2 || form.lastName.trim().length < 2) {
      setError('Ism va familiyani to‘liq kiriting.');
      return;
    }
    if (form.schoolName.trim().length < 2) {
      setError('Maktab nomini kiriting.');
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
    setLoading(true);
    try {
      await registerTeacher({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        password: form.password,
        schoolName: form.schoolName.trim(),
      });
      navigate('/teacher', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="O‘qituvchi sifatida ro‘yxatdan o‘tish"
      subtitle="Hisob yarating, sinf oching va PDF testlarni AI bilan avtomatlashtiring."
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
              placeholder="Aziza"
              autoComplete="given-name"
            />
          </Field>
          <Field label="Familiya" htmlFor="lastName" required>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(event) => update('lastName', event.target.value)}
              placeholder="Karimova"
              autoComplete="family-name"
            />
          </Field>
        </div>

        <Field
          label="Username"
          htmlFor="username"
          hint="Tizimga kirish uchun ishlatiladi (email ham bo‘lishi mumkin)."
          required
        >
          <Input
            id="username"
            value={form.username}
            onChange={(event) => update('username', event.target.value)}
            placeholder="aziza.karimova"
            autoComplete="username"
          />
        </Field>

        <Field label="Maktab nomi" htmlFor="schoolName" required>
          <Input
            id="schoolName"
            value={form.schoolName}
            onChange={(event) => update('schoolName', event.target.value)}
            placeholder="25-son umumta’lim maktabi"
            autoComplete="organization"
          />
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
          {!loading && <ArrowRight className="h-4 w-4" />}
          Ro‘yxatdan o‘tish
        </Button>
      </form>
    </AuthLayout>
  );
}
