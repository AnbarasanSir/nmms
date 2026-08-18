import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StudentEntry } from './components/StudentEntry';
import { ExamEngine } from './components/ExamEngine';
import { StudentScorecard } from './components/StudentScorecard';
import { TeacherAdmin } from './components/TeacherAdmin';
import { Quiz, StudentAttempt, Question } from './types';
import { INITIAL_QUIZZES } from './data/mockQuizzes';
import { requestFullscreen, exitFullscreen } from './utils/fullscreen';

export default function App() {
  // If ?quiz= or ?test= is in URL, open student test entry. Otherwise default strictly to teacher admin.
  const [currentView, setCurrentView] = useState<'student_entry' | 'exam' | 'scorecard' | 'teacher_admin'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('quiz') || params.get('test')) {
        return 'student_entry';
      }
    }
    return 'teacher_admin';
  });

  const [quizzes, setQuizzes] = useState<Quiz[]>(INITIAL_QUIZZES);
  const [selectedQuizId, setSelectedQuizId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('quiz') || params.get('test') || INITIAL_QUIZZES[0]?.id || '';
    }
    return INITIAL_QUIZZES[0]?.id || '';
  });
  const [activeExamQuiz, setActiveExamQuiz] = useState<Quiz | null>(null);
  const [studentData, setStudentData] = useState<{
    studentName: string;
    examNumber: string;
  } | null>(null);
  const [scorecardData, setScorecardData] = useState<{
    attempt: StudentAttempt;
    questions: Question[];
    quizTitle?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch all quizzes on load
  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          if (data.length === 0) {
            setQuizzes([]);
            return;
          }
          // If we receive summary list, fetch full details for active quizzes
          const fullQuizzesRes = await Promise.all(
            data.map(async (item: any) => {
              const qRes = await fetch(`/api/quizzes/${item.id}`);
              return qRes.ok ? await qRes.json() : null;
            })
          );
          const validFull = fullQuizzesRes.filter(Boolean);
          setQuizzes(validFull);
          return;
        }
      }
    } catch (e) {
      console.warn('Backend API not ready yet or using initial mocks:', e);
    }
  };

  useEffect(() => {
    fetchQuizzes();

    // Check for direct URL quiz query parameter e.g., ?quiz=pyq-2024-mat
    const params = new URLSearchParams(window.location.search);
    const quizParam = params.get('quiz') || params.get('test');
    if (quizParam) {
      setSelectedQuizId(quizParam);
      setCurrentView('student_entry');

      // Fetch the specific quiz immediately if not loaded
      fetch(`/api/quizzes/${quizParam}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((directQuiz) => {
          if (directQuiz) {
            setQuizzes((prev) => {
              if (prev.some((q) => q.id === directQuiz.id)) return prev;
              return [directQuiz, ...prev];
            });
          }
        })
        .catch((e) => console.warn('Could not pre-fetch direct quiz:', e));
    }
  }, []);

  // Handle Starting Exam
  const handleStartExam = async (authData: {
    studentName: string;
    examNumber: string;
    quizId: string;
  }) => {
    setErrorMessage(null);
    requestFullscreen();
    try {
      // Fetch fresh exam questions for student (with security masking)
      const res = await fetch(`/api/quizzes/${authData.quizId}?role=student`);
      let examQuiz: Quiz;
      if (res.ok) {
        examQuiz = await res.json();
      } else {
        const fallback = quizzes.find((q) => q.id === authData.quizId) || quizzes[0];
        examQuiz = fallback;
      }

      setStudentData({
        studentName: authData.studentName,
        examNumber: authData.examNumber,
      });
      setActiveExamQuiz(examQuiz);
      setCurrentView('exam');
      // Ensure fullscreen is requested when transitioning to exam view
      requestFullscreen();
    } catch (err: any) {
      console.error('Failed to initiate exam session:', err);
      setErrorMessage('Failed to connect to exam server. Please try again.');
    }
  };

  // Handle Submitting Exam
  const handleSubmitExam = async (submissionPayload: {
    answers: Record<string, 'A' | 'B' | 'C' | 'D' | null>;
    questionStatus: Record<string, 'answered' | 'marked' | 'visited' | 'unvisited' | 'marked_answered'>;
    timeTakenSeconds: number;
    tabSwitchCount: number;
  }) => {
    if (!activeExamQuiz || !studentData) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/quizzes/${activeExamQuiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentData.studentName,
          examNumber: studentData.examNumber,
          answers: submissionPayload.answers,
          questionStatus: submissionPayload.questionStatus,
          timeTakenSeconds: submissionPayload.timeTakenSeconds,
          tabSwitchCount: submissionPayload.tabSwitchCount,
          clientQuestions: activeExamQuiz.questions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to grade submission');
      }

      // Exit fullscreen gracefully when exam finishes
      exitFullscreen();

      setScorecardData({
        attempt: data.attempt,
        questions: data.quizDetails.questions || activeExamQuiz.questions,
        quizTitle: data.quizDetails.title || activeExamQuiz.title,
      });

      setCurrentView('scorecard');
    } catch (err: any) {
      console.error('Submission failed:', err);
      setErrorMessage(err.message || 'Submission error. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewScorecard = (attempt: StudentAttempt, questions: Question[]) => {
    const matchedQuiz = quizzes.find((q) => q.id === attempt.quizId);
    setScorecardData({
      attempt,
      questions,
      quizTitle: matchedQuiz?.title,
    });
    setCurrentView('scorecard');
  };

  const handleRetakeExam = () => {
    const qId = activeExamQuiz?.id || scorecardData?.attempt.quizId || selectedQuizId || quizzes[0]?.id;
    if (qId) {
      setSelectedQuizId(qId);
    }
    setScorecardData(null);
    setActiveExamQuiz(null);
    setCurrentView('student_entry');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          setErrorMessage(null);
          setCurrentView(view);
        }}
        onAdminLogout={() => {
          try {
            sessionStorage.removeItem('nmms_admin_auth');
            localStorage.removeItem('nmms_admin_auth');
          } catch {
            // ignore
          }
          setErrorMessage(null);
          setCurrentView('student_entry');
        }}
        examInProgress={currentView === 'exam'}
      />

      {/* Global Error Notice */}
      {errorMessage && (
        <div className="bg-rose-600 text-white text-xs sm:text-sm py-2 px-4 text-center font-medium shadow-md">
          {errorMessage}
        </div>
      )}

      {/* Main Content Router */}
      <main className="flex-1">
        {currentView === 'student_entry' && (
          <StudentEntry
            quizzes={quizzes}
            selectedQuizId={selectedQuizId}
            initialExamNumber={studentData?.examNumber || scorecardData?.attempt.examNumber}
            onStartExam={handleStartExam}
            onViewScorecard={handleViewScorecard}
          />
        )}

        {currentView === 'exam' && activeExamQuiz && studentData && (
          <ExamEngine
            quiz={activeExamQuiz}
            studentData={studentData}
            onSubmitExam={handleSubmitExam}
            isSubmitting={isSubmitting}
          />
        )}

        {currentView === 'scorecard' && scorecardData && (
          <StudentScorecard
            attempt={scorecardData.attempt}
            questions={scorecardData.questions}
            quizTitle={scorecardData.quizTitle}
            onRetake={handleRetakeExam}
            onGoHome={() => setCurrentView('student_entry')}
          />
        )}

        {currentView === 'teacher_admin' && (
          <TeacherAdmin
            quizzes={quizzes}
            onRefreshQuizzes={fetchQuizzes}
            onPreviewQuizAsStudent={(quizId) => {
              setSelectedQuizId(quizId);
              setCurrentView('student_entry');
            }}
          />
        )}
      </main>

      {/* Footer (hidden in exam and scorecard print mode) */}
      {currentView !== 'exam' && (
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400 print:hidden">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>
              © 2026 <strong>NMMS Exam Portal</strong> — National Means-cum-Merit Scholarship Assessment Platform (MAT &amp; SAT).
            </p>
            <p className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Automated Objective Grading &amp; Real-Time Analytics Active</span>
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
