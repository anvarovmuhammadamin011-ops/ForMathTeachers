import { Link, useParams } from 'react-router-dom';
import {
  Copy,
  FileText,
  Plus,
  School,
  Trophy,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, TableSkeleton } from '@/components/ui/progress';
import { EmptyState, ErrorState } from '@/components/empty-state';
import { TestStatusBadge } from '@/components/status-badges';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApi } from '@/lib/useApi';
import { useToast } from '@/components/ui/toast';
import type { TestStatus } from '@/lib/types';
import { copyToClipboard, formatDate, formatScore, formatDuration } from '@/lib/utils';

interface ClassroomDetailResponse {
  classroom: { id: string; name: string; joinCode: string; createdAt: string };
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    joinedAt: string;
    averageScore: number;
    testsCompleted: number;
    rank: number | null;
  }>;
  tests: Array<{
    id: string;
    title: string;
    status: TestStatus;
    durationMinutes: number;
    questionCount: number;
    attemptCount: number;
    createdAt: string;
  }>;
}

export default function ClassroomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useApi<ClassroomDetailResponse>(
    id ? `/api/classes/${id}` : null,
  );
  const toast = useToast();

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return <ErrorState description={error} action={<Button onClick={reload}>Qayta urinish</Button>} />;
  }
  if (!data) return null;

  const { classroom, students, tests } = data;

  async function copyCode() {
    const ok = await copyToClipboard(classroom.joinCode);
    if (ok) toast.success('Kod nusxalandi', classroom.joinCode);
    else toast.error('Nusxalab bo‘lmadi');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={classroom.name}
        description={`Sinf ${formatDate(classroom.createdAt)} da yaratilgan. O‘quvchilar soni: ${students.length}.`}
        backTo="/teacher/classrooms"
        backLabel="Sinflarim"
        actions={
          <>
            <Button variant="outline" onClick={copyCode}>
              <Copy className="h-4 w-4" />
              {classroom.joinCode}
            </Button>
            <Button asChild variant="outline">
              <Link to={`/teacher/ranking?classroomId=${classroom.id}`}>
                <Trophy className="h-4 w-4" /> Reyting
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/teacher/tests/new?classroomId=${classroom.id}`}>
                <Plus className="h-4 w-4" /> Test yaratish
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-soft text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                O‘quvchilar
              </p>
              <p className="font-display text-2xl font-bold">{students.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-soft text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Testlar
              </p>
              <p className="font-display text-2xl font-bold">{tests.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-soft text-primary">
              <School className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Qo‘shilish kodi
              </p>
              <p className="font-mono text-xl font-bold tracking-widest">{classroom.joinCode}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>O‘quvchilar</CardTitle>
            <p className="text-sm text-muted-foreground">Sinfga qo‘shilgan o‘quvchilar ro‘yxati</p>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            {students.length === 0 ? (
              <div className="px-5 sm:px-6">
                <EmptyState
                  icon={Users}
                  title="Hali o‘quvchi yo‘q"
                  description={`O‘quvchilarga kodni bering: ${classroom.joinCode}`}
                  action={
                    <Button variant="outline" onClick={copyCode}>
                      <Copy className="h-4 w-4" /> Kodni nusxalash
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
                      <TableHead>O‘quvchi</TableHead>
                      <TableHead>Topshirgan</TableHead>
                      <TableHead>O‘rtacha</TableHead>
                      <TableHead className="text-right">O‘rin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <p className="font-semibold text-foreground">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">@{student.username}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {student.testsCompleted} test
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{formatScore(student.averageScore)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {student.rank === null ? (
                            <Badge variant="neutral">—</Badge>
                          ) : (
                            <Badge variant="default">#{student.rank}</Badge>
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

        <Card>
          <CardHeader>
            <CardTitle>Sinflar testlari</CardTitle>
            <p className="text-sm text-muted-foreground">Shu sinfga tegishli barcha testlar</p>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            {tests.length === 0 ? (
              <div className="px-5 sm:px-6">
                <EmptyState
                  icon={FileText}
                  title="Test yo‘q"
                  description="Bu sinf uchun birinchi testni yarating."
                  action={
                    <Button asChild>
                      <Link to={`/teacher/tests/new?classroomId=${classroom.id}`}>
                        <Plus className="h-4 w-4" /> Test yaratish
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
                      <TableHead>Holat</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell>
                          <Link
                            to={
                              test.status === 'PUBLISHED'
                                ? `/teacher/tests/${test.id}/results`
                                : `/teacher/tests/${test.id}`
                            }
                            className="font-semibold text-foreground hover:text-primary"
                          >
                            {test.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {test.questionCount} savol · {formatDuration(test.durationMinutes * 60)} ·{' '}
                            {test.attemptCount} urinish
                          </p>
                        </TableCell>
                        <TableCell>
                          <TestStatusBadge status={test.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost">
                            <Link
                              to={
                                test.status === 'PUBLISHED'
                                  ? `/teacher/tests/${test.id}/results`
                                  : `/teacher/tests/${test.id}`
                              }
                            >
                              Ochish
                            </Link>
                          </Button>
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

      {loading && <TableSkeleton />}
    </div>
  );
}
