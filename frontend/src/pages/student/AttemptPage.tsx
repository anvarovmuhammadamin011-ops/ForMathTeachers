import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  Timer,
} from 'lucide-react';
import { LogoMark } from '@/components/brand';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState, ErrorState } from '@/components/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MathText, QuestionDiagram } from '@/components/math/math-text';
import { useApi } from '@/lib/useApi';
import { ApiError, api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { AttemptData } from '@/lib/types';
import { cn, formatClock, optionLabels } from '@/lib/utils';

export default function AttemptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data, loading, error, reload } = useApi<AttemptData>(id ? `/api/attempts/${id}` : null);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [savingCount, setSavingCount] = useState(0);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);

  const submittingRef = useRef(false);
  const initializedRef = useRef(false);
  const saveQueue = useRef<Array<Promise<unknown>>>([]);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!data || initializedRef.current) return;
    initializedRef.current = true;
    const initial: Record<string, number> = {};
    for (const answer of data.answers) {
      initial[answer.questionId] = answer.selectedOption;
    }
    setAnswers(initial);
    setCurrentQuestionId(data.questions[0]?.id ?? null);
    setRemaining(
      Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000)),
    );
  }, [data]);

  useEffect(() => {
    if (data?.status === 'SUBMITTED') {
      navigate(`/student/results/${data.id}`, { replace: true });
    }
  }, [data?.status, data?.id, navigate]);

  useEffect(() => {
    if (!data || data.status !== 'IN_PROGRESS') return;
    const update = () => {
      setRemaining(
        Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000)),
      );
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [data]);

  const submit = useCallback(
    async (auto: boolean) => {
      if (!id || submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setConfirmOpen(false);
      try {
        await Promise.allSettled(saveQueue.current);
        await api(`/api/attempts/${id}/submit`, { method: 'POST' });
        toast.success(
          auto ? 'Vaqt tugadi' : 'Test topshirildi',
          auto ? 'Javoblaringiz avtomatik yuborildi.' : 'Natijangiz tayyor.',
        );
        navigate(`/student/results/${id}`, { replace: true });
      } catch (err) {
        toast.error('Topshirishda xatolik', errorMessage(err));
        submittingRef.current = false;
        setSubmitting(false);
        reload();
      }
    },
    [id, navigate, reload, toast],
  );

  useEffect(() => {
    if (remaining === 0 && data?.status === 'IN_PROGRESS') {
      void submit(true);
    }
  }, [remaining, data?.status, submit]);

  useEffect(() => {
    if (data?.status !== 'IN_PROGRESS') return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [data?.status]);

  function selectOption(questionId: string, option: number) {
    if (!id || !data || data.status !== 'IN_PROGRESS' || submittingRef.current) return;
    setAnswers((current) => ({ ...current, [questionId]: option }));
    setCurrentQuestionId(questionId);
    setSaveError('');
    setSavingCount((count) => count + 1);

    const request = api(`/api/attempts/${id}/answers`, {
      method: 'PUT',
      body: JSON.stringify({ questionId, selectedOption: option }),
    })
      .then(() => {
        setSavedAt(new Date());
      })
      .catch((err) => {
        setSaveError(errorMessage(err));
        if (err instanceof ApiError && (err.status === 409 || err.status === 410)) {
          reload();
        }
      })
      .finally(() => {
        setSavingCount((count) => Math.max(0, count - 1));
      });

    saveQueue.current = [...saveQueue.current.slice(-20), request];
  }

  function goToQuestion(questionId: string) {
    setCurrentQuestionId(questionId);
    questionRefs.current[questionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <LogoMark />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Test yuklanmoqda...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4">
          <ErrorState
            title="Testni ochib bo‘lmadi"
            description={error}
            action={<Button onClick={reload}>Qayta urinish</Button>}
          />
          <Button asChild variant="outline" className="w-full">
            <a href="/student/tests">
              <ArrowLeft className="h-4 w-4" /> Testlar ro‘yxatiga qaytish
            </a>
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (data.questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <EmptyState
          icon={AlertTriangle}
          title="Testda savollar yo‘q"
          description="Bu testda tasdiqlangan savollar mavjud emas. O‘qituvchingizga murojaat qiling."
          className="max-w-md"
          action={
            <Button asChild>
              <a href="/student/tests">Testlarga qaytish</a>
            </Button>
          }
        />
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = data.questions.length - answeredCount;
  const progress = Math.round((answeredCount / data.questions.length) * 100);
  const urgent = remaining !== null && remaining <= 60;
  const warning = remaining !== null && remaining > 60 && remaining <= 300;

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark className="h-9 w-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground sm:text-base">
                {data.test.title}
              </p>
              <p className="text-[11px] text-muted-foreground sm:text-xs">
                {answeredCount}/{data.questions.length} savol belgilangan
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-base font-bold tabular-nums sm:text-lg',
                urgent
                  ? 'border-danger/30 bg-danger-soft text-danger-foreground'
                  : warning
                    ? 'border-warning/30 bg-warning-soft text-warning-foreground'
                    : 'border-border bg-muted/60 text-foreground',
              )}
              aria-live="polite"
            >
              {urgent ? <AlertTriangle className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
              {remaining === null ? '--:--' : formatClock(remaining)}
            </div>
            <Button
              onClick={() => setConfirmOpen(true)}
              loading={submitting}
              size="sm"
              className="hidden sm:inline-flex"
            >
              {!submitting && <Send className="h-4 w-4" />}
              Topshirish
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        {urgent && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-soft/60 p-3.5 text-sm text-danger-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Diqqat! Bir daqiqadan kam vaqt qoldi. Vaqt tugagach test avtomatik topshiriladi.</span>
          </div>
        )}

        {saveError && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft/60 p-3.5 text-sm text-warning-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Javobni saqlab bo‘lmadi: {saveError}</span>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            {data.questions.map((question, index) => {
              const selected = answers[question.id];
              return (
                <div
                  key={question.id}
                  id={`question-${question.id}`}
                  ref={(element) => {
                    questionRefs.current[question.id] = element;
                  }}
                  className="scroll-mt-24"
                >
                  <Card
                    className={cn(
                      'transition',
                      currentQuestionId === question.id && 'border-primary/40 shadow-md',
                    )}
                  >
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft font-display text-sm font-bold text-primary-700">
                            {question.questionNumber}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {index + 1}-savol
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              PDF {question.sourcePage}-bet
                            </p>
                          </div>
                        </div>
                        {selected !== undefined && (
                          <Badge variant="success">
                            <Check className="h-3 w-3" /> Belgilangan
                          </Badge>
                        )}
                      </div>

                      <MathText
                        text={question.questionText}
                        className="mt-4 text-[15px] leading-relaxed text-foreground"
                      />

                      {question.pageImageUrl && question.diagramBBox && (
                        <div className="mt-4 max-w-xl">
                          <QuestionDiagram
                            imageUrl={question.pageImageUrl}
                            bbox={question.diagramBBox}
                          />
                        </div>
                      )}

                      <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup">
                        {question.options.map((option, optionIndex) => {
                          const isSelected = selected === optionIndex;
                          return (
                            <button
                              key={optionIndex}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => selectOption(question.id, optionIndex)}
                              disabled={submitting}
                              className={cn(
                                'flex items-start gap-2.5 rounded-xl border px-3 py-3 text-left transition',
                                isSelected
                                  ? 'border-primary bg-primary-50/85 shadow-sm ring-1 ring-primary/20 backdrop-blur-md'
                                  : 'border-white/70 bg-white/70 backdrop-blur-md hover:border-primary/30 hover:bg-white/95',
                              )}
                            >
                              <span
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                                  isSelected
                                    ? 'bg-primary text-white'
                                    : 'bg-muted text-slate-600',
                                )}
                              >
                                {optionLabels[optionIndex]}
                              </span>
                              <MathText
                                text={option}
                                className="min-w-0 flex-1 self-center text-sm text-foreground"
                              />
                              {isSelected && (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}

            <Card className="border-primary/25 bg-soft/40">
              <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
                <div>
                  <p className="font-display text-base font-bold">Barcha savollarni belgiladingizmi?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {unansweredCount > 0
                      ? `${unansweredCount} savol javobsiz qolgan.`
                      : 'Barcha savollarga javob berilgan.'}{' '}
                    Topshirgandan so‘ng javoblarni o‘zgartirish mumkin emas.
                  </p>
                </div>
                <Button onClick={() => setConfirmOpen(true)} loading={submitting} size="lg">
                  {!submitting && <Send className="h-4 w-4" />}
                  Testni topshirish
                </Button>
              </CardContent>
            </Card>
          </div>

          <aside className="order-first lg:sticky lg:top-20 lg:order-none lg:self-start">
            <Card>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Savollar paneli</p>
                  <Badge variant="default">
                    {answeredCount}/{data.questions.length}
                  </Badge>
                </div>
                <Progress value={progress} className="mt-3" />

                <div className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
                  {data.questions.map((question, index) => {
                    const answered = answers[question.id] !== undefined;
                    const isCurrent = currentQuestionId === question.id;
                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => goToQuestion(question.id)}
                        title={`${index + 1}-savol`}
                        className={cn(
                          'flex h-9 items-center justify-center rounded-lg text-xs font-bold transition',
                          answered
                            ? 'bg-primary text-white hover:bg-primary-700'
                            : 'bg-muted text-slate-600 hover:bg-slate-200',
                          isCurrent && 'ring-2 ring-primary/40 ring-offset-1',
                        )}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Belgilangan
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-muted" /> Belgilanmagan
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-2 text-[11px] text-muted-foreground">
                  {savingCount > 0 ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Saqlanmoqda...
                    </>
                  ) : savedAt ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-success" /> Saqlandi
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3" /> Javoblar avtomatik saqlanadi
                    </>
                  )}
                </div>

                <Button
                  onClick={() => setConfirmOpen(true)}
                  loading={submitting}
                  className="mt-3 w-full"
                >
                  {!submitting && <Send className="h-4 w-4" />}
                  Topshirish
                </Button>

                <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
                  Vaqt tugagach test avtomatik topshiriladi.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Testni topshirasizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              {unansweredCount > 0
                ? `${unansweredCount} savol javobsiz qolgan. `
                : 'Barcha savollarga javob berilgan. '}
              Topshirgandan so‘ng javoblarni o‘zgartirish yoki testni qayta topshirish mumkin
              emas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submit(false)}>
              Ha, topshirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
