import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  BrainCircuit,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Loader2,
  Pencil,
  RefreshCw,
  Rocket,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Progress, PageSkeleton } from '@/components/ui/progress';
import { ErrorState } from '@/components/empty-state';
import { ApprovalBadge, TestStatusBadge, VerificationBadge } from '@/components/status-badges';
import { MathText, QuestionDiagram } from '@/components/math/math-text';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useApi } from '@/lib/useApi';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import type { Question, TestDetail } from '@/lib/types';
import { cn, jobStatusLabels, optionLabels, processingSteps } from '@/lib/utils';

const stepIcons = {
  upload: UploadCloud,
  scan: ScanLine,
  brain: BrainCircuit,
  shield: ShieldCheck,
  check: ClipboardCheck,
} as const;

function stageIndex(status: string | undefined): number {
  if (!status) return -1;
  if (status === 'COMPLETED') return processingSteps.length;
  const order = ['QUEUED', 'READING', 'EXTRACTING', 'SOLVING', 'VERIFYING', 'BUILDING'];
  return order.indexOf(status);
}

export default function TestReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data, loading, error, reload } = useApi<TestDetail>(id ? `/api/tests/${id}` : null, {
    pollMs: 3000,
  });

  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState({
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    solution: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishClassroom, setPublishClassroom] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  const [retrying, setRetrying] = useState(false);

  const test = data?.test;
  const job = data?.job;
  const questions = data?.questions ?? [];
  const summary = data?.summary;
  const isProcessing = test?.status === 'PROCESSING' || (job ? !['COMPLETED', 'FAILED'].includes(job.status) : false);

  useEffect(() => {
    if (test?.id) setPublishClassroom(test.classroom.id);
  }, [test?.id, test?.classroom.id]);

  const isPublished = test?.status === 'PUBLISHED';
  const approvedCount = summary?.approved ?? 0;

  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.order - b.order),
    [questions],
  );

  function openEdit(question: Question) {
    setEditError('');
    setEditForm({
      questionText: question.questionText,
      options: [...question.options],
      correctAnswer: question.correctAnswer,
      solution: question.solution,
    });
    setEditQuestion(question);
  }

  async function saveEdit() {
    if (!editQuestion) return;
    setEditError('');
    if (!editForm.questionText.trim()) {
      setEditError('Savol matni bo‘sh bo‘lmasligi kerak.');
      return;
    }
    if (editForm.options.some((option) => !option.trim())) {
      setEditError('Barcha to‘rt variantni to‘ldiring.');
      return;
    }
    setSavingEdit(true);
    try {
      await api(`/api/questions/${editQuestion.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          questionText: editForm.questionText.trim(),
          options: editForm.options.map((option) => option.trim()),
          correctAnswer: editForm.correctAnswer,
          solution: editForm.solution,
        }),
      });
      toast.success('Savol saqlandi', 'Tasdiqlash uchun qayta tasdiqlang.');
      setEditQuestion(null);
      reload();
    } catch (err) {
      setEditError(errorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  }

  async function runQuestionAction(questionId: string, action: 'approve' | 'unapprove' | 'regenerate') {
    setBusyId(questionId);
    try {
      const endpoints = {
        approve: `/api/questions/${questionId}/approve`,
        unapprove: `/api/questions/${questionId}/unapprove`,
        regenerate: `/api/questions/${questionId}/regenerate`,
      };
      await api(endpoints[action], { method: 'POST' });
      if (action === 'approve') toast.success('Savol tasdiqlandi');
      if (action === 'unapprove') toast.success('Tasdiq bekor qilindi');
      if (action === 'regenerate') toast.success('Variantlar qayta yaratildi');
      reload();
    } catch (err) {
      toast.error('Amalni bajarishda xatolik', errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await api(`/api/questions/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Savol o‘chirildi');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      toast.error('O‘chirishda xatolik', errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      await api(`/api/tests/${id}/retry`, { method: 'POST' });
      toast.success('PDF qayta ishlash boshlandi');
      reload();
    } catch (err) {
      toast.error('Qayta urinishda xatolik', errorMessage(err));
    } finally {
      setRetrying(false);
    }
  }

  async function handlePublish() {
    setPublishError('');
    if (!publishClassroom) {
      setPublishError('Sinfni tanlang.');
      return;
    }
    setPublishing(true);
    try {
      await api(`/api/tests/${id}/publish`, {
        method: 'PATCH',
        body: JSON.stringify({ classroomId: publishClassroom }),
      });
      toast.success('Test nashr qilindi', 'Endi o‘quvchilar testni ko‘rishlari mumkin.');
      setPublishOpen(false);
      reload();
    } catch (err) {
      setPublishError(errorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  if (loading && !data) return <PageSkeleton />;
  if (error && !data) {
    return <ErrorState description={error} action={<Button onClick={reload}>Qayta urinish</Button>} />;
  }
  if (!data || !test) return null;

  if (isProcessing) {
    const currentStage = stageIndex(job?.status);
    const progress = job?.progress ?? 0;
    return (
      <div className="space-y-6">
        <PageHeader
          title={test.title}
          description="AI PDF ni tahlil qilmoqda. Sahifadan chiqishingiz mumkin — jarayon serverda davom etadi."
          backTo="/teacher/tests"
          backLabel="Testlarim"
          actions={<TestStatusBadge status={test.status} />}
        />

        <Card className="overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
                <Sparkles className="h-7 w-7" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-primary" />
                </span>
              </div>
              <h2 className="mt-4 font-display text-xl font-bold">AI testni tayyorlamoqda</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {jobStatusLabels[job?.status ?? 'QUEUED']} — bu bir necha daqiqa olishi mumkin.
              </p>

              <div className="mt-6 w-full max-w-xl">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Umumiy jarayon</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="mt-2 h-2.5" />
              </div>
            </div>

            <div className="mx-auto mt-8 grid max-w-2xl gap-2.5">
              {processingSteps.map((step, index) => {
                const Icon = stepIcons[step.icon];
                const reached = currentStage > index;
                const active = currentStage === index;
                const isDone = job?.status === 'COMPLETED' || reached;
                return (
                  <div
                    key={step.key}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3.5 transition',
                      isDone && 'border-success/25 bg-success-soft/50',
                      active && 'border-primary/30 bg-soft',
                      !isDone && !active && 'border-white/70 bg-white/70 backdrop-blur-md',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        isDone && 'bg-success text-white',
                        active && 'bg-primary text-white',
                        !isDone && !active && 'bg-muted text-slate-400',
                      )}
                    >
                      {isDone ? (
                        <Check className="h-4 w-4" />
                      ) : active ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          isDone && 'text-success-foreground',
                          active && 'text-primary-700',
                          !isDone && !active && 'text-muted-foreground',
                        )}
                      >
                        {index + 1}. {step.label}
                      </p>
                    </div>
                    {isDone && <Badge variant="success">Tayyor</Badge>}
                    {active && <Badge variant="default">Davom etmoqda</Badge>}
                  </div>
                );
              })}
            </div>

            {job?.errorMessage && (
              <div className="mx-auto mt-6 flex max-w-2xl items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-soft/50 p-3.5 text-sm text-danger-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{job.errorMessage}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (test.status === 'DRAFT' && job?.status === 'FAILED') {
    return (
      <div className="space-y-6">
        <PageHeader
          title={test.title}
          description="PDF ni qayta ishlashda xatolik yuz berdi."
          backTo="/teacher/tests"
          backLabel="Testlarim"
        />
        <Card>
          <CardContent className="flex flex-col items-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
              <FileWarning className="h-7 w-7" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold">PDF ishlanmadi</h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              {job.errorMessage ?? 'Noma’lum xatolik yuz berdi.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button onClick={handleRetry} loading={retrying}>
                <RefreshCw className="h-4 w-4" /> Qayta urinish
              </Button>
              <Button asChild variant="outline">
                <Link to="/teacher/tests/new">Yangi PDF yuklash</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={test.title}
        description={`${test.classroom.name} sinfi · ${test.durationMinutes} daqiqa · ${questions.length} savol`}
        backTo="/teacher/tests"
        backLabel="Testlarim"
        actions={
          <>
            <TestStatusBadge status={test.status} />
            {isPublished ? (
              <Button asChild>
                <Link to={`/teacher/tests/${test.id}/results`}>
                  <BarChart3 className="h-4 w-4" /> Natijalar
                </Link>
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setPublishError('');
                  setPublishOpen(true);
                }}
                disabled={approvedCount === 0}
              >
                <Rocket className="h-4 w-4" /> Testni nashr qilish
              </Button>
            )}
          </>
        }
      />

      {isPublished && (
        <div className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success-soft/60 p-4 text-sm text-success-foreground">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Test nashr qilingan. O‘quvchilar uni “Testlarim” bo‘limida ko‘rishlari mumkin.
            Savollarni endi tahrirlash mumkin emas.
          </p>
        </div>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Jami savollar', value: summary?.total ?? 0, icon: ClipboardCheck, tone: 'text-primary bg-soft' },
          { label: 'Tekshirilgan', value: summary?.verified ?? 0, icon: ShieldCheck, tone: 'text-success bg-success-soft' },
          { label: 'Tekshirish kerak', value: summary?.needsReview ?? 0, icon: ShieldAlert, tone: 'text-warning bg-warning-soft' },
          { label: 'Tasdiqlangan', value: approvedCount, icon: CheckCircle2, tone: 'text-primary bg-primary-50' },
        ].map((item) => (
          <Card key={item.label} className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1.5 font-display text-2xl font-bold">{item.value}</p>
              </div>
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', item.tone)}>
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const pending = sortedQuestions.filter((question) => question.approvalStatus !== 'APPROVED');
            if (pending.length === 0) {
              toast.toast({ title: 'Tasdiqlash uchun savol yo‘q' });
              return;
            }
            void (async () => {
              let done = 0;
              for (const question of pending) {
                try {
                  await api(`/api/questions/${question.id}/approve`, { method: 'POST' });
                  done += 1;
                } catch {
                  /* o'tkazib yuboramiz */
                }
              }
              toast.success(`${done} savol tasdiqlandi`, done < pending.length ? 'Ba’zilari xato berdi.' : undefined);
              reload();
            })();
          }}
          disabled={isPublished}
        >
          <Check className="h-4 w-4" /> Barchasini tasdiqlash
        </Button>
        <p className="text-xs text-muted-foreground">
          Tasdiqlanmagan savollar testga kirmaydi. Kamida bitta tasdiqlangan savol bo‘lsa nashr
          qilish mumkin.
        </p>
      </div>

      <div className="space-y-4">
        {sortedQuestions.map((question) => {
          const busy = busyId === question.id;
          return (
            <Card key={question.id} className="overflow-hidden">
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 border-b border-white/60 pb-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft font-display text-sm font-bold text-primary-700">
                    {question.questionNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <VerificationBadge status={question.verificationStatus} />
                      <ApprovalBadge status={question.approvalStatus} />
                      <Badge variant="outline">PDF {question.sourcePage}-bet</Badge>
                    </div>
                    {question.verificationNote && (
                      <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                        {question.verificationNote}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {!isPublished && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(question)}>
                        <Pencil className="h-3.5 w-3.5" /> Tahrirlash
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => runQuestionAction(question.id, 'regenerate')}
                        disabled={busy}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Qayta yaratish
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-soft hover:text-danger"
                        onClick={() => setDeleteTarget(question)}
                        disabled={busy}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> O‘chirish
                      </Button>
                    </>
                  )}
                  {question.approvalStatus === 'APPROVED' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runQuestionAction(question.id, 'unapprove')}
                      disabled={busy || isPublished}
                    >
                      <X className="h-3.5 w-3.5" /> Tasdiqni bekor qilish
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => runQuestionAction(question.id, 'approve')}
                      disabled={busy || isPublished}
                    >
                      <Check className="h-3.5 w-3.5" /> Tasdiqlash
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-5">
                <MathText text={question.questionText} className="text-[15px] leading-relaxed text-foreground" />

                {question.pageImageUrl && question.diagramBBox && (
                  <div className="max-w-xl">
                    <QuestionDiagram imageUrl={question.pageImageUrl} bbox={question.diagramBBox} />
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  {question.options.map((option, index) => {
                    const correct = index === question.correctAnswer;
                    return (
                      <div
                        key={index}
                        className={cn(
                          'flex items-start gap-2.5 rounded-xl border px-3 py-2.5',
                          correct
                            ? 'border-success/40 bg-success-soft/50'
                            : 'border-white/70 bg-white/70 backdrop-blur-md',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                            correct ? 'bg-success text-white' : 'bg-muted text-slate-600',
                          )}
                        >
                          {optionLabels[index]}
                        </span>
                        <MathText text={option} className="min-w-0 flex-1 text-sm" />
                        {correct && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />}
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-white/60 bg-white/55 p-4 backdrop-blur-md">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <BrainCircuit className="h-3.5 w-3.5" /> AI yechimi
                  </p>
                  <MathText
                    text={question.solution}
                    block
                    className="mt-2 text-sm leading-relaxed text-slate-700"
                  />
                  {question.verificationMethod && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Tekshiruv usuli: {question.verificationMethod}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!isPublished && (
        <Card className="border-primary/25 bg-soft/40">
          <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-display text-base font-bold">Hammasi tayyormi?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tasdiqlangan savollar soni: {approvedCount}. Nashr qilingandan so‘ng o‘quvchilar
                testni boshlashi mumkin.
              </p>
            </div>
            <Button
              onClick={() => {
                setPublishError('');
                setPublishOpen(true);
              }}
              disabled={approvedCount === 0}
              size="lg"
            >
              <Rocket className="h-4 w-4" /> Testni nashr qilish
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(editQuestion)} onOpenChange={(open) => !open && setEditQuestion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Savolni tahrirlash</DialogTitle>
            <DialogDescription>
              Tahrirlashdan so‘ng savol qayta tekshiruv talab qiladi va avtomatik tasdiqdan
              chiqariladi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editError && (
              <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft/60 p-3 text-sm text-danger-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}
            <Field label="Savol matni" htmlFor="edit-question">
              <Textarea
                id="edit-question"
                value={editForm.questionText}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, questionText: event.target.value }))
                }
                className="min-h-[110px] font-mono text-[13px]"
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Formulalarni <code>$...$</code> ichida LaTeX ko‘rinishida yozing, masalan{' '}
              <code>$3x+7=22$</code>.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium">Variantlar</p>
              {editForm.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm((current) => ({ ...current, correctAnswer: index }))
                    }
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition',
                      editForm.correctAnswer === index
                        ? 'bg-success text-white'
                        : 'bg-muted text-slate-600 hover:bg-slate-200',
                    )}
                    title="To‘g‘ri javob sifatida belgilash"
                  >
                    {optionLabels[index]}
                  </button>
                  <Input
                    value={option}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        options: current.options.map((item, position) =>
                          position === index ? event.target.value : item,
                        ),
                      }))
                    }
                    placeholder={`${optionLabels[index]} varianti`}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                To‘g‘ri javob: <strong>{optionLabels[editForm.correctAnswer]}</strong> (variant
                yonidagi harfni bosib o‘zgartiring).
              </p>
            </div>
            <Field label="Yechim" htmlFor="edit-solution">
              <Textarea
                id="edit-solution"
                value={editForm.solution}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, solution: event.target.value }))
                }
                className="min-h-[90px] font-mono text-[13px]"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditQuestion(null)}>
              Bekor qilish
            </Button>
            <Button onClick={saveEdit} loading={savingEdit}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Testni nashr qilish</DialogTitle>
            <DialogDescription>
              Nashr qilingandan so‘ng test tanlangan sinf o‘quvchilariga ko‘rinadi. Savollarni
              tahrirlash mumkin bo‘lmaydi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {publishError && (
              <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft/60 p-3 text-sm text-danger-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{publishError}</span>
              </div>
            )}
            <Field label="Sinf" htmlFor="publish-classroom" required>
              <select
                id="publish-classroom"
                value={publishClassroom}
                onChange={(event) => setPublishClassroom(event.target.value)}
                className="h-11 w-full rounded-xl border border-white/70 bg-white/80 px-3.5 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md focus:border-primary/60 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/15 supports-[backdrop-filter]:bg-white/55"
              >
                {data.classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="rounded-xl bg-muted/60 p-3.5 text-sm">
              <p className="font-semibold">{approvedCount} ta savol nashr qilinadi</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Vaqt chegarasi: {test.durationMinutes} daqiqa.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handlePublish} loading={publishing}>
              <Rocket className="h-4 w-4" /> Nashr qilish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Savolni o‘chirasizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${deleteTarget.questionNumber}-savol butunlay o‘chiriladi. Bu amalni bekor qilib bo‘lmaydi.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction variant="danger" onClick={handleDelete}>
              O‘chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
