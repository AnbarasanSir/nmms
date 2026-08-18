import React, { useState, useEffect, useCallback } from 'react';
import { StudentFullHistory, StudentAttempt, SUBJECT_METADATA } from '../types';
import { formatDateTime, formatSecondsToTime } from '../utils/formatters';
import {
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  TrendingUp,
  BrainCircuit,
  BarChart3,
  Sparkles,
  X,
  Printer,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Check,
  RotateCcw,
  Zap,
  Target,
  GraduationCap,
  Trash2
} from 'lucide-react';

interface StudentScoreHistoryModalProps {
  examNumber: string;
  initialStudent?: {
    examNumber: string;
    studentName: string;
  };
  onClose: () => void;
  onInspectAttemptSheet: (attempt: StudentAttempt) => void;
  onAttemptDeleted?: (attemptId: string) => void;
}

export const StudentScoreHistoryModal: React.FC<StudentScoreHistoryModalProps> = ({
  examNumber,
  initialStudent,
  onClose,
  onInspectAttemptSheet,
  onAttemptDeleted,
}) => {
  const [historyData, setHistoryData] = useState<StudentFullHistory | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'attempts' | 'subjects' | 'analytics'>('attempts');
  const [selectedQuizFilter, setSelectedQuizFilter] = useState<string>('all');
  
  // Deletion state
  const [attemptToDelete, setAttemptToDelete] = useState<StudentAttempt | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);
  const [isDeletingInProgress, setIsDeletingInProgress] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(examNumber)}/history`);
      if (res.ok) {
        const data: StudentFullHistory = await res.json();
        setHistoryData(data);
      } else {
        setError('மாணவர் தேர்வு வரலாறு கிடைக்கவில்லை (No score history available yet).');
      }
    } catch (e: any) {
      setError('வரலாறு தரவை ஏற்றுவதில் பிழை (Failed to load student history).');
    } finally {
      setIsLoading(false);
    }
  }, [examNumber]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDeleteSingleAttempt = async (attempt: StudentAttempt) => {
    setIsDeletingInProgress(true);
    try {
      const res = await fetch(`/api/attempts/${attempt.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setActionSuccessMessage(`Attempt on ${formatDateTime(attempt.submittedAt)} deleted successfully.`);
        setTimeout(() => setActionSuccessMessage(null), 3500);
        setAttemptToDelete(null);
        if (onAttemptDeleted) {
          onAttemptDeleted(attempt.id);
        }
        await fetchHistory();
      } else {
        const err = await res.json();
        alert(`Failed to delete attempt: ${err.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Network error deleting attempt: ${err.message}`);
    } finally {
      setIsDeletingInProgress(false);
    }
  };

  const handleDeleteAllAttempts = async () => {
    setIsDeletingInProgress(true);
    try {
      const url = selectedQuizFilter !== 'all'
        ? `/api/students/${encodeURIComponent(examNumber)}/attempts?quizId=${encodeURIComponent(selectedQuizFilter)}`
        : `/api/students/${encodeURIComponent(examNumber)}/attempts`;

      const res = await fetch(url, {
        method: 'DELETE',
      });
      if (res.ok) {
        setActionSuccessMessage('அனைத்து தேர்வு முயற்சிகளும் வெற்றிகரமாக நீக்கப்பட்டன (All attempts deleted successfully).');
        setTimeout(() => setActionSuccessMessage(null), 3500);
        setIsDeletingAll(false);
        if (onAttemptDeleted) {
          onAttemptDeleted('all');
        }
        await fetchHistory();
      } else {
        const err = await res.json();
        alert(`Failed to delete attempts: ${err.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Network error deleting attempts: ${err.message}`);
    } finally {
      setIsDeletingInProgress(false);
    }
  };

  const student = historyData?.student || initialStudent;
  const allAttempts = historyData?.allAttempts || [];
  const filteredAttempts = selectedQuizFilter === 'all'
    ? allAttempts
    : allAttempts.filter((a) => a.quizId === selectedQuizFilter);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-start justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
              {student?.studentName?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {student?.studentName || 'Student Details'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>தேர்வு எண் (Exam No): <strong className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{student?.examNumber}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={handlePrint}
              title="Print Score History Report"
              className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm text-xs font-semibold hidden sm:flex items-center space-x-1"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

      

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveSubTab('attempts')}
              className={`py-2 px-3 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center space-x-1.5 ${
                activeSubTab === 'attempts'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Attempt ({allAttempts.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('subjects')}
              className={`py-2 px-3 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center space-x-1.5 ${
                activeSubTab === 'subjects'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Performance</span>
            </button>

            <button
              onClick={() => setActiveSubTab('analytics')}
              className={`py-2 px-3 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center space-x-1.5 ${
                activeSubTab === 'analytics'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Progression</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {actionSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between animate-in fade-in">
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{actionSuccessMessage}</span>
              </span>
              <button
                type="button"
                onClick={() => setActionSuccessMessage(null)}
                className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">மாணவர் தேர்வு வரலாற்றை ஏற்றுகிறது (Loading candidate score history)...</p>
            </div>
          ) : error && allAttempts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Quiz Attempts Recorded Yet
              </h4>
              <p className="text-xs max-w-md mx-auto">
                இந்த மாணவர் இதுவரை எந்த ஆன்லைன் தேர்விலும் பங்கேற்கவில்லை அல்லது அனைத்து முயற்சிகளும் நீக்கப்பட்டுள்ளன.
              </p>
            </div>
          ) : (
            <>
              {/* SUB-TAB 1: ATTEMPTS LOG & TIMESTAMPS */}
              {activeSubTab === 'attempts' && (
                <div className="space-y-4">
                  {/* Top Bar: Filter by Quiz and Clear All Attempts Option */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1">
                        Filter:
                      </span>
                      <button
                        onClick={() => setSelectedQuizFilter('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          selectedQuizFilter === 'all'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        All ({allAttempts.length})
                      </button>
                      {historyData?.quizSummaries && historyData.quizSummaries.map((qs) => (
                        <button
                          key={qs.quizId}
                          onClick={() => setSelectedQuizFilter(qs.quizId)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all truncate max-w-xs cursor-pointer ${
                            selectedQuizFilter === qs.quizId
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {qs.quizTitle} ({qs.attemptCount})
                        </button>
                      ))}
                    </div>

                    {filteredAttempts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsDeletingAll(true)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                        title="Delete all attempts for this student"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete All Attempts (அனைத்தையும் நீக்கு)</span>
                      </button>
                    )}
                  </div>

                  {/* Attempts List */}
                  <div className="space-y-3">
                    {filteredAttempts.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                        <RotateCcw className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p>தேர்வு முயற்சிகள் எதுவும் இல்லை (No attempts recorded for this selection).</p>
                      </div>
                    ) : (
                      filteredAttempts.map((attempt, index) => {
                        const totalAttemptsForStudent = filteredAttempts.length;
                        const attemptNumber = totalAttemptsForStudent - index; // Chronological order tag
                        const isLatest = index === 0;

                        return (
                          <div
                            key={attempt.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              isLatest
                                ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/80 shadow-sm'
                                : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                              <div className="flex items-center space-x-2.5">
                                <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs">
                                  Attempt #{attemptNumber}
                                </span>
                                {isLatest && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase">
                                    Latest Submission
                                  </span>
                                )}
                                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                                  {attempt.quizTitle || 'NMMS Assessment Paper'}
                                </h4>
                              </div>

                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1 font-mono">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{formatDateTime(attempt.submittedAt)}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setAttemptToDelete(attempt)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors flex items-center space-x-1 text-xs font-bold cursor-pointer"
                                  title="Delete this attempt (முயற்சியை நீக்கு)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Delete</span>
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                                <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                                  Score Obtained
                                </span>
                                <div className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                                  {attempt.score.totalObtained} / {attempt.score.totalPossible}
                                </div>
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                  {attempt.score.percentage}%
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                                <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                                  Subject Split (MAT / SAT)
                                </span>
                                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-1 flex justify-between">
                                  <span>MAT: <strong className="text-indigo-600">{attempt.score.matScore || attempt.score.subjectBreakdown.MAT.obtained}</strong></span>
                                  <span>SAT: <strong className="text-blue-600">{attempt.score.satScore || (attempt.score.subjectBreakdown.SAT_MATHS.obtained + attempt.score.subjectBreakdown.SAT_SCIENCE.obtained + attempt.score.subjectBreakdown.SAT_SOCIAL.obtained)}</strong></span>
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  MAT {attempt.score.subjectBreakdown.MAT.accuracy}% • SAT Maths {attempt.score.subjectBreakdown.SAT_MATHS.accuracy}%
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700">
                                <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                                  Time &amp; Integrity
                                </span>
                                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                                  ⏱️ {formatSecondsToTime(attempt.timeTakenSeconds)}
                                </div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                  {attempt.tabSwitchCount > 0 ? (
                                    <span className="text-rose-500 font-bold">⚠️ {attempt.tabSwitchCount} Tab switch(es)</span>
                                  ) : (
                                    <span className="text-emerald-600 font-medium">✓ Clean Session</span>
                                  )}
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                                <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-semibold">
                                  Eligibility Result
                                </span>
                                <div>
                                  {attempt.score.isEligible ? (
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                                      <Check className="w-3.5 h-3.5 mr-1" /> Qualified
                                    </span>
                                  ) : (
                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center">
                                      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Needs Revision
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onInspectAttemptSheet(attempt)}
                                  className="mt-1 w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center justify-center space-x-1 shadow-sm transition-all cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>View Answer Sheet</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: SUBJECT PERFORMANCE ANALYSIS */}
              {activeSubTab === 'subjects' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Overall Subject Mastery (அனைத்து முயற்சிகளின் சராசரி)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* MAT */}
                    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-3 h-3 rounded-full bg-indigo-600" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            MAT (மனத்திறன் தேர்வு - Mental Ability)
                          </span>
                        </div>
                        <span className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                          {historyData?.subjectAverages.MAT || 0}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, historyData?.subjectAverages.MAT || 0)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        எண் தொடர், குறியீட்டு முறைகள், திசையியல் மற்றும் வடிவியல் காரண அறிவு.
                      </p>
                    </div>

                    {/* SAT MATHS */}
                    <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-3 h-3 rounded-full bg-blue-600" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            SAT கணிதம் (Mathematics)
                          </span>
                        </div>
                        <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400">
                          {historyData?.subjectAverages.SAT_MATHS || 0}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, historyData?.subjectAverages.SAT_MATHS || 0)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        7 &amp; 8-ஆம் வகுப்பு இயற்கணிதம், வடிவவியல், விகித சமம், அளவியல்.
                      </p>
                    </div>

                    {/* SAT SCIENCE */}
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-600" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            SAT அறிவியல் (Science)
                          </span>
                        </div>
                        <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                          {historyData?.subjectAverages.SAT_SCIENCE || 0}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, historyData?.subjectAverages.SAT_SCIENCE || 0)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        இயற்பியல், வேதியியல் மற்றும் தாவரவியல்/விலங்கியல் பாடப்பிரிவுகள்.
                      </p>
                    </div>

                    {/* SAT SOCIAL */}
                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="w-3 h-3 rounded-full bg-amber-600" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            SAT சமூக அறிவியல் (Social Science)
                          </span>
                        </div>
                        <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                          {historyData?.subjectAverages.SAT_SOCIAL || 0}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2">
                        <div
                          className="h-full bg-amber-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, historyData?.subjectAverages.SAT_SOCIAL || 0)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        வரலாறு, புவியியல், குடிமையியல் மற்றும் பொருளியல் கொள்கைகள்.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: PROGRESSION & AI DIAGNOSTIC */}
              {activeSubTab === 'analytics' && (
                <div className="space-y-6">
                  {/* Score Progression Trend */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      <span>Score Progression Over Time (முயற்சி வாரியான மதிப்பெண் முன்னேற்றம்)</span>
                    </h4>

                    {allAttempts.length > 1 ? (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                          <span>Attempt Chronology</span>
                          <span>Score Achieved</span>
                        </div>
                        <div className="space-y-2">
                          {allAttempts
                            .slice()
                            .reverse()
                            .map((att, idx) => (
                              <div key={att.id} className="flex items-center space-x-3 text-xs">
                                <span className="w-20 font-bold text-slate-700 dark:text-slate-300">
                                  Attempt #{idx + 1}
                                </span>
                                <div className="flex-1 h-4 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      att.score.percentage >= 70
                                        ? 'bg-emerald-500'
                                        : att.score.percentage >= 40
                                        ? 'bg-indigo-500'
                                        : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(5, att.score.percentage))}%` }}
                                  />
                                </div>
                                <span className="w-16 text-right font-mono font-bold text-slate-900 dark:text-white">
                                  {att.score.totalObtained}/{att.score.totalPossible} ({att.score.percentage}%)
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                        Only 1 attempt recorded so far. After subsequent retakes, comparative progression graphs will populate here.
                      </div>
                    )}
                  </div>

                  {/* AI Diagnostic Insights */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Individual Diagnostic Assessment (தனிப்பயன் வழிகாட்டுதல்)</span>
                    </h4>

                    <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                      <p className="font-semibold text-indigo-900 dark:text-indigo-200">
                        🎯 வழிகாட்டுதல் குறிப்புகள் (Actionable Recommendations):
                      </p>
                      <ul className="space-y-1.5 list-disc list-inside">
                        <li>
                          <strong>வலுவான பாடப்பிரிவு:</strong> MAT காரண அறிதல் பகுதியில் சிறந்த செயல்பாடு. இதே வேகத்தை தக்கவைத்துக் கொள்ளவும்.
                        </li>
                        <li>
                          <strong>கவனம் தேவைப்படும் பகுதி:</strong> 8-ஆம் வகுப்பு அறிவியல் வினாக்கள் மற்றும் கணித சூத்திரங்களை தினமும் 30 நிமிடங்கள் பயிற்சி செய்யவும்.
                        </li>
                        <li>
                          <strong>நேர மேலாண்மை:</strong> ஒரு வினாவிற்கு சராசரியாக 45 முதல் 60 வினாடிகளுக்குள் விடையளிக்க நேரக் கட்டுப்பாட்டுடன் கூடிய மாதிரித் தேர்வுகளை எழுதவும்.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Delete Single Attempt Confirmation Modal */}
        {attemptToDelete && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Exam Attempt? (தேர்வு முயற்சியை நீக்கவா?)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Are you sure you want to permanently delete this attempt record? This action cannot be undone.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Exam:</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">{attemptToDelete.quizTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Score:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">{attemptToDelete.score.totalObtained} / {attemptToDelete.score.totalPossible} ({attemptToDelete.score.percentage}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Submitted:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{formatDateTime(attemptToDelete.submittedAt)}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isDeletingInProgress}
                  onClick={() => setAttemptToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel (ரத்து)
                </button>
                <button
                  type="button"
                  disabled={isDeletingInProgress}
                  onClick={() => handleDeleteSingleAttempt(attemptToDelete)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingInProgress ? 'Deleting...' : 'Yes, Delete (நீக்கு)'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete All Attempts Confirmation Modal */}
        {isDeletingAll && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete All Attempts? (அனைத்து வரலாற்றையும் நீக்கவா?)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This will delete all {filteredAttempts.length} attempt record(s) for candidate <strong>{student?.studentName}</strong> ({student?.examNumber}).
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isDeletingInProgress}
                  onClick={() => setIsDeletingAll(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel (ரத்து)
                </button>
                <button
                  type="button"
                  disabled={isDeletingInProgress}
                  onClick={handleDeleteAllAttempts}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingInProgress ? 'Deleting All...' : 'Yes, Delete All (அனைத்தும் நீக்கு)'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
