import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Copy,
  FileText,
  GraduationCap,
  Plus,
  School,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageSkeleton } from '@/components/ui/progress';
import { EmptyState, ErrorState } from '@/components/empty-state';
import { useApi } from '@/lib/useApi';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { ClassroomSummary } from '@/lib/types';
import { copyToClipboard, formatDate } from '@/lib/utils';

export default function ClassroomsPage() {
  const { data, loading, error, reload } = useApi<{ classrooms: ClassroomSummary[] }>(
    '/api/classes',
  );
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function copyCode(code: string) {
    const ok = await copyToClipboard(code);
    if (ok) toast.success('Kod nusxalandi', code);
    else toast.error('Nusxalab bo‘lmadi');
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    if (name.trim().length < 1) {
      setFormError('Sinf nomini kiriting.');
      return;
    }
    setSaving(true);
    try {
      await api('/api/classes', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      toast.success('Sinf yaratildi', `${name.trim()} sinfi qo‘shildi.`);
      setOpen(false);
      setName('');
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return <ErrorState description={error} action={<Button onClick={reload}>Qayta urinish</Button>} />;
  }

  const classrooms = data?.classrooms ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sinflarim"
        description="Har bir sinf uchun unikal qo‘shilish kodi avtomatik yaratiladi. O‘quvchilar shu kod orqali qo‘shiladi."
        actions={
          <Button onClick={() => setOpen(true)} size="lg">
            <Plus className="h-4 w-4" />
            Sinf yaratish
          </Button>
        }
      />

      {classrooms.length === 0 ? (
        <EmptyState
          icon={School}
          title="Hali sinf yaratilmagan"
          description="O‘quvchilar testlarni ko‘rishi uchun avval sinf yarating. Har bir sinfga alohida qo‘shilish kodi beriladi."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Birinchi sinfni yaratish
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classrooms.map((classroom) => (
            <Card key={classroom.id} className="group transition hover:-translate-y-0.5 hover:shadow-pop">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft text-primary">
                      <School className="h-5 w-5" />
                    </div>
                    <div>
                      <Link
                        to={`/teacher/classrooms/${classroom.id}`}
                        className="font-display text-lg font-bold text-foreground transition hover:text-primary"
                      >
                        {classroom.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(classroom.createdAt)} da yaratilgan
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCode(classroom.joinCode)}
                    title="Kodni nusxalash"
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1.5 font-mono text-xs font-bold tracking-wider text-slate-700 transition hover:border-primary/40 hover:bg-primary-50 hover:text-primary-700"
                  >
                    {classroom.joinCode}
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/60 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> O‘quvchilar
                    </p>
                    <p className="mt-0.5 font-display text-lg font-bold">{classroom.studentCount}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" /> Testlar
                    </p>
                    <p className="mt-0.5 font-display text-lg font-bold">{classroom.testCount}</p>
                  </div>
                </div>

                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link to={`/teacher/classrooms/${classroom.id}`}>
                    Sinfni ochish <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-primary/20 bg-soft/60">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-primary-900/80">
          <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>
            O‘quvchiga sinf kodini bering. U ro‘yxatdan o‘tishda kodni kiritadi va avtomatik
            shu sinfga qo‘shiladi. Kodni istalgan vaqtda nusxalab ulashishingiz mumkin.
          </p>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Yangi sinf yaratish</DialogTitle>
              <DialogDescription>
                Sinf nomini kiriting (masalan: 8-A, 9-B). Qo‘shilish kodi avtomatik yaratiladi.
              </DialogDescription>
            </DialogHeader>
            <Field label="Sinf nomi" htmlFor="classroom-name" required error={formError}>
              <Input
                id="classroom-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="8-A"
                maxLength={40}
                autoFocus
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" loading={saving}>
                Yaratish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
