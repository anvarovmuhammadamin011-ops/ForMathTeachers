import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  Plus,
  Search,
  ShieldAlert,
  Timer,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress, PageSkeleton } from '@/components/ui/progress';
import { EmptyState, ErrorState } from '@/components/empty-state';
import { TestStatusBadge } from '@/components/status-badges';
import { useApi } from '@/lib/useApi';
import type { ClassroomSummary, TestListItem } from '@/lib/types';
import { formatDate, jobStatusLabels } from '@/lib/utils';

export default function TestsPage() {
  const { data, loading, error, reload } = useApi<{ tests: TestListItem[] }>('/api/tests', {
    pollMs: 5000,
  });
  const { data: classesData } = useApi<{ classrooms: ClassroomSummary[] }>('/api/classes');
  const [query, setQuery] = useState('');
  const [classroomFilter, setClassroomFilter] = useState('all');

  const tests = data?.tests ?? [];
  const classrooms = classesData?.classrooms ?? [];

  const filtered = useMemo(() => {
    return tests.filter((test) => {
      const matchesQuery = test.title.toLowerCase().includes(query.trim().toLowerCase());
      const matchesClass =
        classroomFilter === 'all' || test.classroom.id === classroomFilter;
      return matchesQuery && matchesClass;
    });
  }, [tests, query, classroomFilter]);

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return <ErrorState description={error} action={<Button onClick={reload}>Qayta urinish</Button>} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Testlarim"
        description="PDF dan yaratilgan testlar, ularning holati va natijalari."
        actions={
          <Button asChild size="lg">
            <Link to="/teacher/tests/new">
              <Plus className="h-4 w-4" />
              Yangi test yaratish
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Test nomi bo‘yicha qidirish..."
            className="pl-9"
          />
        </div>
        <select
          value={classroomFilter}
          onChange={(event) => setClassroomFilter(event.target.value)}
          className="h-11 rounded-lg border border-input bg-white px-3.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 sm:w-56"
        >
          <option value="all">Barcha sinflar</option>
          {classrooms.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>
              {classroom.name}
            </option>
          ))}
        </select>
      </div>

      {tests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Hali test yaratilmagan"
          description="PDF yuklang — AI savollarni ajratadi, yechadi va A/B/C/D variantli test tayyorlaydi."
          action={
            <Button asChild>
              <Link to="/teacher/tests/new">
                <Plus className="h-4 w-4" /> Birinchi testni yaratish
              </Link>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Natija topilmadi"
          description="Qidiruv yoki sinf filtrini o‘zgartirib ko‘ring."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery('');
                setClassroomFilter('all');
              }}
            >
              Filtrlarni tozalash
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((test) => {
            const processing =
              test.status === 'PROCESSING' ||
              (test.job !== null && !['COMPLETED', 'FAILED'].includes(test.job.status));
            const progress = test.job?.progress ?? 0;
            return (
              <Card key={test.id} className="transition hover:shadow-pop">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <TestStatusBadge status={test.status} />
                        <Badge variant="outline">{test.classroom.name}</Badge>
                      </div>
                      <Link
                        to={
                          test.status === 'PUBLISHED'
                            ? `/teacher/tests/${test.id}/results`
                            : `/teacher/tests/${test.id}`
                        }
                        className="mt-2 block truncate font-display text-lg font-bold text-foreground transition hover:text-primary"
                      >
                        {test.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(test.createdAt)} · {test.durationMinutes} daqiqa
                      </p>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-soft text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/60 px-2 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Savollar</p>
                      <p className="font-display text-base font-bold">{test.questionCount}</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 px-2 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tasdiqlangan</p>
                      <p className="font-display text-base font-bold text-success">
                        {test.approvedCount}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/60 px-2 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Urinishlar</p>
                      <p className="font-display text-base font-bold">{test.attemptCount}</p>
                    </div>
                  </div>

                  {test.status === 'PROCESSING' && (
                    <div className="mt-4 rounded-xl border border-primary/20 bg-soft/60 p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-primary-700">
                        <span>{jobStatusLabels[test.job?.status ?? 'QUEUED'] ?? 'Ishlanmoqda'}</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="mt-2" />
                    </div>
                  )}

                  {test.status === 'DRAFT' && test.job?.status === 'FAILED' && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft/50 p-3 text-xs text-danger-foreground">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="line-clamp-3">
                        {test.job.errorMessage ?? 'PDF ishlashda xatolik yuz berdi.'}
                      </span>
                    </div>
                  )}

                  {test.status === 'READY' && test.verifiedCount < test.questionCount && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/20 bg-warning-soft/60 p-3 text-xs text-warning-foreground">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {test.questionCount - test.verifiedCount} savol tekshirish talab qiladi.
                        Tasdiqlashdan oldin ularni ko‘zdan kechiring.
                      </span>
                    </div>
                  )}

                  {test.status === 'PUBLISHED' && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      O‘quvchilarga ochiq · {test.attemptCount} urinish
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {test.status === 'PUBLISHED' ? (
                      <Button asChild className="flex-1">
                        <Link to={`/teacher/tests/${test.id}/results`}>
                          <BarChart3 className="h-4 w-4" /> Natijalar
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild className="flex-1">
                        <Link to={`/teacher/tests/${test.id}`}>
                          {processing ? (
                            <>
                              <Timer className="h-4 w-4" /> Jarayonni kuzatish
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4" /> Savollarni tekshirish
                            </>
                          )}
                        </Link>
                      </Button>
                    )}
                    {test.status !== 'PUBLISHED' && (
                      <Button asChild variant="outline">
                        <Link to={`/teacher/tests/${test.id}`}>Batafsil</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
