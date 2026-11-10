import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  AtSign,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  LogOut,
  Save,
  School,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api';
import { cn, fullName, initials } from '@/lib/utils';

type Tab = 'profile' | 'security';
type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

const strengthLabels = ['Juda zaif', 'Zaif', 'O‘rtacha', 'Yaxshi', 'Kuchli'];
const strengthColors = ['bg-slate-300', 'bg-rose-400', 'bg-amber-400', 'bg-primary', 'bg-emerald-500'];

function passwordScore(value: string) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-zA-Z]/.test(value) && /\d/.test(value)) score += 1;
  if (value.length >= 12) score += 1;
  if (/[^a-zA-Z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="pr-11"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition hover:bg-white/80 hover:text-foreground"
        aria-label={show ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function ProfileDialog({
  open,
  onOpenChange,
  onLogout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout?: () => Promise<void>;
}) {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('profile');
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    username: user?.username ?? '',
    schoolName: user?.schoolName ?? '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordVisible, setPasswordVisible] = useState<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab('profile');
    setProfileForm({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      username: user?.username ?? '',
      schoolName: user?.schoolName ?? '',
    });
    setProfileError('');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    // Faqat dialog ochilganda sinxronlash kifoya.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isTeacher = user?.role === 'TEACHER';
  const initial = useMemo(
    () => ({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      username: user?.username ?? '',
      schoolName: user?.schoolName ?? '',
    }),
    [user],
  );

  const isDirty =
    profileForm.firstName.trim() !== initial.firstName ||
    profileForm.lastName.trim() !== initial.lastName ||
    profileForm.username.trim() !== initial.username ||
    (profileForm.schoolName.trim() || '') !== (initial.schoolName || '');

  const score = passwordScore(passwordForm.newPassword);
  const passwordsMatch =
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.newPassword === passwordForm.confirmPassword;
  const passwordReady =
    passwordForm.currentPassword.length > 0 &&
    passwordForm.newPassword.length >= 8 &&
    passwordsMatch;

  function resetProfileForm() {
    setProfileForm({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      username: user?.username ?? '',
      schoolName: user?.schoolName ?? '',
    });
    setProfileError('');
  }

  async function handleProfileSave(event: FormEvent) {
    event.preventDefault();
    setProfileError('');
    if (!profileForm.firstName.trim()) {
      setProfileError('Ism majburiy.');
      return;
    }
    if (!profileForm.lastName.trim()) {
      setProfileError('Familiya majburiy.');
      return;
    }
    if (!profileForm.username.trim()) {
      setProfileError('Login majburiy.');
      return;
    }

    setProfileSaving(true);
    try {
      const updated = await updateProfile({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        username: profileForm.username.trim(),
        schoolName: profileForm.schoolName.trim() || null,
      });
      setProfileForm({
        firstName: updated.firstName,
        lastName: updated.lastName,
        username: updated.username,
        schoolName: updated.schoolName ?? '',
      });
      toast.success('Profil yangilandi', `${updated.firstName} ${updated.lastName}`);
    } catch (err) {
      setProfileError(errorMessage(err));
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(event: FormEvent) {
    event.preventDefault();
    setPasswordError('');
    if (!passwordForm.currentPassword) {
      setPasswordError('Joriy parolni kiriting.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Yangi parol kamida 8 belgidan iborat bo‘lishi kerak.');
      return;
    }
    if (!passwordsMatch) {
      setPasswordError('Yangi parollar mos kelmadi.');
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Parol o‘zgartirildi', 'Yangi parol saqlandi.');
    } catch (err) {
      setPasswordError(errorMessage(err));
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      if (onLogout) await onLogout();
      else await logout();
      onOpenChange(false);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogTitle className="sr-only">Profil sozlamalari</DialogTitle>
        <DialogDescription className="sr-only">
          Shaxsiy ma’lumotlarni tahrirlash va parolni o‘zgartirish.
        </DialogDescription>

        <div className="-mx-5 -mt-5 sm:-mx-6 sm:-mt-6">
          <div className="relative h-24 overflow-hidden bg-gradient-to-br from-primary-500 via-primary-700 to-indigo-900 sm:h-28">
            <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
            <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-cyan-300/25 blur-2xl" />
            <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.45)_1px,transparent_0)] [background-size:18px_18px]" />
            <div className="absolute left-5 top-3.5 flex items-center gap-1.5 text-[11px] font-medium text-blue-100/85 sm:left-6">
              <Sparkles className="h-3.5 w-3.5" />
              MathTest AI hisobingiz
            </div>
          </div>

          <div className="px-5 sm:px-6">
            <div className="relative z-10 -mt-9 flex items-end justify-between gap-3">
              <div className="flex min-w-0 items-end gap-3.5">
                <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-primary-700 to-indigo-800 font-display text-2xl font-extrabold text-white shadow-glass-lg ring-4 ring-white/80 sm:h-20 sm:w-20 sm:text-[26px]">
                  {user ? initials(user) : '—'}
                </div>
                <div className="min-w-0 pb-1">
                  <h2 className="truncate font-display text-lg font-extrabold leading-tight text-foreground sm:text-xl">
                    {user ? fullName(user) : 'Profil'}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    @{user?.username ?? '—'}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="mb-1 hidden shrink-0 items-center gap-1.5 border-white/80 bg-white/75 px-2.5 py-1 text-[11px] sm:inline-flex"
              >
                {isTeacher ? (
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                )}
                {isTeacher ? 'O‘qituvchi' : 'O‘quvchi'}
              </Badge>
            </div>

            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground sm:hidden">
              {isTeacher ? (
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
              ) : (
                <BookOpen className="h-3.5 w-3.5 text-primary" />
              )}
              {isTeacher ? 'O‘qituvchi' : 'O‘quvchi'} hisobi
            </div>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Profil bo‘limlari"
          className="grid grid-cols-2 gap-1 rounded-xl border border-white/60 bg-white/55 p-1 backdrop-blur-md"
        >
          <button
            type="button"
            role="tab"
            id="profile-tab"
            aria-selected={tab === 'profile'}
            aria-controls="profile-panel"
            onClick={() => setTab('profile')}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200',
              tab === 'profile'
                ? 'bg-white text-primary-700 shadow-sm ring-1 ring-white/70'
                : 'text-muted-foreground hover:bg-white/60 hover:text-foreground',
            )}
          >
            <UserRound className="h-4 w-4" />
            Profil
          </button>
          <button
            type="button"
            role="tab"
            id="security-tab"
            aria-selected={tab === 'security'}
            aria-controls="security-panel"
            onClick={() => setTab('security')}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200',
              tab === 'security'
                ? 'bg-white text-primary-700 shadow-sm ring-1 ring-white/70'
                : 'text-muted-foreground hover:bg-white/60 hover:text-foreground',
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            Xavfsizlik
          </button>
        </div>

        {tab === 'profile' ? (
          <form
            id="profile-panel"
            role="tabpanel"
            aria-labelledby="profile-tab"
            onSubmit={handleProfileSave}
            className="space-y-4"
            noValidate
          >
            {profileError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-soft/70 p-3 text-sm text-danger-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Ism" htmlFor="firstName" required>
                <Input
                  id="firstName"
                  value={profileForm.firstName}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, firstName: event.target.value }))
                  }
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Familiya" htmlFor="lastName" required>
                <Input
                  id="lastName"
                  value={profileForm.lastName}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, lastName: event.target.value }))
                  }
                  autoComplete="family-name"
                />
              </Field>
            </div>

            <Field label="Login" htmlFor="username" required hint="Bu login bilan tizimga kirasiz.">
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  value={profileForm.username}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  className="pl-9"
                  autoComplete="username"
                />
              </div>
            </Field>

            <Field
              label="Maktab yoki telefon"
              htmlFor="schoolName"
              hint="Ixtiyoriy — maktab nomi yoki aloqa uchun telefon raqami."
            >
              <div className="relative">
                <School className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="schoolName"
                  value={profileForm.schoolName}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, schoolName: event.target.value }))
                  }
                  className="pl-9"
                  placeholder="+998 90 123 45 67"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </div>
            </Field>

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-muted-foreground">
                {isDirty ? 'Saqlanmagan o‘zgarishlar bor.' : 'Barcha o‘zgarishlar saqlangan.'}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetProfileForm}
                  disabled={!isDirty || profileSaving}
                  className="w-full sm:w-auto"
                >
                  Qaytarish
                </Button>
                <Button
                  type="submit"
                  loading={profileSaving}
                  disabled={!isDirty}
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4" />
                  Saqlash
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <form
            id="security-panel"
            role="tabpanel"
            aria-labelledby="security-tab"
            onSubmit={handlePasswordSave}
            className="space-y-4"
            noValidate
          >
            {passwordError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-soft/70 p-3 text-sm text-danger-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="rounded-xl border border-white/60 bg-white/50 p-3 text-xs leading-relaxed text-muted-foreground backdrop-blur-sm">
              Parol kamida 8 belgidan iborat bo‘lsin. Harf, raqam va belgilar aralashmasi
              xavfsizlikni oshiradi.
            </div>

            <Field label="Joriy parol" htmlFor="currentPassword" required>
              <PasswordInput
                id="currentPassword"
                value={passwordForm.currentPassword}
                onChange={(value) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: value }))
                }
                show={passwordVisible.currentPassword}
                onToggle={() =>
                  setPasswordVisible((prev) => ({
                    ...prev,
                    currentPassword: !prev.currentPassword,
                  }))
                }
                autoComplete="current-password"
                placeholder="Hozirgi parolingiz"
              />
            </Field>

            <Field
              label="Yangi parol"
              htmlFor="newPassword"
              required
              hint="Kamida 8 belgi."
            >
              <PasswordInput
                id="newPassword"
                value={passwordForm.newPassword}
                onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
                show={passwordVisible.newPassword}
                onToggle={() =>
                  setPasswordVisible((prev) => ({ ...prev, newPassword: !prev.newPassword }))
                }
                autoComplete="new-password"
                placeholder="Yangi parol"
              />
            </Field>

            {passwordForm.newPassword.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((index) => (
                    <span
                      key={index}
                      className={cn(
                        'h-1.5 flex-1 rounded-full transition-colors',
                        index < score ? strengthColors[score] : 'bg-slate-200/80',
                      )}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Parol kuchi:{' '}
                  <span className="font-semibold text-foreground">{strengthLabels[score]}</span>
                </p>
              </div>
            )}

            <Field label="Yangi parolni qayta kiriting" htmlFor="confirmPassword" required>
              <PasswordInput
                id="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={(value) =>
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))
                }
                show={passwordVisible.confirmPassword}
                onToggle={() =>
                  setPasswordVisible((prev) => ({
                    ...prev,
                    confirmPassword: !prev.confirmPassword,
                  }))
                }
                autoComplete="new-password"
                placeholder="Parolni takrorlang"
              />
              {passwordForm.confirmPassword.length > 0 && (
                <p
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium',
                    passwordsMatch ? 'text-success' : 'text-danger',
                  )}
                >
                  {passwordsMatch ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Parollar mos keladi
                    </>
                  ) : (
                    <>
                      <X className="h-3.5 w-3.5" /> Parollar mos kelmadi
                    </>
                  )}
                </p>
              )}
            </Field>

            <Button
              type="submit"
              variant="secondary"
              loading={passwordSaving}
              disabled={!passwordReady}
              className="w-full"
            >
              <ShieldCheck className="h-4 w-4" />
              Parolni yangilash
            </Button>
          </form>
        )}

        <div className="-mx-5 mt-1 flex flex-col-reverse gap-2 border-t border-white/60 bg-white/75 px-5 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 sm:sticky sm:bottom-0 sm:z-10 sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[11px] text-muted-foreground">MathTest AI · Profil va xavfsizlik</p>
          <Button
            variant="danger"
            onClick={handleLogout}
            loading={loggingOut}
            className="w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4" />
            Chiqish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
