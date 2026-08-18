import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Quiz, Question, NMMS_Subject, SUBJECT_METADATA } from '../types';
import { formatSecondsToTime } from '../utils/formatters';
import { MathText } from './MathText';
import { 
  requestFullscreen, 
  exitFullscreen 
} from '../utils/fullscreen';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Bookmark, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Send, 
  Layers, 
  ShieldAlert,
  Menu,
  X,
  Sparkles
} from 'lucide-react';

interface ExamEngineProps {
  quiz: Quiz;
  studentData: {
    studentName: string;
    examNumber: string;
  };
  onSubmitExam: (submissionData: {
    answers: Record<string, 'A' | 'B' | 'C' | 'D' | null>;
    questionStatus: Record<string, 'answered' | 'marked' | 'visited' | 'unvisited' | 'marked_answered'>;
    timeTakenSeconds: number;
    tabSwitchCount: number;
  }) => void;
  isSubmitting?: boolean;
}

export const ExamEngine: React.FC<ExamEngineProps> = ({
  quiz,
  studentData,
  onSubmitExam,
  isSubmitting = false,
}) => {
  const totalQuestions = quiz.questions.length;
  const initialDuration = (quiz.durationMinutes || 90) * 60;

  // Time state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialDuration);
  const [timeTakenSeconds, setTimeTakenSeconds] = useState<number>(0);

  // Active question index
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  // Subject Filter tab
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<NMMS_Subject | 'ALL'>('ALL');

  // Answers map: questionId -> chosenOption
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D' | null>>({});

  // Question Status map: questionId -> status
  const [questionStatus, setQuestionStatus] = useState<
    Record<string, 'answered' | 'marked' | 'visited' | 'unvisited' | 'marked_answered'>
  >(() => {
    const initial: Record<string, any> = {};
    quiz.questions.forEach((q, idx) => {
      initial[q.id] = idx === 0 ? 'visited' : 'unvisited';
    });
    return initial;
  });

  // Anti-cheat state
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [showCheatingWarning, setShowCheatingWarning] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-request fullscreen on exam start
  useEffect(() => {
    requestFullscreen();
  }, []);

  // Filtered question list based on subject tab
  const filteredQuestions = quiz.questions.filter((q) => {
    if (activeSubjectFilter === 'ALL') return true;
    return q.subject === activeSubjectFilter;
  });

  const currentQuestion: Question | undefined = quiz.questions[currentIndex];

  // Auto-submit handler
  const handleFinalSubmit = useCallback(() => {
    exitFullscreen();
    onSubmitExam({
      answers,
      questionStatus,
      timeTakenSeconds: initialDuration - secondsRemaining,
      tabSwitchCount,
    });
  }, [answers, questionStatus, secondsRemaining, initialDuration, tabSwitchCount, onSubmitExam]);

  // Countdown timer effect
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
      setTimeTakenSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handleFinalSubmit]);

  // Anti-cheating window blur detector
  useEffect(() => {
    if (!quiz.enableAntiCheat) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          setShowCheatingWarning(true);
          return next;
        });
      }
    };

    const handleBlur = () => {
      setTabSwitchCount((prev) => {
        const next = prev + 1;
        setShowCheatingWarning(true);
        return next;
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [quiz.enableAntiCheat]);

  // Update question status on navigation
  const navigateToQuestion = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= totalQuestions) return;

    // Update current question status if it wasn't answered
    const currentQ = quiz.questions[currentIndex];
    setQuestionStatus((prev) => {
      const currentStat = prev[currentQ.id];
      const hasAnswer = answers[currentQ.id];

      let newStatus = currentStat;
      if (currentStat === 'marked' && hasAnswer) {
        newStatus = 'marked_answered';
      } else if (hasAnswer && currentStat !== 'marked_answered' && currentStat !== 'marked') {
        newStatus = 'answered';
      } else if (!hasAnswer && currentStat !== 'marked' && currentStat !== 'marked_answered') {
        newStatus = 'visited';
      }

      const targetQ = quiz.questions[targetIndex];
      const targetStat = prev[targetQ.id] || 'unvisited';

      return {
        ...prev,
        [currentQ.id]: newStatus,
        [targetQ.id]: targetStat === 'unvisited' ? 'visited' : targetStat,
      };
    });

    setCurrentIndex(targetIndex);
    setMobilePaletteOpen(false);
  };

  // Select Option
  const handleSelectOption = (optionId: 'A' | 'B' | 'C' | 'D') => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;

    setAnswers((prev) => ({
      ...prev,
      [qId]: optionId,
    }));

    setQuestionStatus((prev) => {
      const current = prev[qId];
      if (current === 'marked' || current === 'marked_answered') {
        return { ...prev, [qId]: 'marked_answered' };
      }
      return { ...prev, [qId]: 'answered' };
    });
  };

  // Clear current response
  const handleClearResponse = () => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;

    setAnswers((prev) => ({
      ...prev,
      [qId]: null,
    }));

    setQuestionStatus((prev) => {
      const current = prev[qId];
      if (current === 'marked_answered' || current === 'marked') {
        return { ...prev, [qId]: 'marked' };
      }
      return { ...prev, [qId]: 'visited' };
    });
  };

  // Mark for Review & Next
  const handleMarkForReviewAndNext = () => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    const hasAnswer = answers[qId];

    setQuestionStatus((prev) => ({
      ...prev,
      [qId]: hasAnswer ? 'marked_answered' : 'marked',
    }));

    if (currentIndex < totalQuestions - 1) {
      navigateToQuestion(currentIndex + 1);
    }
  };

  // Save & Next
  const handleSaveAndNext = () => {
    if (currentIndex < totalQuestions - 1) {
      navigateToQuestion(currentIndex + 1);
    }
  };

  // Previous Question
  const handlePrevious = () => {
    if (currentIndex > 0) {
      navigateToQuestion(currentIndex - 1);
    }
  };

  // Counts for summary
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const markedCount = Object.values(questionStatus).filter(
    (s) => s === 'marked' || s === 'marked_answered'
  ).length;
  const unvisitedCount = quiz.questions.filter(
    (q) => (questionStatus[q.id] || 'unvisited') === 'unvisited'
  ).length;
  const notAnsweredCount = totalQuestions - answeredCount;

  // Timer color indicator
  const isUrgentTime = secondsRemaining <= 300; // < 5 mins
  const isWarningTime = secondsRemaining <= 600 && !isUrgentTime; // < 10 mins

  return (
    <div className="min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] bg-slate-100 dark:bg-slate-950 flex flex-col pb-16 lg:pb-0">
      {/* Top Test Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3 sticky top-14 sm:top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          {/* Candidate & Quiz Details */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-mono font-bold text-[11px] sm:text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 sm:px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 flex-shrink-0">
                  {studentData.examNumber}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                  {studentData.studentName}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                {quiz.title}
              </p>
            </div>
          </div>

          {/* Center & Right: Live Timer + Palette */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 flex-shrink-0">
            <div
              id="countdown-timer-display"
              className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-mono font-bold text-xs sm:text-base border transition-all ${
                isUrgentTime
                  ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-500 text-rose-600 dark:text-rose-400 animate-pulse'
                  : isWarningTime
                  ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isUrgentTime ? 'text-rose-500' : 'text-indigo-500'}`} />
              <span>{formatSecondsToTime(secondsRemaining)}</span>
              {isUrgentTime && <span className="text-[10px] font-sans text-rose-500 hidden sm:inline">(Hurry!)</span>}
            </div>

            {/* Mobile OMR drawer toggle */}
            <button
              onClick={() => setMobilePaletteOpen(!mobilePaletteOpen)}
              className="lg:hidden px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center space-x-1 text-xs font-semibold"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>OMR</span>
            </button>
          </div>
        </div>
      </div>

      {/* Anti-Cheat Warning Banner */}
      {showCheatingWarning && (
        <div className="bg-rose-600 text-white px-3 sm:px-4 py-2 shadow-md flex items-center justify-between text-xs sm:text-sm animate-pulse">
          <div className="max-w-7xl mx-auto flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span>
              <strong>Integrity Alert:</strong> Window focus / tab switch detected ({tabSwitchCount} times).
            </span>
          </div>
          <button
            onClick={() => setShowCheatingWarning(false)}
            className="text-white hover:text-rose-200 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column: Active Question Workspace (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4 sm:space-y-6">
          {currentQuestion ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex-1 flex flex-col justify-between">
              <div>
                {/* Header info */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4 mb-4 sm:mb-6">
                  <div className="flex items-center space-x-2 sm:space-x-2.5">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
                      {currentIndex + 1}
                    </span>
                    <div>
                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <span
                          className={`text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-md border ${
                            SUBJECT_METADATA[currentQuestion.subject]?.badgeBg || 'bg-slate-100'
                          }`}
                        >
                          {SUBJECT_METADATA[currentQuestion.subject]?.name || currentQuestion.subject}
                        </span>
                        {currentQuestion.topic && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden xs:inline">
                            • {currentQuestion.topic}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 sm:py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      +{currentQuestion.marks || 1} Mark
                    </span>
                  </div>
                </div>

                {/* Question Statement */}
                <div className="mb-5 sm:mb-6">
                  <div className="text-sm sm:text-base md:text-lg font-medium text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                    <MathText text={currentQuestion.questionText} />
                  </div>
                  {currentQuestion.questionImage && (
                    <div className="mt-3 sm:mt-4 max-w-md rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img
                        src={currentQuestion.questionImage}
                        alt="Question Diagram"
                        className="w-full h-auto object-contain max-h-64"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

                {/* 4 Options Grid */}
                <div className="space-y-2.5 sm:space-y-3">
                  {currentQuestion.options.map((option) => {
                    const isSelected = answers[currentQuestion.id] === option.id;
                    return (
                      <div
                        key={option.id}
                        id={`option-${currentQuestion.id}-${option.id}`}
                        onClick={() => handleSelectOption(option.id)}
                        className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 sm:space-x-4 min-h-[48px] ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20 text-indigo-900 dark:text-indigo-100 font-medium shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow'
                              : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {option.id}
                        </div>
                        <span className="text-xs sm:text-sm md:text-base flex-1">
                          <MathText text={option.text} />
                        </span>
                        {isSelected && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop Bottom Question Controls */}
              <div className="hidden sm:flex pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    id="btn-clear-response"
                    onClick={handleClearResponse}
                    disabled={!answers[currentQuestion.id]}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center space-x-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Option</span>
                  </button>

                  <button
                    type="button"
                    id="btn-mark-review-next"
                    onClick={handleMarkForReviewAndNext}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors flex items-center space-x-1.5"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Mark for Review</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    id="btn-prev-question"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  {currentIndex === totalQuestions - 1 ? (
                    <button
                      type="button"
                      id="btn-submit-last-question"
                      onClick={() => setShowSubmitModal(true)}
                      className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-2 ring-2 ring-emerald-400/50 animate-pulse"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Exam (தேர்வை சமர்ப்பிக்கவும்)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="btn-save-next-question"
                      onClick={handleSaveAndNext}
                      className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-sm transition-all flex items-center space-x-1"
                    >
                      <span>Save &amp; Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-500">
              No questions found for this filter.
            </div>
          )}
        </div>

        {/* Right Column: Question Status Palette & Section Progress (Desktop 4 cols) */}
        <div className="hidden lg:flex lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Question Palette</span>
              </h3>
            </div>

            {/* OMR Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 mb-6 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 rounded-md bg-emerald-600 text-white font-bold flex items-center justify-center text-[9px]">
                  {answeredCount}
                </span>
                <span>Answered</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 rounded-md bg-rose-500 text-white font-bold flex items-center justify-center text-[9px]">
                  {notAnsweredCount}
                </span>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 rounded-md bg-purple-600 text-white font-bold flex items-center justify-center text-[9px]">
                  {markedCount}
                </span>
                <span>Marked</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-[9px]">
                  {unvisitedCount}
                </span>
                <span>Not Visited</span>
              </div>
            </div>

            {/* Interactive Question Grid */}
            <div className="mb-6">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                <span>Navigate Question</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {filteredQuestions.length} Questions
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1 p-1">
                {quiz.questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const status = questionStatus[q.id] || 'unvisited';
                  const hasAnswer = answers[q.id];

                  let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                  if (status === 'marked_answered') {
                    bgClass = 'bg-purple-600 text-white border-purple-700 ring-2 ring-emerald-400';
                  } else if (status === 'marked') {
                    bgClass = 'bg-purple-600 text-white border-purple-700';
                  } else if (hasAnswer || status === 'answered') {
                    bgClass = 'bg-emerald-600 text-white border-emerald-700';
                  } else if (status === 'visited') {
                    bgClass = 'bg-rose-500 text-white border-rose-600';
                  }

                  return (
                    <button
                      key={q.id}
                      id={`palette-btn-q-${idx + 1}`}
                      onClick={() => navigateToQuestion(idx)}
                      className={`h-9 rounded-lg font-bold text-xs border transition-all flex items-center justify-center relative ${bgClass} ${
                        isCurrent ? 'ring-2 ring-indigo-500 scale-105 shadow-md' : 'hover:opacity-90'
                      }`}
                    >
                      <span>{idx + 1}</span>
                      {status === 'marked_answered' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 absolute top-1 right-1"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sectional Breakdown Mini Card */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Section Completion
            </h4>
            {(['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'] as NMMS_Subject[]).map((sub) => {
              const subQuestions = quiz.questions.filter((q) => q.subject === sub);
              if (subQuestions.length === 0) return null;
              const subAnswered = subQuestions.filter((q) => answers[q.id]).length;
              const pct = Math.round((subAnswered / subQuestions.length) * 100);
              const meta = SUBJECT_METADATA[sub];

              return (
                <div key={sub} className="text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                    <span className="font-medium">{meta.shortName}</span>
                    <span className="font-mono">
                      {subAnswered}/{subQuestions.length} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}

            <div className="pt-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-colors shadow-sm"
              >
                Finish &amp; View Analysis
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar (Accessible by thumb) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-between gap-1 shadow-lg">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex-1 py-2 px-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 flex items-center justify-center space-x-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>

        <button
          type="button"
          onClick={handleMarkForReviewAndNext}
          className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 flex items-center justify-center"
          title="Mark for review"
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleClearResponse}
          disabled={!currentQuestion || !answers[currentQuestion.id]}
          className="px-2.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 flex items-center justify-center"
          title="Clear option"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {currentIndex === totalQuestions - 1 ? (
          <button
            type="button"
            id="btn-submit-mobile-last-question"
            onClick={() => setShowSubmitModal(true)}
            className="flex-1 py-2 px-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-md flex items-center justify-center space-x-1.5 ring-2 ring-emerald-400/50 animate-pulse"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Exam (சமர்ப்பி)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSaveAndNext}
            className="flex-1 py-2 px-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm flex items-center justify-center space-x-1"
          >
            <span>Save &amp; Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Mobile OMR Sheet Modal / Drawer */}
      {mobilePaletteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col justify-end lg:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Question Palette ({totalQuestions})</span>
              </h3>
              <button
                onClick={() => setMobilePaletteOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* OMR Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[9px]">
                  {answeredCount}
                </span>
                <span>Answered</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded bg-rose-500 text-white font-bold flex items-center justify-center text-[9px]">
                  {notAnsweredCount}
                </span>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-[9px]">
                  {markedCount}
                </span>
                <span>Marked for Review</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 rounded bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-[9px]">
                  {unvisitedCount}
                </span>
                <span>Not Visited</span>
              </div>
            </div>

            {/* Interactive Question Grid */}
            <div className="mb-5">
              <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-1">
                {quiz.questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const status = questionStatus[q.id] || 'unvisited';
                  const hasAnswer = answers[q.id];

                  let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                  if (status === 'marked_answered') {
                    bgClass = 'bg-purple-600 text-white border-purple-700 ring-2 ring-emerald-400';
                  } else if (status === 'marked') {
                    bgClass = 'bg-purple-600 text-white border-purple-700';
                  } else if (hasAnswer || status === 'answered') {
                    bgClass = 'bg-emerald-600 text-white border-emerald-700';
                  } else if (status === 'visited') {
                    bgClass = 'bg-rose-500 text-white border-rose-600';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        navigateToQuestion(idx);
                        setMobilePaletteOpen(false);
                      }}
                      className={`h-10 rounded-xl font-bold text-xs border transition-all flex items-center justify-center relative ${bgClass} ${
                        isCurrent ? 'ring-2 ring-indigo-500 scale-105 shadow-md' : 'hover:opacity-90'
                      }`}
                    >
                      <span>{idx + 1}</span>
                      {status === 'marked_answered' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 absolute top-1 right-1"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => {
                setMobilePaletteOpen(false);
                setShowSubmitModal(true);
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md"
            >
              Finish &amp; Submit Exam
            </button>
          </div>
        </div>
      )}

      {/* Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Send className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white text-center mb-1">
              Submit NMMS Examination?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4 sm:mb-6">
              Review your attempt status before final automatic grading.
            </p>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-4 sm:mb-6 bg-slate-50 dark:bg-slate-800/60 p-3 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
              <div className="text-slate-600 dark:text-slate-400">
                <span>Total Questions:</span>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                  {totalQuestions}
                </p>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                <span>Answered:</span>
                <p className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  {answeredCount}
                </p>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                <span>Unattempted:</span>
                <p className="text-sm sm:text-base font-bold text-rose-500 font-mono mt-0.5">
                  {notAnsweredCount}
                </p>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                <span>Marked for Review:</span>
                <p className="text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                  {markedCount}
                </p>
              </div>
            </div>

            {notAnsweredCount > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-4 sm:mb-6 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900">
                ⚠️ You still have {notAnsweredCount} unanswered questions. Are you sure you want to submit now?
              </p>
            )}

            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <button
                type="button"
                id="btn-cancel-submission"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                Back to Test
              </button>
              <button
                type="button"
                id="btn-confirm-final-submit"
                onClick={() => {
                  setShowSubmitModal(false);
                  handleFinalSubmit();
                }}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
              >
                {isSubmitting ? 'Grading Answers...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
