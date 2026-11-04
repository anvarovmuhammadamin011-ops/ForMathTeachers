import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Play,
  Trophy,
  UserRound,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/progress';
import { EmptyState, ErrorState } from '@/components/empty-state';
import { useApi } from '@/lib/useApi';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { StudentDashboard } from '@/lib/types';
import { formatDateTime, formatDuration, formatScore, scoreTone } from '@/lib/utils';

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useApi<StudentDashboard>('/api/student/dashboard');
  const [startingId, setStartingId] = useState<string | null>(null);

  async function startTest(testId: string) {
    setStartingId(testId);
    try {
      const result = await api<{ attemptId: string }>(`/api/tests/${testId}/start`, {
        method: 'POST',
      });
      navigate(`/student/attempts/${result.attemptId}`);
    } catch (err) {
      toast.error('Testni boshlab bo‘lmadi', errorMessage(err));
      setStartingId(null);
      reload();
    }
  }

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return <ErrorState description={error} action={<Button onClick={reload}>Qayta urinish</Button>} />;
  }
  if (!data) return null;

  const { student, classroom, stats, tests, recentResults } = data;

  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-900 p-6 text-white shadow-pop sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute bottom-0 right-24 h-40 w-40 rounded-full bg-blue-300/20 blur-2xl" />
        </div>
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-200">
              <GraduationCap className="h-4 w-4" /> O‘quvchi kabineti
            </p>
            <h1 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
              Salom, {student.firstName}!
            </h1>
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-blue-100/85">
              {classroom
                ? `${classroom.name} sinfi · o‘qituvchi ${classroom.teacherName}`
                : 'Hali biror sinfga qo‘shilmagansiz.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-wide text-blue-100/80">O‘rtacha ball</p>
              <p className="mt-0.5 font-display text-2xl font-bold">{formatScore(stats.averageScore)}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-wide text-blue-100/80">Sinfdagi o‘rin</p>
              <p className="mt-0.5 font-display text-2xl font-bold">
                {stats.rank !== null ? `#${stats.rank}` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Mavjud testlar" value={stats.available} icon={FileText} tone="blue" />
        <StatCard label="Topshirilgan" value={stats.completed} icon={CheckCircle2} tone="green" />
        <StatCard
          label="O‘rtacha natija"
          value={formatScore(stats.averageScore)}
          icon={UserRound}
          tone="amber"
        />
        <StatCard
          label="Reyting"
          value={stats.rank !== null ? `#${stats.rank}` : '—'}
          icon={Trophy}
          tone="violet"
          hint={stats.totalStudents > 0 ? `${stats.totalStudents} o‘quvchi ichida` : undefined}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Mavjud testlar</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Sinfingiz uchun nashr qilingan testlar
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/student/tests">
                Barchasi <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {tests.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Hozircha test yo‘q"
                description="O‘qituvchingiz test nashr qilganda shu yerda ko‘rinadi."
                className="border-0 bg-transparent py-8"
              />
            ) : (
              tests.map((test) => (
                <div
                  key={test.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-4 transition hover:border-primary/30 hover:bg-soft/20 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{test.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{test.classroom.name}</Badge>
                      <span>{test.questionCount} savol</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDuration(test.durationMinutes * 60)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {test.attempt?.status === 'IN_PROGRESS' ? (
                      <Button asChild size="sm">
                        <Link to={`/student/attempts/${test.attempt.id}`}>
                          <Play className="h-3.5 w-3.5" /> Davom ettirish
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => startTest(test.id)}
                        loading={startingId === test.id}
                      >
                        <Play className="h-3.5 w-3.5" /> Testni boshlash
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>So‘nggi natijalar</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Oxirgi topshirilgan testlar</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/student/results">
                Barchasi <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            {recentResults.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <Trophy className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium">Natija hali yo‘q</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Birinchi testni topshirib, natijangizni ko‘ring.
                </p>
              </div>
            ) : (
              recentResults.map((result) => (
                <Link
                  key={result.attemptId}
                  to={`/student/results/${result.attemptId}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 transition hover:border-primary/30 hover:bg-soft/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{result.testTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.className} · {formatDateTime(result.submittedAt)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      scoreTone(result.scorePercentage) === 'success'
                        ? 'success'
                        : scoreTone(result.scorePercentage) === 'warning'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {formatScore(result.scorePercentage)}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
