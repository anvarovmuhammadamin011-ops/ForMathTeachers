import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Crown, Medal, School, Sparkles, Trophy, Users } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/progress';
import { EmptyState, ErrorState } from '@/components/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApi } from '@/lib/useApi';
import type { ClassroomRanking } from '@/lib/types';
import { cn, formatScore } from '@/lib/utils';

interface StudentRankingResponse extends ClassroomRanking {
  classrooms: Array<{ id: string; name: string }>;
  myStudentId: string;
}

export default function StudentRankingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('classroomId') ?? '';
  const [classroomId, setClassroomId] = useState(requested);

  const { data, loading, error, reload } = useApi<StudentRankingResponse>(
    `/api/student/ranking${classroomId ? `?classroomId=${encodeURIComponent(classroomId)}` : ''}`,
  );

  useEffect(() => {
    if (!classroomId && data?.classroom) {
      setClassroomId(data.classroom.id);
    }
  }, [classroomId, data?.classroom]);

  function selectClassroom(id: string) {
    setClassroomId(id);
    setSearchParams({ classroomId: id }, { replace: true });
  }

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reyting" description="Sinfingizdagi o‘quvchilar reytingi." />
        <ErrorState
          title="Reytingni ko‘rsatib bo‘lmadi"
          description={error}
          action={<Button onClick={reload}>Qayta urinish</Button>}
        />
      </div>
    );
  }
  if (!data) return null;

  const ranked = data.rows.filter((row) => row.rank !== null);
  const podium = ranked.slice(0, 3);
  const myRow = data.rows.find((row) => row.studentId === data.myStudentId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reyting"
        description="Barcha topshirilgan testlar bo‘yicha o‘rtacha foiz ballingiz asosida saralash. Ball teng bo‘lsa — tezroq topshirgan yuqori."
        actions={
          <Button asChild variant="outline">
            <Link to="/student/results">
              <Trophy className="h-4 w-4" /> Natijalarim
            </Link>
          </Button>
        }
      />

      {data.classrooms.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {data.classrooms.map((classroom) => (
            <button
              key={classroom.id}
              type="button"
              onClick={() => selectClassroom(classroom.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition',
                classroom.id === data.classroom.id
                  ? 'border-primary bg-primary text-white shadow-sm shadow-primary/25'
                  : 'border-white/70 bg-white/70 text-muted-foreground backdrop-blur-md hover:border-primary/30 hover:bg-white/90 hover:text-foreground',
              )}
            >
              <School className="h-4 w-4" />
              {classroom.name}
            </button>
          ))}
        </div>
      )}

      <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-soft/80 via-white to-white">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-sm shadow-primary/25">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {data.classroom.name} sinfi
              </p>
              <p className="font-display text-lg font-bold">
                {myRow?.rank !== null && myRow?.rank !== undefined
                  ? `Sizning o‘rningiz: #${myRow.rank}`
                  : 'Hali reytingda o‘riningiz yo‘q'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-white/70 bg-white/70 px-4 py-2.5 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                O‘rtacha ball
              </p>
              <p className="font-display text-xl font-bold">
                {myRow?.rank !== null && myRow?.rank !== undefined
                  ? formatScore(myRow.averageScore)
                  : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-white/70 bg-white/70 px-4 py-2.5 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Topshirilgan
              </p>
              <p className="font-display text-xl font-bold">{myRow?.testsCompleted ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {podium.length > 0 && (
        <div className="grid gap-3.5 sm:grid-cols-3">
          {podium.map((row, index) => (
            <Card
              key={row.studentId}
              className={cn(
                'relative overflow-hidden',
                index === 0 && 'border-warning/40 bg-gradient-to-br from-warning-soft/70 to-white',
                row.studentId === data.myStudentId && 'ring-2 ring-primary/30',
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold',
                      index === 0 && 'bg-warning text-white',
                      index === 1 && 'bg-slate-200 text-slate-700',
                      index === 2 && 'bg-orange-100 text-orange-700',
                    )}
                  >
                    {index === 0 ? <Crown className="h-5 w-5" /> : <Medal className="h-5 w-5" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {row.studentId === data.myStudentId && (
                      <Badge variant="default">
                        <Sparkles className="h-3 w-3" /> Siz
                      </Badge>
                    )}
                    <Badge variant={index === 0 ? 'warning' : 'neutral'}>#{row.rank}</Badge>
                  </div>
                </div>
                <p className="mt-3 truncate font-display text-base font-bold">{row.studentName}</p>
                <p className="text-xs text-muted-foreground">
                  {row.testsCompleted} test topshirgan
                </p>
                <p className="mt-2 font-display text-2xl font-bold text-primary">
                  {formatScore(row.averageScore)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{data.classroom.name} — umumiy reyting</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              O‘qituvchi: {data.classroom.teacherName} · {data.classroom.studentCount} o‘quvchi ·{' '}
              {data.classroom.totalTests} nashr qilingan test
            </p>
          </div>
          <Badge variant="outline">
            <Users className="h-3 w-3" /> {ranked.length} natijali
          </Badge>
        </CardHeader>
        <CardContent className="px-0 pb-0 sm:px-0">
          {data.rows.length === 0 ? (
            <div className="px-5 sm:px-6">
              <EmptyState
                icon={Trophy}
                title="Sinfda o‘quvchi yo‘q"
                description="O‘quvchilar sinf kodini kiritib qo‘shilgach, ular shu yerda ko‘rinadi."
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
                    <TableHead>Topshirgan testlar</TableHead>
                    <TableHead className="text-right">O‘rtacha ball</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => {
                    const isMe = row.studentId === data.myStudentId;
                    return (
                      <TableRow
                        key={row.studentId}
                        className={cn(isMe && 'bg-soft/70 hover:bg-soft/70')}
                      >
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-bold',
                              row.rank === null
                                ? 'bg-muted text-slate-400'
                                : row.rank === 1
                                  ? 'bg-warning text-white'
                                  : row.rank <= 3
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'bg-muted text-slate-600',
                            )}
                          >
                            {row.rank ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn('font-medium', isMe && 'font-bold text-primary-800')}>
                              {row.studentName}
                            </span>
                            {isMe && <Badge variant="default">Siz</Badge>}
                          </div>
                          {row.rank === null && (
                            <p className="text-xs text-muted-foreground">Hali test topshirmagan</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.testsCompleted}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'font-semibold',
                              row.rank === null && 'text-muted-foreground',
                            )}
                          >
                            {row.rank === null ? '—' : formatScore(row.averageScore)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
