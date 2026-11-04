import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Play,
  Search,
  Trophy,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageSkeleton } from '@/components/ui/progress';
import { EmptyState, ErrorState } from '@/components/empty-state';
import { useApi } from '@/lib/useApi';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { StudentTestItem } from '@/lib/types';
import { formatDate, formatDuration, formatScore, scoreTone } from '@/lib/utils';

interface StudentTestsResponse {
  available: StudentTestItem[];
  completed: StudentTestItem[];
  classrooms: Array<{ id: string; name: string }>;
}

export default function StudentTestsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useApi<StudentTestsResponse>('/api/student/tests');
  const [startingId, setStartingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [classroomFilter, setClassroomFilter] = useState('all');
  const [tab, setTab] = useState<'available' | 'completed'>('available');

  async function startTest(test: StudentTestItem) {
    if (test.attempt?.status === 'IN_PROGRESS') {
      navigate(`/student/attempts/${test.attempt.id}`);
      return;
    }
    setStartingId(test.id);
    try {
      const result = await api<{ attemptId: string }>(`/api/tests/${test.id}/start`, {
        method: 'POST',
      });
      navigate(`/student/attempts/${result.attemptId}`);
    } catch (err) {
      toast.error('Testni boshlab bo‘lmadi', errorMessage(err));
      setStartingId(null);
      reload();
    }
  }

  const filter = (items: StudentTestItem[]) =>
    items.filter((test) => {
      const matchesQuery = test.title.toLowerCase().includes(query.trim().toLowerCase());
      const matchesClass =
        classroomFilter === 'all' || test.classroom.id === classroomFilter;
      return matchesQuery && matchesClass;
    });

  const available = useMemo(() => filter(data?.available ?? []), [data, query, classroomFilter]);
  const completed = useMemo(() => filter(data?.completed ?? []), [data, query, classroomFilter]);
  const shown = tab === 'available' ? available : completed;

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return <ErrorState description={error} action={<Button onClick={reload}>Qayta urinish</Button>} />;
  }

  if (!data) return null;
  const hasAny = data.available.length + data.completed.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Testlar"
        description="O‘qituvchingiz nashr qilgan testlar. Har bir testni faqat bir marta topshirish mumkin."
        actions={
          <Button asChild variant="outline">
            <Link to="/student/ranking">
              <Trophy className="h-4 w-4" /> Reyting
            </Link>
          </Button>
        }
      />

      {!hasAny ? (
        <EmptyState
          icon={FileText}
          title="Hozircha test yo‘q"
          description={
            data.classrooms.length === 0
              ? 'Siz hali biror sinfga biriktirilmagansiz. O‘qituvchingizga murojaat qiling.'
              : 'O‘qituvchingiz test nashr qilganda u shu yerda paydo bo‘ladi.'
          }
          action={
            data.classrooms.length === 0 ? (
              <Button asChild variant="outline">
                <Link to="/student">Bosh sahifa</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-xl border border-border bg-white p-1">
              {[
                { key: 'available' as const, label: 'Mavjud', count: data.available.length },
                { key: 'completed' as const, label: 'Topshirilgan', count: data.completed.length },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                    tab === item.key
                      ? 'bg-primary text-white shadow-sm shadow-primary/25'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      tab === item.key ? 'bg-white/20' : 'bg-muted text-slate-600'
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Test nomi bo‘yicha qidirish..."
                  className="pl-9"
                />
              </div>
              {data.classrooms.length > 1 && (
                <select
                  value={classroomFilter}
                  onChange={(event) => setClassroomFilter(event.target.value)}
                  className="h-11 rounded-lg border border-input bg-white px-3.5 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 sm:w-44"
                >
                  <option value="all">Barcha sinflar</option>
                  {data.classrooms.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {shown.length === 0 ? (
            <EmptyState
              icon={tab === 'available' ? FileText : CheckCircle2}
              title={
                query
                  ? 'Natija topilmadi'
                  : tab === 'available'
                    ? 'Mavjud test yo‘q'
                    : 'Hali test topshirmagansiz'
              }
              description={
                query
                  ? 'Qidiruv so‘zini o‘zgartirib ko‘ring.'
                  : tab === 'available'
                    ? 'Barcha testlar topshirilgan yoki yangi test hali nashr qilinmagan.'
                    : 'Testni topshirgach natijangiz shu bo‘limda saqlanadi.'
              }
              action={
                query ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery('');
                      setClassroomFilter('all');
                    }}
                  >
                    Filtrni tozalash
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {shown.map((test) => {
                const completedTest = test.attempt?.status === 'SUBMITTED';
                const inProgress = test.attempt?.status === 'IN_PROGRESS';
                return (
                  <Card key={test.id} className="transition hover:shadow-pop">
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-soft text-primary">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={
                                completedTest
                                  ? `/student/results/${test.attempt!.id}`
                                  : '#'
                              }
                              onClick={(event) => {
                                if (!completedTest) event.preventDefault();
                              }}
                              className="block truncate font-display text-base font-bold text-foreground transition hover:text-primary"
                            >
                              {test.title}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline">{test.classroom.name}</Badge>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />{' '}
                                {formatDuration(test.durationMinutes * 60)}
                              </span>
                              <span>· {test.questionCount} savol</span>
                            </div>
                          </div>
                        </div>
                        {completedTest ? (
                          <Badge
                            variant={
                              scoreTone(test.attempt!.scorePercentage) === 'success'
                                ? 'success'
                                : scoreTone(test.attempt!.scorePercentage) === 'warning'
                                  ? 'warning'
                                  : 'danger'
                            }
                          >
                            {formatScore(test.attempt!.scorePercentage)}
                          </Badge>
                        ) : inProgress ? (
                          <Badge variant="warning">Jarayonda</Badge>
                        ) : (
                          <Badge variant="success">Yangi</Badge>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5" /> {test.teacherName}
                        </span>
                        {test.publishedAt && (
                          <span>Nashr: {formatDate(test.publishedAt)}</span>
                        )}
                      </div>

                      <div className="mt-4 flex-1" />

                      {completedTest ? (
                        <div className="flex items-center gap-2">
                          <Button asChild className="flex-1" variant="outline">
                            <Link to={`/student/results/${test.attempt!.id}`}>
                              Natijani ko‘rish <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => startTest(test)}
                          loading={startingId === test.id}
                        >
                          {inProgress ? (
                            <>
                              <Play className="h-4 w-4" /> Davom ettirish
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" /> Testni boshlash
                            </>
                          )}
                        </Button>
                      )}

                      {inProgress && test.attempt?.expiresAt && (
                        <p className="mt-2 text-center text-[11px] text-warning-foreground">
                          Test boshlangan — vaqt o‘tib bormoqda.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
