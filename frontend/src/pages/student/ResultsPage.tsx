import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageSkeleton } from '@/components/ui/progress';
import { EmptyState, ErrorState } from '@/components/empty-state';
import { useApi } from '@/lib/useApi';
import type { StudentResultsResponse } from '@/lib/types';
import {
  formatDateTime,
  formatDuration,
  formatScore,
  scoreTone,
} from '@/lib/utils';

function scoreBadgeVariant(score: number) {
  const tone = scoreTone(score);
  return tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'danger';
}

export default function StudentResultsPage() {
  const { data, loading, error, reload } = useApi<StudentResultsResponse>('/api/student/results');
  const [query, setQuery] = useState('');

  const results = data?.results ?? [];
  const filtered = useMemo(
    () =>
      results.filter((result) =>
        result.testTitle.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [results, query],
  );

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return <ErrorState description={error} action={<Button onClick={reload}>Qayta urinish</Button>} />;
  }
  if (!data) return null;

  const totalCorrect = results.reduce((sum, result) => sum + result.correctCount, 0);
  const totalQuestions = results.reduce((sum, result) => sum + result.questionCount, 0);
  const bestScore = results.reduce((best, result) => Math.max(best, result.scorePercentage), 0);
  const bestRank = results.reduce<number | null>((best, result) => {
    if (result.rank === null) return best;
    return best === null ? result.rank : Math.min(best, result.rank);
  }, null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Natijalarim"
        description="Topshirilgan barcha testlar, ballaringiz va sinfdagi o‘rningiz."
        actions={
          <Button asChild variant="outline">
            <Link to="/student/ranking">
              <Trophy className="h-4 w-4" /> Reyting
            </Link>
          </Button>
        }
      />

      {results.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Natija hali yo‘q"
          description="Birinchi testni topshiring — natijangiz, to‘g‘ri javoblar va tahlil shu yerda ko‘rinadi."
          action={
            <Button asChild>
              <Link to="/student/tests">
                <FileText className="h-4 w-4" /> Testlarni ko‘rish
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="O‘rtacha ball"
              value={formatScore(data.averageScore)}
              icon={Target}
              tone="blue"
              hint={`${results.length} ta topshirilgan test`}
            />
            <StatCard
              label="Eng yuqori natija"
              value={formatScore(bestScore)}
              icon={Award}
              tone="green"
            />
            <StatCard
              label="To‘g‘ri javoblar"
              value={`${totalCorrect}/${totalQuestions}`}
              icon={CheckCircle2}
              tone="amber"
            />
            <StatCard
              label="Eng yaxshi o‘rin"
              value={bestRank !== null ? `#${bestRank}` : '—'}
              icon={Trophy}
              tone="violet"
              hint="Sinf reytingida"
            />
          </div>

          <div className="relative sm:max-w-sm">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Test nomi bo‘yicha qidirish..."
              className="pl-3.5"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Natija topilmadi"
              description="Boshqa nom bilan qidirib ko‘ring."
              action={
                <Button variant="outline" onClick={() => setQuery('')}>
                  Qidiruvni tozalash
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((result) => (
                <Card key={result.attemptId} className="transition hover:shadow-pop">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            scoreTone(result.scorePercentage) === 'success'
                              ? 'bg-success-soft text-success-foreground'
                              : scoreTone(result.scorePercentage) === 'warning'
                                ? 'bg-warning-soft text-warning-foreground'
                                : 'bg-danger-soft text-danger-foreground'
                          }`}
                        >
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/student/results/${result.attemptId}`}
                            className="block truncate font-display text-base font-bold text-foreground transition hover:text-primary"
                          >
                            {result.testTitle}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{result.classroom.name}</Badge>
                            {result.rank !== null && (
                              <Badge variant="default">
                                <Trophy className="h-3 w-3" /> #{result.rank}
                              </Badge>
                            )}
                            <span>{result.teacherName}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={scoreBadgeVariant(result.scorePercentage)}>
                        {formatScore(result.scorePercentage)}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                      <div className="rounded-lg bg-muted/60 px-2 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Savollar
                        </p>
                        <p className="font-display text-sm font-bold">{result.questionCount}</p>
                      </div>
                      <div className="rounded-lg bg-success-soft/60 px-2 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-success-foreground/80">
                          To‘g‘ri
                        </p>
                        <p className="font-display text-sm font-bold text-success-foreground">
                          {result.correctCount}
                        </p>
                      </div>
                      <div className="rounded-lg bg-danger-soft/50 px-2 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-danger-foreground/80">
                          Xato
                        </p>
                        <p className="font-display text-sm font-bold text-danger-foreground">
                          {result.incorrectCount}
                        </p>
                      </div>
                      <div className="rounded-lg bg-warning-soft/60 px-2 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-warning-foreground/80">
                          Javobsiz
                        </p>
                        <p className="font-display text-sm font-bold text-warning-foreground">
                          {result.unansweredCount}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(result.timeSpentSeconds)}
                      </span>
                      <span>{formatDateTime(result.submittedAt)}</span>
                    </div>

                    <Button asChild variant="outline" className="mt-4 w-full">
                      <Link to={`/student/results/${result.attemptId}`}>
                        Batafsil ko‘rish <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="border-primary/20 bg-soft/50">
            <CardContent className="flex items-start gap-3 p-4 text-sm text-primary-900/80">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p>
                Har bir natijani ochib, savollar bo‘yicha to‘g‘ri javoblarni va AI yechimini
                ko‘rishingiz mumkin. Har bir test faqat bir marta topshiriladi.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
