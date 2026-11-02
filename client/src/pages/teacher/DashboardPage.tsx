import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileText,
  Plus,
  School,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSkeleton, Skeleton } from '@/components/ui/progress';
import { EmptyState, ErrorState } from '@/components/empty-state';
import { TestStatusBadge } from '@/components/status-badges';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import type { TeacherDashboard } from '@/lib/types';
import { copyToClipboard, formatDate, formatScore, fullName } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi<TeacherDashboard>('/api/teacher/dashboard');
  const toast = useToast();

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <PageSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        description={error}
        action={<Button onClick={reload}>Qayta urinish</Button>}
      />
    );
  }

  if (!data) return null;

  const { stats, recentTests, classrooms } = data;

  async function copyCode(code: string) {
    const ok = await copyToClipboard(code);
    if (ok) toast.success('Kod nusxalandi', code);
    else toast.error('Nusxalab bo‘lmadi', 'Kodni qo‘lda tanlab oling.');
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        title={`Salom, ${user?.firstName} 👋`}
        description="Sinfingiz, testlaringiz va o‘quvchilar natijalari — barchasi bir joyda."
        actions={
          <Button asChild size="lg">
            <Link to="/teacher/tests/new">
              <Plus className="h-4 w-4" />
              Yangi test yaratish
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami testlar" value={stats.totalTests} icon={FileText} tone="blue" hint="Barcha yaratilgan testlar" />
        <StatCard label="Jami o‘quvchilar" value={stats.totalStudents} icon={Users} tone="violet" hint="Sinflaringizdagi o‘quvchilar" />
        <StatCard label="Faol testlar" value={stats.activeTests} icon={BookOpenCheck} tone="green" hint="Nashr qilingan testlar" />
        <StatCard
          label="O‘rtacha natija"
          value={formatScore(stats.averageScore)}
          icon={CheckCircle2}
          tone="amber"
          hint="Topshirilgan testlar bo‘yicha"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>So‘nggi testlar</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Yaqinda yaratilgan testlar holati</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/teacher/tests">
                Barchasi <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-1 sm:px-0">
            {recentTests.length === 0 ? (
              <div className="px-5 sm:px-6">
                <EmptyState
                  icon={ClipboardList}
                  title="Hali test yaratilmagan"
                  description="PDF yuklang — AI savollarni yechib, tayyor A/B/C/D test tayyorlaydi."
                  action={
                    <Button asChild>
                      <Link to="/teacher/tests/new">
                        <Plus className="h-4 w-4" /> Birinchi testni yaratish
                      </Link>
                    </Button>
                  }
                  className="border-0 bg-transparent py-8"
                />
              </div>
            ) : (
              <div className="mt-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Sinf</TableHead>
                      <TableHead>Holat</TableHead>
                      <TableHead className="text-right">Savollar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell>
                          <Link
                            to={test.status === 'PUBLISHED' ? `/teacher/tests/${test.id}/results` : `/teacher/tests/${test.id}`}
                            className="font-semibold text-foreground transition hover:text-primary"
                          >
                            {test.title}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(test.createdAt)}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{test.className}</Badge>
                        </TableCell>
                        <TableCell>
                          <TestStatusBadge status={test.status} />
                        </TableCell>
                        <TableCell className="text-right font-medium">{test.questionCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Sinflarim</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Qo‘shilish kodlari</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/teacher/classrooms">
                  Barchasi <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-4">
              {classrooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-5 text-center">
                  <School className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-medium">Sinf hali yo‘q</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    O‘quvchilar qo‘shilishi uchun sinf yarating.
                  </p>
                  <Button asChild size="sm" className="mt-3">
                    <Link to="/teacher/classrooms">Sinf yaratish</Link>
                  </Button>
                </div>
              ) : (
                classrooms.slice(0, 4).map((classroom) => (
                  <div
                    key={classroom.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white p-3 transition hover:border-primary/30 hover:bg-soft/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-soft text-primary">
                        <School className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/teacher/classrooms/${classroom.id}`}
                          className="block truncate text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {classroom.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {classroom.studentCount} o‘quvchi · {classroom.testCount} test
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyCode(classroom.joinCode)}
                      title="Kodni nusxalash"
                      className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 font-mono text-xs font-semibold tracking-wider text-slate-700 transition hover:bg-primary-50 hover:text-primary-700"
                    >
                      {classroom.joinCode}
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-gradient-to-br from-primary-700 to-primary-900 text-white">
            <CardContent className="relative p-5 sm:p-6">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 right-10 h-20 w-20 rounded-full bg-white/5" />
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                Maslahat
              </p>
              <p className="mt-2 text-balance font-display text-lg font-bold leading-snug">
                Skanerlangan PDF larni ham yuklashingiz mumkin
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-blue-100/80">
                OCR va AI vision skanerlangan sahifalarni o‘qiydi. Natija har doim o‘qituvchi
                tekshiruvidan o‘tadi.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {loading && (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-28 rounded-2xl" />
          ))}
        </div>
      )}
    </div>
  );
}
