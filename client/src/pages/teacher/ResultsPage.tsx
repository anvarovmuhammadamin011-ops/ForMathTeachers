import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, FileText, Search, Users } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageSkeleton } from '@/components/ui/progress';
import { EmptyState, ErrorState } from '@/components/empty-state';
import { TestStatusBadge } from '@/components/status-badges';
import { useApi } from '@/lib/useApi';
import type { TestListItem } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export default function TeacherResultsPage() {
  const { data, loading, error, reload } = useApi<{ tests: TestListItem[] }>('/api/tests');
  const [query, setQuery] = useState('');

  const tests = data?.tests ?? [];
  const filtered = useMemo(
    () => tests.filter((test) => test.title.toLowerCase().includes(query.trim().toLowerCase())),
    [tests, query],
  );

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return <ErrorState description={error} action={<Button onClick={reload}>Qayta urinish</Button>} />;
  }

  const totalAttempts = tests.reduce((sum, test) => sum + test.attemptCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Natijalar"
        description="Har bir test bo‘yicha topshirilgan ishlar, ballar va sarflangan vaqt."
      />

      <div className="grid gap-3.5 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Jami testlar
          </p>
          <p className="mt-1.5 font-display text-2xl font-bold">{tests.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Jami urinishlar
          </p>
          <p className="mt-1.5 font-display text-2xl font-bold">{totalAttempts}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Nashr qilingan
          </p>
          <p className="mt-1.5 font-display text-2xl font-bold">
            {tests.filter((test) => test.status === 'PUBLISHED').length}
          </p>
        </Card>
      </div>

      <div className="relative sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Test nomi bo‘yicha qidirish..."
          className="pl-9"
        />
      </div>

      {tests.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Natijalar hali yo‘q"
          description="Test yarating va nashr qiling — o‘quvchilar topshirgach natijalar shu yerda ko‘rinadi."
          action={
            <Button asChild>
              <Link to="/teacher/tests/new">Yangi test yaratish</Link>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="Natija topilmadi" description="Boshqa nom bilan qidirib ko‘ring." />
      ) : (
        <div className="space-y-3">
          {filtered.map((test) => (
            <Card key={test.id} className="transition hover:shadow-pop">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-soft text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/teacher/tests/${test.id}/results`}
                        className="truncate font-semibold text-foreground transition hover:text-primary"
                      >
                        {test.title}
                      </Link>
                      <TestStatusBadge status={test.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{test.classroom.name}</Badge>
                      <span>{formatDate(test.createdAt)}</span>
                      <span>·</span>
                      <span>{test.questionCount} savol</span>
                      <span>·</span>
                      <span>{test.durationMinutes} daqiqa</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> Urinishlar
                    </p>
                    <p className="font-display text-lg font-bold">{test.attemptCount}</p>
                  </div>
                  <Button asChild variant={test.status === 'PUBLISHED' ? 'default' : 'outline'}>
                    <Link to={`/teacher/tests/${test.id}/results`}>
                      <BarChart3 className="h-4 w-4" /> Natijalar
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
