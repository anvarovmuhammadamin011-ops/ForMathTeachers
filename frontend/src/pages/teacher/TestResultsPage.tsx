import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BarChart3,
  Clock,
  Eye,
  FileText,
  Medal,
  Timer,
  Trophy,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/progress';
import { EmptyState, ErrorState } from '@/components/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApi } from '@/lib/useApi';
import type { TestResults } from '@/lib/types';
import { cn, formatDateTime, formatDuration, formatScore } from '@/lib/utils';

export default function TestResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useApi<TestResults>(
    id ? `/api/tests/${id}/results` : null,
  );

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return <ErrorState description={error} action={<Button onClick={reload}>Qayta urinish</Button>} />;
  }
  if (!data) return null;

  const { test, stats, ranking, attempts } = data;
  const submitted = attempts.filter((attempt) => attempt.status === 'SUBMITTED');

  return (
    <div className="space-y-6">
      <PageHeader
        title={test.title}
        description={`${test.classroom.name} sinfi · ${test.questionCount} savol · ${test.durationMinutes} daqiqa`}
        backTo="/teacher/results"
        backLabel="Natijalar"
        actions={
          <Button asChild variant="outline">
            <Link to={`/teacher/tests/${test.id}`}>
              <FileText className="h-4 w-4" /> Testni ko‘rish
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-soft text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Topshirganlar
              </p>
              <p className="font-display text-2xl font-bold">{stats.submissions}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-soft text-warning-foreground">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Jarayonda
              </p>
              <p className="font-display text-2xl font-bold">{stats.inProgress}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                O‘rtacha ball
              </p>
              <p className="font-display text-2xl font-bold">{formatScore(stats.averageScore)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-soft text-success-foreground">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Eng yuqori
              </p>
              <p className="font-display text-2xl font-bold">{formatScore(stats.highestScore)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-warning" /> Sinf reytingi
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Ball bo‘yicha; teng bo‘lsa tezroq topshirgan yuqori.
              </p>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link to={`/teacher/ranking?classroomId=${test.classroom.id}`}>
                Umumiy <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            {ranking.length === 0 ? (
              <div className="px-5 sm:px-6">
                <EmptyState
                  icon={Trophy}
                  title="Reyting bo‘sh"
                  description="O‘quvchilar testni topshirgach reyting avtomatik shakllanadi."
                  className="border-0 bg-transparent py-8"
                />
              </div>
            ) : (
              <div className="mt-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>O‘rin</TableHead>
                      <TableHead>O‘quvchi</TableHead>
                      <TableHead>To‘g‘ri</TableHead>
                      <TableHead>Ball</TableHead>
                      <TableHead>Vaqt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((row) => (
                      <TableRow key={row.studentId}>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold',
                              row.rank === 1 && 'bg-warning-soft text-warning-foreground',
                              row.rank === 2 && 'bg-slate-100 text-slate-600',
                              row.rank === 3 && 'bg-orange-50 text-orange-700',
                              row.rank !== null && row.rank > 3 && 'bg-muted text-slate-500',
                            )}
                          >
                            {row.rank === 1 ? <Medal className="h-3.5 w-3.5" /> : row.rank}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{row.studentName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.correctCount}/{row.totalQuestions}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{formatScore(row.scorePercentage)}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDuration(row.timeSpentSeconds)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Barcha urinishlar</CardTitle>
            <p className="text-sm text-muted-foreground">
              Topshirilgan va jarayondagi urinishlar ro‘yxati
            </p>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            {attempts.length === 0 ? (
              <div className="px-5 sm:px-6">
                <EmptyState
                  icon={Users}
                  title="Hali urinish yo‘q"
                  description="Test nashr qilingan bo‘lsa, o‘quvchilar uni topshirishi mumkin."
                  className="border-0 bg-transparent py-8"
                />
              </div>
            ) : (
              <div className="mt-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>O‘quvchi</TableHead>
                      <TableHead>Holat</TableHead>
                      <TableHead>Ball</TableHead>
                      <TableHead className="text-right">Amal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          <p className="font-medium">{attempt.studentName}</p>
                          <p className="text-xs text-muted-foreground">@{attempt.username}</p>
                        </TableCell>
                        <TableCell>
                          {attempt.status === 'SUBMITTED' ? (
                            <Badge variant="success">Topshirilgan</Badge>
                          ) : (
                            <Badge variant="warning">Jarayonda</Badge>
                          )}
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {attempt.submittedAt
                              ? formatDateTime(attempt.submittedAt)
                              : formatDateTime(attempt.startedAt)}
                          </p>
                        </TableCell>
                        <TableCell>
                          {attempt.status === 'SUBMITTED' ? (
                            <div>
                              <p className="font-semibold">{formatScore(attempt.scorePercentage)}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {attempt.correctCount} to‘g‘ri · {attempt.incorrectCount} xato ·{' '}
                                {attempt.unansweredCount} javobsiz
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {attempt.status === 'SUBMITTED' ? (
                            <Button asChild size="sm" variant="ghost">
                              <Link to={`/teacher/attempts/${attempt.id}`}>
                                <Eye className="h-3.5 w-3.5" /> Ko‘rish
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Kutilmoqda</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {submitted.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Jami {submitted.length} ta topshirilgan ish. Har bir ishni “Ko‘rish” orqali savollar
          bo‘yicha batafsil tekshirish mumkin.
        </p>
      )}
    </div>
  );
}
