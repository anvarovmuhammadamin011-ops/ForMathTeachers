import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/app-shell';
import { Brand } from '@/components/brand';
import { useAuth } from '@/lib/auth';
import LoginPage from '@/pages/auth/LoginPage';
import TeacherDashboardPage from '@/pages/teacher/DashboardPage';
import ClassroomsPage from '@/pages/teacher/ClassroomsPage';
import ClassroomDetailPage from '@/pages/teacher/ClassroomDetailPage';
import TestsPage from '@/pages/teacher/TestsPage';
import NewTestPage from '@/pages/teacher/NewTestPage';
import TestReviewPage from '@/pages/teacher/TestReviewPage';
import TeacherResultsPage from '@/pages/teacher/ResultsPage';
import TestResultsPage from '@/pages/teacher/TestResultsPage';
import TeacherRankingPage from '@/pages/teacher/RankingPage';
import StudentDashboardPage from '@/pages/student/DashboardPage';
import StudentTestsPage from '@/pages/student/TestsPage';
import StudentResultsPage from '@/pages/student/ResultsPage';
import StudentRankingPage from '@/pages/student/RankingPage';
import AttemptPage from '@/pages/student/AttemptPage';
import ResultDetailPage from '@/pages/shared/ResultDetailPage';
import NotFoundPage from '@/pages/NotFoundPage';

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5">
      <div className="animate-pulse-soft">
        <Brand />
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-[shimmer_1.2s_infinite] rounded-full bg-primary" />
      </div>
    </div>
  );
}

function homeFor(role: 'TEACHER' | 'STUDENT' | undefined) {
  return role === 'TEACHER' ? '/teacher' : '/student';
}

function Protected({ role }: { role: 'TEACHER' | 'STUDENT' }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/kirish" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return <Navigate to={user ? homeFor(user.role) : '/kirish'} replace />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/kirish" element={<LoginPage />} />
        <Route path="/royxatdan-otish/*" element={<Navigate to="/kirish" replace />} />

        <Route element={<Protected role="TEACHER" />}>
          <Route element={<AppShell />}>
            <Route path="/teacher" element={<TeacherDashboardPage />} />
            <Route path="/teacher/classrooms" element={<ClassroomsPage />} />
            <Route path="/teacher/classrooms/:id" element={<ClassroomDetailPage />} />
            <Route path="/teacher/tests" element={<TestsPage />} />
            <Route path="/teacher/tests/new" element={<NewTestPage />} />
            <Route path="/teacher/tests/:id" element={<TestReviewPage />} />
            <Route path="/teacher/tests/:id/results" element={<TestResultsPage />} />
            <Route path="/teacher/results" element={<TeacherResultsPage />} />
            <Route path="/teacher/ranking" element={<TeacherRankingPage />} />
            <Route path="/teacher/attempts/:id" element={<ResultDetailPage />} />
          </Route>
        </Route>

        <Route element={<Protected role="STUDENT" />}>
          <Route element={<AppShell />}>
            <Route path="/student" element={<StudentDashboardPage />} />
            <Route path="/student/tests" element={<StudentTestsPage />} />
            <Route path="/student/results" element={<StudentResultsPage />} />
            <Route path="/student/results/:id" element={<ResultDetailPage />} />
            <Route path="/student/ranking" element={<StudentRankingPage />} />
          </Route>
          <Route path="/student/attempts/:id" element={<AttemptPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
