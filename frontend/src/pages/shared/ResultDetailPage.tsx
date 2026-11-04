import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  GraduationCap,
  MinusCircle,
  Target,
  UserRound,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/progress';
import { ErrorState } from '@/components/empty-state';
import { MathText } from '@/components/math/math-text';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/lib/auth';
import type { ResultData } from '@/lib/types';
import {
  cn,
  formatDateTime,
  formatDuration,
  formatScore,
  optionLabels,
  scoreTone,
} from '@/lib/utils';

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const offset = circumference - (pct / 100) * circumference;
  const tone = scoreTone(score);

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg viewBox="0 0 128 128" className="h-36 w-36 -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="10"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'transition-[stroke-dashoffset] duration-700',
            tone === 'success' && 'text-white',
            tone === 'warning' && 'text-amber-200',
            tone === 'danger' && 'text-red-200',
          )}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-extrabold">{formatScore(score)}</span>
        <span className="mt-0.5 text-[11px] uppercase tracking-wide text-blue-100/80">Natija</span>
      </div>
    </div>
  );
}

export default function ResultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi<ResultData>(
    id ? `/api/attempts/${id}/result` : null,
  );

  const isTeacher = user?.role === 'TEACHER';

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Natija"
          backTo={isTeacher ? '/teacher/results' : '/student/results'}
          backLabel={isTeacher ? 'Natijalar' : 'Natijalarim'}
        />
        <ErrorState
          title="Natijani yuklab bo‘lmadi"
          description={error}
          action={<Button onClick={reload}>Qayta urinish</Button>}
        />
      </div>
    );
  }
  if (!data) return null;

  const { attempt, test, student, questions } = data;
  const backTo = isTeacher ? `/teacher/tests/${test.id}/results` : '/student/results';
  const backLabel = isTeacher ? 'Test natijalari' : 'Natijalarim';
  const tone = scoreTone(attempt.scorePercentage);

  return (
    <div className="space-y-6">
      <PageHeader
        title={test.title}
        description={`${test.classroom.name} sinfi · ${test.teacherName} · ${formatDateTime(
          attempt.submittedAt,
        )}`}
        backTo={backTo}
        backLabel={backLabel}
        actions={
          <Badge
            variant={tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'danger'}
          >
            {formatScore(attempt.scorePercentage)}
          </Badge>
        }
      />

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-900 text-white shadow-pop">
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <ScoreRing score={attempt.scorePercentage} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                {isTeacher ? 'O‘quvchi natijasi' : 'Sizning natijangiz'}
              </p>
              <h2 className="mt-1.5 font-display text-2xl font-extrabold">
                {student.firstName} {student.lastName}
              </h2>
              <p className="mt-1 text-sm text-blue-100/85">
                {attempt.correctCount} ta to‘g‘ri javob · {attempt.totalQuestions} savoldan
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs">
                  <Clock className="h-3.5 w-3.5" /> {formatDuration(attempt.timeSpentSeconds)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs">
                  <GraduationCap className="h-3.5 w-3.5" /> {test.classroom.name}
                </span>
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
            <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur-sm">
              <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-300" />
              <p className="mt-1 font-display text-xl font-bold">{attempt.correctCount}</p>
              <p className="text-[10px] uppercase tracking-wide text-blue-100/80">To‘g‘ri</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur-sm">
              <XCircle className="mx-auto h-4 w-4 text-red-200" />
              <p className="mt-1 font-display text-xl font-bold">{attempt.incorrectCount}</p>
              <p className="text-[10px] uppercase tracking-wide text-blue-100/80">Xato</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-center backdrop-blur-sm">
              <MinusCircle className="mx-auto h-4 w-4 text-amber-200" />
              <p className="mt-1 font-display text-xl font-bold">{attempt.unansweredCount}</p>
              <p className="text-[10px] uppercase tracking-wide text-blue-100/80">Javobsiz</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Jami savollar
          </p>
          <p className="mt-1.5 font-display text-2xl font-bold">{attempt.totalQuestions}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sarflangan vaqt
          </p>
          <p className="mt-1.5 font-display text-2xl font-bold">
            {formatDuration(attempt.timeSpentSeconds)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Boshlangan
          </p>
          <p className="mt-1.5 text-sm font-semibold">{formatDateTime(attempt.startedAt)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Topshirilgan
          </p>
          <p className="mt-1.5 text-sm font-semibold">{formatDateTime(attempt.submittedAt)}</p>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Savollar tahlili</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            To‘g‘ri javoblar va AI yechimi bilan batafsil ko‘rinish.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3" /> {attempt.correctCount} to‘g‘ri
          </Badge>
          <Badge variant="danger">
            <XCircle className="h-3 w-3" /> {attempt.incorrectCount} xato
          </Badge>
          <Badge variant="warning">
            <Target className="h-3 w-3" /> {attempt.unansweredCount} javobsiz
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question) => {
          const unanswered = question.selectedOption === null;
          const statusVariant = unanswered ? 'warning' : question.isCorrect ? 'success' : 'danger';
          return (
            <Card key={question.id} className="overflow-hidden">
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft font-display text-sm font-bold text-primary-700">
                    {question.questionNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={statusVariant}>
                        {unanswered ? (
                          <>
                            <MinusCircle className="h-3 w-3" /> Javobsiz
                          </>
                        ) : question.isCorrect ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> To‘g‘ri
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" /> Xato
                          </>
                        )}
                      </Badge>
                      <Badge variant="outline">PDF {question.sourcePage}-bet</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserRound className="h-3.5 w-3.5" />
                  {student.firstName} {student.lastName}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-5">
                <MathText
                  text={question.questionText}
                  className="text-[15px] leading-relaxed text-foreground"
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  {question.options.map((option, index) => {
                    const isCorrectOption = index === question.correctAnswer;
                    const isSelected = index === question.selectedOption;
                    return (
                      <div
                        key={index}
                        className={cn(
                          'flex flex-col gap-1 rounded-xl border px-3 py-2.5',
                          isCorrectOption
                            ? 'border-success/40 bg-success-soft/50'
                            : isSelected
                              ? 'border-danger/40 bg-danger-soft/40'
                              : 'border-border bg-white',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                              isCorrectOption
                                ? 'bg-success text-white'
                                : isSelected
                                  ? 'bg-danger text-white'
                                  : 'bg-muted text-slate-600',
                            )}
                          >
                            {optionLabels[index]}
                          </span>
                          <MathText text={option} className="min-w-0 flex-1 text-sm" />
                          {isCorrectOption && (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          )}
                          {isSelected && !isCorrectOption && (
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                          )}
                        </div>
                        {(isCorrectOption || isSelected) && (
                          <p
                            className={cn(
                              'pl-8 text-[11px] font-semibold',
                              isCorrectOption ? 'text-success-foreground' : 'text-danger-foreground',
                            )}
                          >
                            {isCorrectOption && isSelected
                              ? 'Sizning javobingiz · to‘g‘ri'
                              : isCorrectOption
                                ? 'To‘g‘ri javob'
                                : 'Sizning javobingiz'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Yechim
                  </p>
                  <MathText
                    text={question.solution}
                    block
                    className="mt-2 text-sm leading-relaxed text-slate-700"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button asChild variant="outline" className="w-full sm:w-auto">
        <Link to={backTo}>
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
      </Button>
    </div>
  );
}
