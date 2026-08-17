import React, { useState, useEffect } from 'react';
import {
  NMMS_Subject,
  SubjectUnitSummary,
  Question,
  QuestionOption,
  SUBJECT_METADATA,
  Quiz,
} from '../types';
import { MathText } from './MathText';
import { fetchJson } from '../utils/api';
import {
  BookOpen,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Share2,
  Copy,
  Check,
  PlusCircle,
  Edit3,
  Trash2,
  RotateCcw,
  Download,
  Image as ImageIcon,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Layers,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  Shuffle,
  Sliders,
  Eye,
  X,
  Send,
  RefreshCw,
  Hash,
  Award,
} from 'lucide-react';

interface SubjectQuestionsTableProps {
  onPreviewQuizAsStudent: (quizId: string) => void;
  onRefreshQuizzes: () => void;
}

export const SubjectQuestionsTable: React.FC<SubjectQuestionsTableProps> = ({
  onPreviewQuizAsStudent,
  onRefreshQuizzes,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<NMMS_Subject>('MAT');
  const [unitSummaries, setUnitSummaries] = useState<SubjectUnitSummary[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'deployed' | 'diagrams'>('all');

  // Active viewing/editing unit
  const [activeUnit, setActiveUnit] = useState<SubjectUnitSummary | null>(null);
  const [unitQuestions, setUnitQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);
  const [questionSearchQuery, setQuestionSearchQuery] = useState<string>('');

  // Editing / Creating Question Modal
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState<boolean>(false);

  // Deploy Unit Modal
  const [deployModalUnit, setDeployModalUnit] = useState<SubjectUnitSummary | null>(null);
  const [deployDuration, setDeployDuration] = useState<number | ''>(30);
  const [deployPassPercentage, setDeployPassPercentage] = useState<number | ''>(40);
  const [deployShuffleQuestions, setDeployShuffleQuestions] = useState<boolean>(true);
  const [deployShuffleOptions, setDeployShuffleOptions] = useState<boolean>(true);
  const [deployQuestionLimit, setDeployQuestionLimit] = useState<boolean>(false);
  const [deployQuestionsCount, setDeployQuestionsCount] = useState<number | ''>(10);
  const [deployAntiCheat, setDeployAntiCheat] = useState<boolean>(true);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

  // Image Zoom Modal
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Status & Notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [copiedLinkUnitId, setCopiedLinkUnitId] = useState<string | null>(null);
  const [isBulkDeploying, setIsBulkDeploying] = useState<boolean>(false);
  const [unitsLoadError, setUnitsLoadError] = useState<string | null>(null);

  // Fetch unit summaries for current subject with automatic retry
  const fetchUnits = async (subject: NMMS_Subject = selectedSubject, retries = 2) => {
    setIsLoadingUnits(true);
    setUnitsLoadError(null);
    try {
      const data = await fetchJson<{ units: SubjectUnitSummary[] }>(`/api/subject-units?subject=${subject}`);
      setUnitSummaries(data.units || []);
      setUnitsLoadError(null);
    } catch (e: any) {
      console.warn(`Fetch units attempt failed (retries left: ${retries}):`, e);
      if (retries > 0) {
        setTimeout(() => {
          fetchUnits(subject, retries - 1);
        }, 800);
        return;
      }
      console.error('Failed to fetch units:', e);
      setUnitsLoadError(e.message || 'பாட அலகுகளை ஏற்றுவதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.');
    } finally {
      setIsLoadingUnits(false);
    }
  };

  useEffect(() => {
    fetchUnits(selectedSubject);
  }, [selectedSubject]);

  // Load questions for a selected unit with retry
  const handleOpenUnitQuestions = async (unit: SubjectUnitSummary, retries = 2) => {
    setActiveUnit(unit);
    setIsLoadingQuestions(true);
    try {
      const data = await fetchJson<{ questions: Question[] }>(`/api/subject-units/${unit.subject}/${unit.unitNumber}`);
      setUnitQuestions(data.questions || []);
    } catch (e: any) {
      if (retries > 0) {
        setTimeout(() => {
          handleOpenUnitQuestions(unit, retries - 1);
        }, 800);
        return;
      }
      console.error('Failed to fetch unit questions:', e);
      showNotification('error', e.message || 'வினாக்களை ஏற்றுவதில் பிழை ஏற்பட்டது.');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Copy direct student test link
  const handleCopyTestLink = (unitId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?quiz=${unitId}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkUnitId(unitId);
    showNotification('success', 'மாணவர் நேரடி தேர்வு இணைப்பு (Test Link) நகலெடுக்கப்பட்டது!');
    setTimeout(() => {
      setCopiedLinkUnitId(null);
    }, 2500);
  };

  // Open Edit Question Modal
  const handleEditQuestion = (q: Question) => {
    setEditingQuestion({ ...q });
    setIsQuestionModalOpen(true);
  };

  // Open Add Question Modal
  const handleAddNewQuestion = () => {
    if (!activeUnit) return;
    const defaultNew: Question = {
      id: '',
      subject: activeUnit.subject,
      topic: `${activeUnit.titleTa} (${activeUnit.titleEn})`,
      questionText: '',
      question_en: '',
      options: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ],
      options_en: ['', '', '', ''],
      correctOption: 'A',
      explanation: '',
      explanation_en: '',
      marks: 1,
      negativeMarks: 0,
    };
    setEditingQuestion(defaultNew);
    setIsQuestionModalOpen(true);
  };

  // Save (Create or Update) Question
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUnit || !editingQuestion) return;

    if (!editingQuestion.questionText.trim()) {
      showNotification('error', 'தயவுசெய்து வினா உரையை உள்ளிடவும்.');
      return;
    }

    const hasEmptyOption = editingQuestion.options.some((o) => !o.text.trim());
    if (hasEmptyOption) {
      showNotification('error', 'நான்கு விருப்பங்களையும் (Options A, B, C, D) நிரப்பவும்.');
      return;
    }

    setIsSavingQuestion(true);
    try {
      const isNew = !editingQuestion.id;
      const url = isNew
        ? `/api/subject-units/${activeUnit.subject}/${activeUnit.unitNumber}/questions`
        : `/api/subject-units/${activeUnit.subject}/${activeUnit.unitNumber}/questions/${editingQuestion.id}`;

      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingQuestion),
      });

      if (res.ok) {
        showNotification('success', isNew ? 'புதிய வினா வெற்றிகரமாக சேர்க்கப்பட்டது!' : 'வினா வெற்றிகரமாக புதுப்பிக்கப்பட்டது!');
        setIsQuestionModalOpen(false);
        setEditingQuestion(null);
        // Refresh active unit questions & unit summary list
        handleOpenUnitQuestions(activeUnit);
        fetchUnits(selectedSubject);
        onRefreshQuizzes();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'வினாவை சேமிப்பதில் பிழை ஏற்பட்டது.');
      }
    } catch (e) {
      console.error('Failed to save question:', e);
      showNotification('error', 'வினாவை சேமிப்பதில் பிழை ஏற்பட்டது.');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (qId: string) => {
    if (!activeUnit) return;
    if (!confirm('இந்த வினாவை நிச்சயமாக நீக்க விரும்புகிறீர்களா?')) return;

    try {
      const res = await fetch(
        `/api/subject-units/${activeUnit.subject}/${activeUnit.unitNumber}/questions/${qId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        showNotification('success', 'வினா வெற்றிகரமாக நீக்கப்பட்டது.');
        setUnitQuestions((prev) => prev.filter((q) => q.id !== qId));
        fetchUnits(selectedSubject);
        onRefreshQuizzes();
      } else {
        showNotification('error', 'வினாவை நீக்குவதில் பிழை ஏற்பட்டது.');
      }
    } catch (e) {
      console.error('Failed to delete question:', e);
      showNotification('error', 'வினாவை நீக்குவதில் பிழை ஏற்பட்டது.');
    }
  };

  // Reset Unit to original assets
  const handleResetUnit = async () => {
    if (!activeUnit) return;
    if (!confirm('இந்த அலகின் அனைத்து வினாக்களையும் அசல் நிலைக்கு (Original Default) மீட்டமைக்க விரும்புகிறீர்களா? செய்யப்பட்ட மாற்றங்கள் நீக்கப்படும்.')) return;

    try {
      const res = await fetch(
        `/api/subject-units/${activeUnit.subject}/${activeUnit.unitNumber}/reset`,
        { method: 'POST' }
      );
      if (res.ok) {
        showNotification('success', 'அலகு வினாக்கள் அசல் நிலைக்கு மீட்டமைக்கப்பட்டன!');
        handleOpenUnitQuestions(activeUnit);
        fetchUnits(selectedSubject);
        onRefreshQuizzes();
      } else {
        showNotification('error', 'மீட்டமைப்பில் பிழை ஏற்பட்டது.');
      }
    } catch (e) {
      console.error('Failed to reset unit:', e);
      showNotification('error', 'மீட்டமைப்பில் பிழை ஏற்பட்டது.');
    }
  };

  // Open Deploy Modal
  const handleOpenDeployModal = (unit: SubjectUnitSummary, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeployModalUnit(unit);
    setDeployDuration(unit.durationMinutes || 30);
    setDeployPassPercentage(40);
    setDeployShuffleQuestions(true);
    setDeployShuffleOptions(true);
    setDeployQuestionLimit(false);
    setDeployQuestionsCount(Math.min(15, unit.questionCount));
    setDeployAntiCheat(true);
  };

  // Execute Deployment
  const handleExecuteDeploy = async () => {
    if (!deployModalUnit) return;
    setIsDeploying(true);
    try {
      const res = await fetch('/api/subject-units/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: deployModalUnit.subject,
          unitNum: deployModalUnit.unitNumber,
          durationMinutes: Number(deployDuration) || 30,
          passPercentage: Number(deployPassPercentage) || 40,
          shuffleQuestions: deployShuffleQuestions,
          shuffleOptions: deployShuffleOptions,
          enableQuestionLimit: deployQuestionLimit,
          questionsPerAttempt: deployQuestionLimit ? (Number(deployQuestionsCount) || 10) : undefined,
          enableAntiCheat: deployAntiCheat,
        }),
      });

      if (res.ok) {
        showNotification(
          'success',
          `"${deployModalUnit.titleTa}" அலகு மாதிரித் தேர்வாக மாணவர் பயன்பாட்டிற்கு வெளியிடப்பட்டது!`
        );
        setDeployModalUnit(null);
        fetchUnits(selectedSubject);
        onRefreshQuizzes();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'வெளியிடுவதில் பிழை ஏற்பட்டது.');
      }
    } catch (e) {
      console.error('Failed to deploy unit:', e);
      showNotification('error', 'வெளியிடுவதில் பிழை ஏற்பட்டது.');
    } finally {
      setIsDeploying(false);
    }
  };

  // Bulk Deploy all units of active subject
  const handleBulkDeploy = async () => {
    if (!confirm(`${SUBJECT_METADATA[selectedSubject].name} பாடத்தின் அனைத்து அலகுகளையும் மாதிரித் தேர்வுகளாக மாணவர் பயன்பாட்டிற்கு வெளியிட விரும்புகிறீர்களா?`)) return;

    setIsBulkDeploying(true);
    try {
      const res = await fetch('/api/subject-units/deploy-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: selectedSubject }),
      });
      if (res.ok) {
        const data = await res.json();
        showNotification('success', data.message || 'அனைத்து அலகுகளும் வெற்றிகரமாக வெளியிடப்பட்டன!');
        fetchUnits(selectedSubject);
        onRefreshQuizzes();
      } else {
        showNotification('error', 'வெளியிடுவதில் பிழை ஏற்பட்டது.');
      }
    } catch (e) {
      console.error('Failed to bulk deploy:', e);
      showNotification('error', 'வெளியிடுவதில் பிழை ஏற்பட்டது.');
    } finally {
      setIsBulkDeploying(false);
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    if (!activeUnit || unitQuestions.length === 0) return;
    const jsonStr = JSON.stringify(unitQuestions, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeUnit.id}_questions.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('info', 'வினாக்கள் JSON ஃபைலாக பதிவிறக்கம் செய்யப்பட்டது.');
  };

  // Filter units
  const filteredUnits = unitSummaries.filter((u) => {
    const matchSearch =
      u.titleTa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(u.unitNumber).includes(searchQuery) ||
      (u.description && u.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchSearch) return false;
    if (filterMode === 'deployed') return u.isDeployed;
    if (filterMode === 'diagrams') return u.hasDiagrams;
    return true;
  });

  // Filter questions within active unit
  const filteredQuestions = unitQuestions.filter((q, idx) => {
    const query = questionSearchQuery.toLowerCase();
    return (
      String(idx + 1).includes(query) ||
      q.questionText.toLowerCase().includes(query) ||
      (q.question_en && q.question_en.toLowerCase().includes(query)) ||
      q.options.some((o) => o.text.toLowerCase().includes(query)) ||
      (q.explanation && q.explanation.toLowerCase().includes(query))
    );
  });

  const totalSubjectQuestions = unitSummaries.reduce((sum, u) => sum + u.questionCount, 0);
  const totalSubjectDeployed = unitSummaries.filter((u) => u.isDeployed).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-sm font-medium border transition-all animate-bounce ${
            notification.type === 'success'
              ? 'bg-emerald-900/95 text-emerald-100 border-emerald-700'
              : notification.type === 'error'
              ? 'bg-rose-900/95 text-rose-100 border-rose-700'
              : 'bg-indigo-900/95 text-indigo-100 border-indigo-700'
          }`}
        >
          {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
          {notification.type === 'info' && <Sparkles className="w-5 h-5 text-indigo-400" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Container View: Either List of Units OR Detail Questions Table of Single Unit */}
      {!activeUnit ? (
        <div className="space-y-6">
          {/* Header Banner & Subject Selector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-50 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Layers className="w-4 h-4" />
                  <span>Subject Questions &amp; Unit Bank • பாடவாரியான வினாக்கள் வங்கி</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  அலகு வினாக்கள் மேலாண்மை &amp; தேர்வு வெளியீடு
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                  MAT, கணிதம், அறிவியல், மற்றும் சமூக அறிவியல் பாடங்களின் அனைத்து அலகுகளுக்கான வினாக்கள்.
                  வினாக்களை திருத்தலாம், புதிய வினாக்களைச் சேர்க்கலாம் மற்றும் மாணவர்களுக்கு தேர்வுகளாக வெளியிடலாம்.
                </p>
              </div>

              {/* Bulk Deploy Action */}
              <div className="flex items-center space-x-2 sm:self-start md:self-auto flex-shrink-0">
                <button
                  onClick={handleBulkDeploy}
                  disabled={isBulkDeploying || unitSummaries.length === 0}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isBulkDeploying ? 'வெளியிடப்படுகிறது...' : 'அனைத்து அலகுகளையும் தேர்வாக வெளியிடு'}</span>
                </button>
              </div>
            </div>

            {/* Subject Selector Tabs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-6">
              {(['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'] as NMMS_Subject[]).map((subKey) => {
                const isSel = selectedSubject === subKey;
                const meta = SUBJECT_METADATA[subKey];
                return (
                  <button
                    key={subKey}
                    onClick={() => {
                      setSelectedSubject(subKey);
                      setSearchQuery('');
                    }}
                    className={`p-3 sm:p-4 rounded-xl text-left border transition-all cursor-pointer relative ${
                      isSel
                        ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 dark:bg-slate-800 dark:border-indigo-500 dark:text-white shadow-sm ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-900/80 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${isSel ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        {subKey === 'MAT' ? 'Mental Ability' : 'Scholastic Aptitude'}
                      </span>
                      {isSel && <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />}
                    </div>
                    <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1 truncate">
                      {meta.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center space-x-1.5">
                      <BookOpen className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                      <span>{meta.shortName}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats Bar & Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm">
            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80 whitespace-nowrap">
                <span className="text-slate-600 dark:text-slate-400">மொத்த அலகுகள்:</span>
                <span className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs">
                  {unitSummaries.length}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200/80 dark:border-indigo-800/60 whitespace-nowrap">
                <span className="text-indigo-900 dark:text-indigo-300 font-medium">மொத்த வினாக்கள்:</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-indigo-900/80 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-700 text-xs">
                  {totalSubjectQuestions}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 bg-emerald-50/70 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60 whitespace-nowrap">
                <span className="text-emerald-900 dark:text-emerald-300 font-medium">வெளியிடப்பட்ட தேர்வுகள்:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-emerald-900/80 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-700 text-xs">
                  {totalSubjectDeployed} / {unitSummaries.length}
                </span>
              </div>
            </div>

            {/* Search & Filter Mode */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
              <div className="relative flex-1 sm:w-60 min-w-[180px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="அலகு பெயர் / எண் தேடுக..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 pl-9 pr-8 py-1.5 text-xs sm:text-sm rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Buttons */}
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5 text-xs overflow-x-auto">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-white text-indigo-700 shadow-sm font-bold dark:bg-indigo-600 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  அனைத்தும் ({unitSummaries.length})
                </button>
                <button
                  onClick={() => setFilterMode('deployed')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                    filterMode === 'deployed'
                      ? 'bg-white text-indigo-700 shadow-sm font-bold dark:bg-indigo-600 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  வெளியிடப்பட்டது ({totalSubjectDeployed})
                </button>
                <button
                  onClick={() => setFilterMode('diagrams')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                    filterMode === 'diagrams'
                      ? 'bg-white text-indigo-700 shadow-sm font-bold dark:bg-indigo-600 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  படங்கள் கொண்டது
                </button>
              </div>
            </div>
          </div>

          {/* Units Grid */}
          {isLoadingUnits ? (
            <div className="py-20 text-center text-slate-500 dark:text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 dark:text-indigo-500" />
              <p>பாட அலகுகள் மற்றும் வினாக்கள் ஏற்றப்படுகின்றன...</p>
            </div>
          ) : unitsLoadError ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900/50 border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-sm space-y-3 px-4">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-base font-semibold text-slate-900 dark:text-white">{unitsLoadError}</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                சர்வர் இணைப்பு momentarily துண்டிக்கப்பட்டிருக்கலாம். கீழே உள்ள பட்டனை அழுத்தி மீண்டும் முயற்சிக்கவும்.
              </p>
              <button
                type="button"
                onClick={() => fetchUnits(selectedSubject)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>மீண்டும் முயற்சிக்கவும் (Retry)</span>
              </button>
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <HelpCircle className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
              <p className="text-base font-semibold text-slate-800 dark:text-slate-300">பொருத்தமான அலகுகள் ஏதுமில்லை</p>
              <p className="text-xs text-slate-500 mt-1">தேடல் அளவுகோலை மாற்றி முயற்சிக்கவும்.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUnits.map((unit) => (
                <div
                  key={unit.id}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all hover:shadow-lg relative group ${
                    unit.isDeployed
                      ? 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50'
                      : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Unit Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center font-bold text-xs">
                          {unit.unitNumber}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          அலகு {unit.unitNumber}
                        </span>
                        {unit.hasDiagrams && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                            <ImageIcon className="w-3 h-3 mr-1" /> படம்
                          </span>
                        )}
                        {unit.hasCustomEdits && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                            திருத்தப்பட்டது
                          </span>
                        )}
                      </div>

                      {unit.isDeployed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" /> நேரலை
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          தயார்
                        </span>
                      )}
                    </div>

                    {/* Unit Title */}
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                      {unit.titleTa}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{unit.titleEn}</p>

                    {unit.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {unit.description}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center space-x-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center space-x-1 font-semibold text-slate-700 dark:text-slate-300">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>{unit.questionCount} வினாக்கள்</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{unit.durationMinutes} நிமிடம்</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        <span>{unit.totalMarks} மதிப்பெண்</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => handleOpenUnitQuestions(unit)}
                      className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>வினாக்கள் மேலாண்மை</span>
                    </button>

                    <button
                      onClick={(e) => handleOpenDeployModal(unit, e)}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>தேர்வாக அனுப்பு</span>
                    </button>

                    <button
                      onClick={() => onPreviewQuizAsStudent(unit.id)}
                      className="col-span-1 py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1 border border-slate-200 dark:border-slate-800 cursor-pointer"
                    >
                      <Play className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>மாதிரி தேர்வு</span>
                    </button>

                    <button
                      onClick={(e) => handleCopyTestLink(unit.id, e)}
                      className="col-span-1 py-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg text-[11px] font-semibold flex items-center justify-center space-x-1 border border-slate-200 dark:border-slate-800 cursor-pointer"
                    >
                      {copiedLinkUnitId === unit.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-700 dark:text-emerald-300 font-bold">நகலெடுக்கப்பட்டது</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span>லிங்க் காப்பி</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Detailed Questions Table View for Selected Unit */
        <div className="space-y-6">
          {/* Top Breadcrumb Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <button
                onClick={() => setActiveUnit(null)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center space-x-1 mb-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>அனைத்து அலகுகளின் பட்டியலுக்குத் திரும்பு (Back to Units)</span>
              </button>

              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {SUBJECT_METADATA[activeUnit.subject].shortName} • அலகு {activeUnit.unitNumber}
                </span>
                {activeUnit.isDeployed && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>தேர்வு நேரலை (Live)</span>
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                {activeUnit.titleTa}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">{activeUnit.titleEn}</p>
            </div>

            {/* Unit Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleAddNewQuestion}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>புதிய வினா சேர்க்க (Add Question)</span>
              </button>

              <button
                onClick={(e) => handleOpenDeployModal(activeUnit, e)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>தேர்வாக அனுப்பு (Deploy)</span>
              </button>

              <button
                onClick={() => onPreviewQuizAsStudent(activeUnit.id)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold flex items-center space-x-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>மாதிரி தேர்வு</span>
              </button>

              <button
                onClick={(e) => handleCopyTestLink(activeUnit.id, e)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold flex items-center space-x-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>லிங்க்</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="JSON ஃபைலாக பதிவிறக்கு"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetUnit}
                className="p-2 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-300 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700 cursor-pointer"
                title="அசல் நிலைக்கு மீட்டமைக்க (Reset to Default)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search bar inside active unit questions */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 gap-4 shadow-sm">
            <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              மொத்தம் <span className="text-indigo-600 dark:text-indigo-400 font-bold">{unitQuestions.length}</span> வினாக்கள் உள்ளன
            </div>

            <div className="relative w-full max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="இந்த அலகில் வினாக்களைத் தேடுக..."
                value={questionSearchQuery}
                onChange={(e) => setQuestionSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Questions Table */}
          {isLoadingQuestions ? (
            <div className="py-20 text-center text-slate-500 dark:text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 dark:text-indigo-500" />
              <p>வினாக்கள் ஏற்றப்படுகின்றன...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <p className="text-slate-600 dark:text-slate-400 font-medium">பொருத்தமான வினாக்கள் காணப்படவில்லை.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all space-y-3 relative group"
                >
                  {/* Question Header & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center flex-wrap gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-xs">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        வினா எண்: {idx + 1}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80 whitespace-nowrap">
                        {q.id}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold whitespace-nowrap">
                        {q.marks || 1} மதிப்பெண்
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 self-end sm:self-auto flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditQuestion(q)}
                        className="h-7 px-2.5 bg-slate-100 hover:bg-indigo-600 hover:text-white dark:bg-slate-800 dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                        title="வினாவை திருத்து (Edit Question)"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>திருத்து (Edit)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="h-7 w-7 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-600 dark:text-slate-400 dark:hover:text-rose-300 rounded-lg text-xs transition-all cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0"
                        title="வினாவை நீக்கு"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text (Tamil & English) */}
                  <div className="space-y-1">
                    <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                      <MathText text={q.questionText} />
                    </div>
                    {q.question_en && (
                      <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic font-medium">
                        <MathText text={q.question_en} />
                      </div>
                    )}
                  </div>

                  {/* Diagram Image if available */}
                  {q.questionImage && (
                    <div className="pt-1">
                      <div
                        onClick={() => setZoomedImage(q.questionImage!)}
                        className="inline-block relative group/img cursor-pointer rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-white p-2 max-w-sm"
                      >
                        <img
                          src={q.questionImage}
                          alt="Question Diagram"
                          className="max-h-40 object-contain mx-auto"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold">
                          <Eye className="w-4 h-4 mr-1" /> பெரிதாக்கிப் பார்
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = opt.id === q.correctOption;
                      const optEn = q.options_en ? q.options_en[optIdx] : undefined;
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-xl border flex items-start space-x-2 text-xs sm:text-sm transition-all ${
                            isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-100 font-semibold ring-1 ring-emerald-400/30'
                              : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                              isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-slate-900 dark:text-white font-medium">
                              <MathText text={opt.text} />
                            </div>
                            {optEn && optEn !== opt.text && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                                <MathText text={optEn} />
                              </div>
                            )}
                          </div>
                          {isCorrect && (
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 flex-shrink-0">
                              சரியான விடை
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation / Solution */}
                  {(q.explanation || q.explanation_en) && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <div className="flex items-center space-x-1.5 text-indigo-700 dark:text-indigo-400 font-bold text-[11px] uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>விளக்கம் / தீர்வு முறை (Explanation)</span>
                      </div>
                      {q.explanation && (
                        <div className="text-slate-800 dark:text-slate-300 font-medium">
                          <MathText text={q.explanation} />
                        </div>
                      )}
                      {q.explanation_en && q.explanation_en !== q.explanation && (
                        <div className="text-slate-500 dark:text-slate-400 italic">
                          <MathText text={q.explanation_en} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit / Add Question Modal */}
      {isQuestionModalOpen && editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {editingQuestion.id ? 'வினாவை திருத்து (Edit Question)' : 'புதிய வினா உருவாக்கு (Add Question)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeUnit?.titleTa} ({activeUnit?.titleEn})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveQuestion} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Question Text in Tamil */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  வினா உரை (தமிழ்) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={editingQuestion.questionText}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, questionText: e.target.value })
                  }
                  placeholder="வினாவை தட்டச்சு செய்க (எ.கா: கொடுக்கப்பட்டுள்ள எண் தொடரில் விடுபட்ட எண்ணை காண்க...)"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder-slate-400"
                  required
                />
              </div>

              {/* Question Text in English */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Question in English (விருப்பமானது / Optional)
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.question_en || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, question_en: e.target.value })
                  }
                  placeholder="Enter English translation of question..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder-slate-400"
                />
              </div>

              {/* Diagram / Image Path */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  வரைபடம் / பட URL (Diagram Image Path)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editingQuestion.questionImage || ''}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, questionImage: e.target.value })
                    }
                    placeholder="/assets/satmaths/image/unit2/q1.PNG அல்லது பட URL"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder-slate-400"
                  />
                  {editingQuestion.questionImage && (
                    <button
                      type="button"
                      onClick={() => setEditingQuestion({ ...editingQuestion, questionImage: undefined })}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      அகற்று
                    </button>
                  )}
                </div>
                {editingQuestion.questionImage && (
                  <div className="mt-2 p-2 bg-slate-50 dark:bg-white rounded-xl max-w-xs border border-slate-200 dark:border-slate-700">
                    <img
                      src={editingQuestion.questionImage}
                      alt="Preview"
                      className="max-h-24 object-contain mx-auto"
                    />
                  </div>
                )}
              </div>

              {/* Options A, B, C, D & Correct Option Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  4 விருப்பங்கள் &amp; சரியான விடை (Options &amp; Correct Answer) <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-3">
                  {(['A', 'B', 'C', 'D'] as ('A' | 'B' | 'C' | 'D')[]).map((letter, idx) => {
                    const isCorrect = editingQuestion.correctOption === letter;
                    const optText = editingQuestion.options[idx]?.text || '';
                    const optEn = editingQuestion.options_en ? editingQuestion.options_en[idx] || '' : '';

                    return (
                      <div
                        key={letter}
                        className={`p-3 rounded-xl border transition-all ${
                          isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400/30'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {letter}
                          </span>

                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="correctOption"
                              checked={isCorrect}
                              onChange={() =>
                                setEditingQuestion({ ...editingQuestion, correctOption: letter })
                              }
                              className="w-4 h-4 text-emerald-600 border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
                            />
                            <span className={`text-xs font-bold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                              {isCorrect ? '✓ சரியான விடை (Correct Choice)' : 'சரியான விடையாக அமை'}
                            </span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={optText}
                            onChange={(e) => {
                              const newOpts: QuestionOption[] = [...editingQuestion.options];
                              newOpts[idx] = { id: letter, text: e.target.value };
                              setEditingQuestion({ ...editingQuestion, options: newOpts });
                            }}
                            placeholder={`விருப்பம் ${letter} (தமிழ்)`}
                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                            required
                          />

                          <input
                            type="text"
                            value={optEn}
                            onChange={(e) => {
                              const newEn = editingQuestion.options_en ? [...editingQuestion.options_en] : ['', '', '', ''];
                              newEn[idx] = e.target.value;
                              setEditingQuestion({ ...editingQuestion, options_en: newEn });
                            }}
                            placeholder={`Option ${letter} (English)`}
                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-800 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanation in Tamil & English */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    விளக்கம் / தீர்வு (தமிழ்)
                  </label>
                  <textarea
                    rows={2}
                    value={editingQuestion.explanation || ''}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                    }
                    placeholder="சரியான விடைக்கான வழிமுறை மற்றும் விளக்கம்..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Explanation in English
                  </label>
                  <textarea
                    rows={2}
                    value={editingQuestion.explanation_en || ''}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, explanation_en: e.target.value })
                    }
                    placeholder="Step by step solution in English..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Marks & Negative Marks */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    மதிப்பெண் (Marks)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editingQuestion.marks ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingQuestion({
                        ...editingQuestion,
                        marks: val === '' ? ('' as any) : parseInt(val, 10) || 0,
                      });
                    }}
                    onBlur={() => {
                      if (!editingQuestion.marks || Number(editingQuestion.marks) < 1) {
                        setEditingQuestion({ ...editingQuestion, marks: 1 });
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    எதிர்மறை மதிப்பெண் (Negative Marks)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.25}
                    value={editingQuestion.negativeMarks ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingQuestion({
                        ...editingQuestion,
                        negativeMarks: val === '' ? ('' as any) : parseFloat(val) || 0,
                      });
                    }}
                    onBlur={() => {
                      if (editingQuestion.negativeMarks === '' || isNaN(Number(editingQuestion.negativeMarks))) {
                        setEditingQuestion({ ...editingQuestion, negativeMarks: 0 });
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
              >
                ரத்து செய் (Cancel)
              </button>
              <button
                type="button"
                onClick={handleSaveQuestion}
                disabled={isSavingQuestion}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSavingQuestion ? 'சேமிக்கப்படுகிறது...' : 'வினாவை சேமி (Save Question)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Unit Modal */}
      {deployModalUnit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    மாணவர்களுக்கு தேர்வாக அனுப்பு (Deploy Unit Test)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {deployModalUnit.titleTa} ({deployModalUnit.titleEn})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeployModalUnit(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-sm">
              <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-3 text-xs text-indigo-900 dark:text-indigo-200">
                இந்த அலகை வெளியிட்டதும், மாணவர்கள் தங்கள் தேர்வு எண் கொண்டு உடனடியாக ஆன்லைன் தேர்வு எழுத முடியும். நேரடி தேர்வு இணைப்பு (Direct Link) மற்றும் QR கோட் உருவாக்கப்படும்.
              </div>

              {/* Duration & Pass Percentage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    தேர்வு கால அளவு (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={deployDuration}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setDeployDuration('');
                      } else {
                        const num = parseInt(val, 10);
                        setDeployDuration(isNaN(num) ? '' : num);
                      }
                    }}
                    onBlur={() => {
                      if (deployDuration === '' || Number(deployDuration) < 1) {
                        setDeployDuration(30);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    தேர்ச்சி சதவீதம் (Pass %)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={deployPassPercentage}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setDeployPassPercentage('');
                      } else {
                        const num = parseInt(val, 10);
                        setDeployPassPercentage(isNaN(num) ? '' : num);
                      }
                    }}
                    onBlur={() => {
                      if (deployPassPercentage === '' || Number(deployPassPercentage) < 0) {
                        setDeployPassPercentage(40);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Question Sampling / Limit */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      சீரற்ற வினாக்கள் வரம்பு (Random Subset Limit)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={deployQuestionLimit}
                    onChange={(e) => setDeployQuestionLimit(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700"
                  />
                </label>
                {deployQuestionLimit && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      ஒரு மாணவருக்கு காட்ட வேண்டிய வினாக்கள்:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={deployModalUnit.questionCount}
                      value={deployQuestionsCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setDeployQuestionsCount('');
                        } else {
                          const num = parseInt(val, 10);
                          setDeployQuestionsCount(isNaN(num) ? '' : num);
                        }
                      }}
                      onBlur={() => {
                        if (deployQuestionsCount === '' || Number(deployQuestionsCount) < 1) {
                          setDeployQuestionsCount(10);
                        }
                      }}
                      className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-900 dark:text-white font-bold text-xs text-center font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Shuffling & Anti Cheat Toggles */}
              <div className="space-y-2 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60">
                  <input
                    type="checkbox"
                    checked={deployShuffleQuestions}
                    onChange={(e) => setDeployShuffleQuestions(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    வினாக்களின் வரிசையைக் கலைக்க (Shuffle Questions)
                  </span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60">
                  <input
                    type="checkbox"
                    checked={deployShuffleOptions}
                    onChange={(e) => setDeployShuffleOptions(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    விடைகளின் வரிசையைக் கலைக்க (Shuffle Options A,B,C,D)
                  </span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60">
                  <input
                    type="checkbox"
                    checked={deployAntiCheat}
                    onChange={(e) => setDeployAntiCheat(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    முழுத்திரை பாதுகாப்பு &amp; Tab Switch கண்காணிப்பு (Anti-Cheat)
                  </span>
                </label>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeployModalUnit(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
              >
                ரத்து செய் (Cancel)
              </button>
              <button
                type="button"
                onClick={handleExecuteDeploy}
                disabled={isDeploying}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isDeploying ? 'வெளியிடப்படுகிறது...' : 'மாணவர்களுக்கு வெளியிடு (Deploy Test)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-4xl max-h-[85vh] bg-white rounded-2xl p-4 relative shadow-2xl">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-2 right-2 p-1.5 bg-slate-900 text-white rounded-full hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={zoomedImage}
              alt="Zoomed Diagram"
              className="max-h-[75vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
