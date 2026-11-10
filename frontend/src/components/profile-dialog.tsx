import { useState, type FormEvent } from 'react';
import { LogOut, Pencil, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/toast';

export function ProfileDialog({ open, onOpenChange, onLogout }: { open: boolean; onOpenChange: (open: boolean) => void; onLogout?: () => Promise<void> }) {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const toast = useToast();

  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    username: user?.username ?? '',
    schoolName: user?.schoolName ?? '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  function onChangeField(name: string, value: string) {
    setProfileForm((prev) => ({ ...prev, [name]: value }));
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
    setProfileLoading(true);
    try {
      const updated = await updateProfile({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        username: profileForm.username.trim(),
        schoolName: profileForm.schoolName.trim() || null,
      });
      toast.success('Profil yangilandi', `${updated.firstName} ${updated.lastName}`);
    } catch (err) {
      setProfileError(String(err));
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSave(event: FormEvent) {
    event.preventDefault();
    setPasswordError('');
    if (!passwordForm.currentPassword) {
      setPasswordError('Joriy parolni kiriting.');
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError('Yangi parolni kiriting.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Yangi parollar mos kelmadi.');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Parol o‘zgartirildi', 'Yangi parol saqlangan.');
    } catch (err) {
      setPasswordError(String(err));
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleLogout() {
    if (onLogout) await onLogout();
    else await logout();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profil
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <form onSubmit={handleProfileSave} className="space-y-3.5" noValidate>
            <div className="rounded-xl border border-border bg-soft/40 p-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Pencil className="h-3.5 w-3.5 text-primary" />
                Asosiy ma’lumotlar
              </div>
            </div>

            {profileError && (
              <div className="rounded-lg border border-danger/20 bg-danger-soft/60 p-3 text-sm text-danger-foreground">
                {profileError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Ism" htmlFor="firstName" required>
                <Input
                  id="firstName"
                  value={profileForm.firstName}
                  onChange={(e) => onChangeField('firstName', e.target.value)}
                />
              </Field>
              <Field label="Familiya" htmlFor="lastName" required>
                <Input
                  id="lastName"
                  value={profileForm.lastName}
                  onChange={(e) => onChangeField('lastName', e.target.value)}
                />
              </Field>
            </div>

            <Field label="Login" htmlFor="username" required>
              <Input
                id="username"
                value={profileForm.username}
                onChange={(e) => onChangeField('username', e.target.value)}
                placeholder="Bu login bilan kirishingiz mumkin"
              />
            </Field>

            <Field label="Telefon" htmlFor="schoolName" hint="Telefon raqami yoki istalgan belgi">
              <Input
                id="schoolName"
                value={profileForm.schoolName}
                onChange={(e) => onChangeField('schoolName', e.target.value)}
                placeholder="+998 90 123 45 67"
              />
            </Field>

            <Button type="submit" loading={profileLoading} className="w-full">
              <Pencil className="h-4 w-4" />
              Saqlash
            </Button>
          </form>

          <hr className="border-border" />

          <form onSubmit={handlePasswordSave} className="space-y-3.5" noValidate>
            <div className="rounded-xl border border-border bg-soft/40 p-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <LockOpen className="h-3.5 w-3.5 text-primary" />
                Parolni o‘zgartirish
              </div>
            </div>

            {passwordError && (
              <div className="rounded-lg border border-danger/20 bg-danger-soft/60 p-3 text-sm text-danger-foreground">
                {passwordError}
              </div>
            )}

            <Field label="Joriy parol" htmlFor="currentPassword" required>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              />
            </Field>

            <Field label="Yangi parol" htmlFor="newPassword" required>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              />
            </Field>

            <Field label="Yangi parolni qayta kiriting" htmlFor="confirmPassword" required>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </Field>

            <Button type="submit" variant="secondary" loading={passwordLoading} className="w-full">
              <LockOpen className="h-4 w-4" />
              Parolni o‘zgartirish
            </Button>
          </form>
        </div>

        <DialogFooter>
          <Button variant="danger" onClick={handleLogout} className="w-full sm:w-auto">
            <LogOut className="h-4 w-4" />
            Chiqish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LockOpen({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
