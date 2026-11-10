import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Crown, Medal, School, Trophy, Users } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton } from '@/components/ui/progress';
import { EmptyState, ErrorState } from '@/components/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApi } from '@/lib/useApi';
import type { ClassroomRanking, ClassroomSummary } from '@/lib/types';
import { cn, formatScore } from '@/lib/utils';

export default function TeacherRankingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('classroomId') ?? '';

  const { data: classData, loading: classesLoading, error: classesError, reload } = useApi<{
    classrooms: ClassroomSummary[];
  }>('/api/classes');

  const classrooms = classData?.classrooms ?? [];
  const [classroomId, setClassroomId] = useState(requested);

  useEffect(() => {
    if (!classroomId && classrooms.length > 0) {
      setClassroomId(requested || classrooms[0]!.id);
    }
  }, [classrooms, classroomId, requested]);

  const {
    data: ranking,
    loading: rankingLoading,
    error: rankingError,
    reload: reloadRanking,
  } = useApi<ClassroomRanking>(
    classroomId ? `/api/classes/${classroomId}/ranking` : null,
  );

  function selectClassroom(id: string) {
    setClassroomId(id);
    setSearchParams({ classroomId: id }, { replace: true });
  }

  if (classesLoading && !classData) return <PageSkeleton />;
  if (classesError && !classData) {
    return <ErrorState description={classesError} action={<Button onClick={reload}>Qayta urinish</Button>} />;
  }

  if (classrooms.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reyting" description="Sinf bo‘yicha o‘quvchilar reytingi." />
        <EmptyState
          icon={Trophy}
          title="Reyting uchun sinf kerak"
          description="Avval sinf yarating va test nashr qiling. O‘quvchilar topshirgach reyting avtomatik shakllanadi."
          action={
            <Button asChild>
              <Link to="/teacher/classrooms">Sinflarim</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const rows = ranking?.rows ?? [];
  const ranked = rows.filter((row) => row.rank !== null);
  const podium = ranked.slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reyting"
        description="O‘quvchilarning barcha topshirilgan testlar bo‘yicha o‘rtacha foiz balli asosida saralash."
      />

      <div className="flex flex-wrap gap-2">
        {classrooms.map((classroom) => (
          <button
            key={classroom.id}
            type="button"
            onClick={() => selectClassroom(classroom.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition',
              classroom.id === classroomId
                ? 'border-primary bg-primary text-white shadow-sm shadow-primary/25'
                : 'border-white/70 bg-white/70 text-muted-foreground backdrop-blur-md hover:border-primary/30 hover:bg-white/90 hover:text-foreground',
            )}
          >
            <School className="h-4 w-4" />
            {classroom.name}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                classroom.id === classroomId ? 'bg-white/20' : 'bg-muted text-slate-600',
              )}
            >
              {classroom.studentCount}
            </span>
          </button>
        ))}
      </div>

      {rankingLoading && !ranking ? (
        <PageSkeleton />
      ) : rankingError && !ranking ? (
        <ErrorState
          description={rankingError}
          action={<Button onClick={reloadRanking}>Qayta urinish</Button>}
        />
      ) : !ranking ? null : (
        <>
          {podium.length > 0 && (
            <div className="grid gap-3.5 sm:grid-cols-3">
              {podium.map((row, index) => (
                <Card
                  key={row.studentId}
                  className={cn(
                    'relative overflow-hidden',
                    index === 0 && 'border-warning/40 bg-gradient-to-br from-warning-soft/70 to-white',
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
                      <Badge variant={index === 0 ? 'warning' : 'neutral'}>#{row.rank}</Badge>
                    </div>
                    <p className="mt-3 truncate font-display text-base font-bold">{row.studentName}</p>
                    <p className="text-xs text-muted-foreground">{row.testsCompleted} test topshirgan</p>
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
                <CardTitle>{ranking.classroom.name} — umumiy reyting</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ranking.classroom.studentCount} o‘quvchi · {ranking.classroom.totalTests} nashr
                  qilingan test
                </p>
              </div>
              <Badge variant="outline">
                <Users className="h-3 w-3" /> {ranked.length} natijali
              </Badge>
            </CardHeader>
            <CardContent className="px-0 pb-0 sm:px-0">
              {rows.length === 0 ? (
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
                      {rows.map((row) => (
                        <TableRow key={row.studentId}>
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
                            <p className="font-medium">{row.studentName}</p>
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
