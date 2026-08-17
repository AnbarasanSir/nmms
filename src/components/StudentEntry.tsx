import React, { useState, useEffect } from 'react';
import { Quiz, Question, StudentAttempt } from '../types';
import { findAuthorizedStudent } from '../data/students';
import { requestFullscreen } from '../utils/fullscreen';
import { 
  GraduationCap, 
  ArrowRight, 
  KeyRound, 
  Lock, 
  UserCheck, 
  Award, 
  Sparkles, 
  User, 
  RotateCcw, 
  Calendar, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
  FileCheck2,
  AlertCircle,
  HelpCircle,
  Trash2
} from 'lucide-react';

interface StudentEntryProps {
  quizzes: Quiz[];
  selectedQuizId: string | null;
  initialExamNumber?: string;
  onStartExam: (studentData: {
    studentName: string;
    examNumber: string;
    quizId: string;
  }) => void;
  onViewScorecard: (attempt: StudentAttempt, questions: Question[]) => void;
}

export const StudentEntry: React.FC<StudentEntryProps> = ({
  quizzes,
  selectedQuizId,
  initialExamNumber,
  onStartExam,
  onViewScorecard,
}) => {
  const [examNumberInput, setExamNumberInput] = useState(initialExamNumber || '');
  const [studentRoster, setStudentRoster] = useState<{ examNumber: string; studentName: string }[]>([]);
  const [studentNameInput, setStudentNameInput] = useState(() => {
    if (initialExamNumber) {
      const match = findAuthorizedStudent(initialExamNumber);
      return match?.studentName || '';
    }
    return '';
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // State when previous attempts for THIS quiz are found
  const [quizAttempts, setQuizAttempts] = useState<StudentAttempt[] | null>(null);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);

  // Fetch updated student roster on mount
  useEffect(() => {
    fetch('/api/students/roster')
      .then((res) => res.json())
      .then((data) => {
        if (data.students && Array.isArray(data.students)) {
          setStudentRoster(data.students);
        }
      })
      .catch(() => {});
  }, []);

  const lookupStudent = (examNo: string) => {
    const clean = examNo.trim().toUpperCase();
    const dynamicMatch = studentRoster.find((s) => s.examNumber.toUpperCase() === clean);
    if (dynamicMatch) return dynamicMatch;
    return findAuthorizedStudent(clean);
  };

  // Active quiz targeted by the test link
  const currentQuiz: Quiz | undefined = 
    quizzes.find((q) => q.id === selectedQuizId) || 
    quizzes[0];

  // Auto-fill from URL params or initialExamNumber e.g., ?quiz=...&exam=8001
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const examParam = params.get('exam') || params.get('roll') || params.get('examNumber') || initialExamNumber;
    if (examParam) {
      setExamNumberInput(examParam);
      const match = lookupStudent(examParam);
      if (match) {
        setStudentNameInput(match.studentName);
      }
    }
    // Always start at initial exam number confirmation screen
    setHasCheckedStatus(false);
    setQuizAttempts(null);
  }, [selectedQuizId, initialExamNumber, studentRoster]);

  const handleExamNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setExamNumberInput(val);
    if (errorMsg) setErrorMsg(null);
    setHasCheckedStatus(false);
    setQuizAttempts(null);

    const trimmed = val.trim();
    if (!trimmed) {
      setStudentNameInput('');
      return;
    }
    const match = lookupStudent(trimmed);
    if (match) {
      setStudentNameInput(match.studentName);
    }
  };

  // Check student status and either start exam or show score history
  const handleConfirmExamNumber = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNumber = examNumberInput.trim().toUpperCase();
    const matched = lookupStudent(cleanNumber);
    const cleanName = studentNameInput.trim() || (matched?.studentName ?? `மாணவர் (${cleanNumber})`);

    if (!cleanNumber) {
      setErrorMsg('தயவுசெய்து உங்கள் தேர்வு எண்ணை (Exam Number) உள்ளிடவும்.');
      return;
    }

    if (!studentNameInput.trim() && cleanName) {
      setStudentNameInput(cleanName);
    }

    if (!currentQuiz) {
      setErrorMsg('தேர்வு வினாத்தாள் கண்டறியப்படவில்லை. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      // Query server for verification and attempts on this specific quiz
      const res = await fetch(
        `/api/students/verify?examNumber=${encodeURIComponent(cleanNumber)}&quizId=${encodeURIComponent(currentQuiz.id)}`
      );
      
      const data = await res.json();

      if (!res.ok || data.authorized === false) {
        setErrorMsg(
          data.error || 'அங்கீகரிக்கப்படாத தேர்வு எண்! பதிவு செய்யப்பட்ட NMMS மாணவர்கள் மட்டுமே தேர்வெழுத அனுமதிக்கப்படுவர்.'
        );
        setIsVerifying(false);
        return;
      }

      let attemptsForThisQuiz: StudentAttempt[] = [];

      if (data.student?.studentName) {
        setStudentNameInput(data.student.studentName);
      }
      if (Array.isArray(data.allAttempts) && data.allAttempts.length > 0) {
        attemptsForThisQuiz = data.allAttempts.filter((a: StudentAttempt) => a.quizId === currentQuiz.id);
      } else if (data.latestAttempt && data.latestAttempt.quizId === currentQuiz.id) {
        attemptsForThisQuiz = [data.latestAttempt];
      }

      setQuizAttempts(attemptsForThisQuiz);
      setHasCheckedStatus(true);

      // If NEVER attempted this quiz before -> START EXAM DIRECTLY!
      if (attemptsForThisQuiz.length === 0) {
        requestFullscreen();
        onStartExam({
          studentName: data.student?.studentName || cleanName,
          examNumber: cleanNumber,
          quizId: currentQuiz.id,
        });
      }
    } catch (err) {
      console.warn('Network error checking student attempt status, fallback to local match:', err);
      // If locally matched or offline fallback
      requestFullscreen();
      onStartExam({
        studentName: cleanName,
        examNumber: cleanNumber,
        quizId: currentQuiz.id,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Launch retake (Try Again)
  const handleTryAgain = () => {
    if (!currentQuiz) return;
    requestFullscreen();
    const cleanNumber = examNumberInput.trim().toUpperCase();
    const cleanName = studentNameInput.trim();
    onStartExam({
      studentName: cleanName,
      examNumber: cleanNumber,
      quizId: currentQuiz.id,
    });
  };

  const matchedProfile = examNumberInput.trim() ? findAuthorizedStudent(examNumberInput.trim()) : null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('ta-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const poolQuestionsCount = currentQuiz?.questions?.length || 22;
  const isSubsetEnabled = Boolean(currentQuiz?.enableQuestionLimit && currentQuiz?.questionsPerAttempt && currentQuiz.questionsPerAttempt < poolQuestionsCount);
  const totalQuestions = isSubsetEnabled ? (currentQuiz?.questionsPerAttempt || poolQuestionsCount) : poolQuestionsCount;
  const duration = currentQuiz?.durationMinutes || 90;

  // -------------------------------------------------------------
  // VIEW: SCORE HISTORY & RETRY SCREEN (If already attempted)
  // -------------------------------------------------------------
  if (hasCheckedStatus && quizAttempts && quizAttempts.length > 0) {
    const latestAttempt = quizAttempts[0];
    const bestScore = Math.max(...quizAttempts.map((a) => a.score.totalObtained));
    const bestPercentage = Math.max(...quizAttempts.map((a) => a.score.percentage));
    const totalPossible = latestAttempt.score.totalPossible || totalQuestions;

    return (
      <div className="min-h-[85vh] py-6 sm:py-10 px-3 sm:px-6 max-w-2xl mx-auto flex flex-col justify-center animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden">
          
          {/* Top Test Header Banner */}
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 text-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="inline-flex items-center space-x-1 font-bold text-xs px-2.5 py-1 rounded-lg bg-white/20 text-white backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>NMMS மாதிரித் தேர்வு</span>
              </span>
              <span className="font-mono text-xs font-semibold text-indigo-100 bg-black/20 px-2.5 py-1 rounded-lg">
                தேர்வு எண்: {examNumberInput.toUpperCase()}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black leading-snug">
              {currentQuiz?.title || 'NMMS மாதிரித் தேர்வு'}
            </h1>
            <p className="text-xs text-indigo-100 mt-1 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              <span>மாணவர்: <strong>{studentNameInput}</strong></span>
            </p>
          </div>

          <div className="p-5 sm:p-7 space-y-6">
            
            {/* Notice: Already Taken */}
            <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  நீங்கள் ஏற்கனவே இத்தேர்வை எழுதியுள்ளீர்கள்!
                </p>
                <p>
                  கீழே உங்கள் முந்தைய மதிப்பெண் வரலாறு காட்டப்பட்டுள்ளது. உங்கள் மதிப்பெண்களை உயர்த்த <strong>"Try Again (மீண்டும் தேர்வு எழுதுக)"</strong> பொத்தானை அழுத்தவும்.
                </p>
              </div>
            </div>

            {/* Score Summary Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                  முயற்சிகள் (Attempts)
                </span>
                <strong className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
                  {quizAttempts.length}
                </strong>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">
                  கடைசி மதிப்பெண்
                </span>
                <strong className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 block">
                  {latestAttempt.score.totalObtained}/{totalPossible}
                </strong>
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                  {latestAttempt.score.percentage}%
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                  உயர் மதிப்பெண் (Best)
                </span>
                <strong className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                  {bestScore}/{totalPossible}
                </strong>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {bestPercentage}%
                </span>
              </div>
            </div>

            {/* Previous Attempts History List */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>முந்தைய முயற்சிகள் வரலாறு (Score History)</span>
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                {quizAttempts.map((attempt, index) => {
                  const attemptNum = quizAttempts.length - index;
                  const isPass = attempt.score.isEligible;
                  return (
                    <div 
                      key={attempt.id}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            முயற்சி #{attemptNum} (Attempt {attemptNum})
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPass 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {isPass ? '✓ தகுதி' : 'பயிற்சி தேவை'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {formatDate(attempt.submittedAt)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white">
                            {attempt.score.totalObtained} / {attempt.score.totalPossible}
                          </div>
                          <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            {attempt.score.percentage}%
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onViewScorecard(attempt, currentQuiz?.questions || [])}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer"
                          title="விடைத்தாள் விவரம் காண்க"
                        >
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span className="hidden xs:inline">விவரம்</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm('இந்த தேர்வு முயற்சியை நிச்சயமாக நீக்க விரும்புகிறீர்களா? (Delete this attempt?)')) {
                              try {
                                const res = await fetch(`/api/attempts/${attempt.id}`, { method: 'DELETE' });
                                if (res.ok) {
                                  const updated = quizAttempts.filter((a) => a.id !== attempt.id);
                                  if (updated.length === 0) {
                                    setQuizAttempts(null);
                                    setHasCheckedStatus(false);
                                  } else {
                                    setQuizAttempts(updated);
                                  }
                                }
                              } catch (e) {
                                console.error('Failed to delete attempt:', e);
                              }
                            }
                          }}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all cursor-pointer"
                          title="முயற்சியை நீக்கு (Delete Attempt)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Primary Action Button: TRY AGAIN */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                id="btn-try-again-exam"
                onClick={handleTryAgain}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm sm:text-base flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25 active:scale-[0.99] transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again (மீண்டும் தேர்வு எழுதுக — முயற்சி #{quizAttempts.length + 1})</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setHasCheckedStatus(false);
                  setQuizAttempts(null);
                }}
                className="w-full py-2.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                ← வேறு தேர்வு எண் உள்ளிட (Change Exam Number)
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: DIRECT STUDENT EXAM NUMBER CONFIRMATION
  // -------------------------------------------------------------
  return (
    <div className="min-h-[75vh] py-4 sm:py-8 px-3 sm:px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        
        {/* Test Card Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-lg border border-slate-200/90 dark:border-slate-800 relative overflow-hidden">
          
          {/* Top Brand Tag */}
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
              <Award className="w-3 h-3 text-indigo-600" />
              <span>NMMS மாதிரித் தேர்வு (Mock Test)</span>
            </div>
          </div>

          {/* Test Title & Specifications */}
          <div className="mb-4">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {currentQuiz?.title || 'NMMS மாதிரித் தேர்வு'}
            </h1>
            
            {/* Quick Metadata Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{duration} நிமிடங்கள்</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                <BookOpen className="w-3 h-3 text-slate-500" />
                <span>{totalQuestions} வினாக்கள்</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                <span>{totalQuestions} மதிப்பெண்கள்</span>
              </span>
            </div>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-3.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-2 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Student Exam Number Form */}
          <form onSubmit={handleConfirmExamNumber} className="space-y-3">
            
            {/* Field 1: Exam Number (Primary Requirement) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label 
                  htmlFor="input-exam-number"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  மாணவர் தேர்வு எண் (Exam Number) <span className="text-rose-500">*</span>
                </label>
              </div>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="input-exam-number"
                  type="text"
                  required
                  autoFocus
                  placeholder="எ.கா: 1234"
                  value={examNumberInput}
                  onChange={handleExamNumberChange}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white font-mono text-sm font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all placeholder:text-slate-400"
                />
              </div>
              {matchedProfile && (
                <div className="mt-1 flex items-center">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{matchedProfile.studentName}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Submit Action: Confirm & Start */}
            <div className="pt-1">
              <button
                type="submit"
                id="btn-confirm-start-exam"
                disabled={!examNumberInput.trim() || isVerifying}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md shadow-indigo-500/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>
                  {isVerifying 
                    ? 'சரிபார்க்கிறது...' 
                    : 'தேர்வைத் தொடங்குக (Start Exam)'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Quick Notice */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center space-x-1">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>தேர்வு எண் உறுதி செய்யப்பட்டவுடன் தேர்வு நேரடியாகத் தொடங்கும்.</span>
          </div>

        </div>

      </div>
    </div>
  );
};
