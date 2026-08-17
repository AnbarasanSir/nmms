import React, { useState, useEffect } from 'react';
import { Quiz, Question, PyqPaperSummary, NMMS_Subject, SUBJECT_METADATA } from '../types';
import { MathText } from './MathText';
import { 
  FileText, 
  Send, 
  Eye, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  Share2, 
  Sparkles, 
  Edit3, 
  ChevronRight, 
  X, 
  Globe, 
  Layers, 
  BrainCircuit, 
  ExternalLink,
  MessageCircle,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Zap,
  ArrowUpRight,
  Sliders
} from 'lucide-react';

interface PreviousYearPapersProps {
  onSelectQuizForPreview: (quizId: string) => void;
  onImportToBuilder: (paper: Quiz) => void;
  onRefreshQuizzes: () => void;
}

export const PreviousYearPapers: React.FC<PreviousYearPapersProps> = ({
  onSelectQuizForPreview,
  onImportToBuilder,
  onRefreshQuizzes,
}) => {
  const [papers, setPapers] = useState<PyqPaperSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'MAT' | 'SAT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Paper details modal / drawer state
  const [selectedPaperDetails, setSelectedPaperDetails] = useState<Quiz | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [languageMode, setLanguageMode] = useState<'ta' | 'en'>('ta');
  const [subjectFilterInModal, setSubjectFilterInModal] = useState<NMMS_Subject | 'ALL'>('ALL');
  const [questionSearchInModal, setQuestionSearchInModal] = useState<string>('');

  // Deployment Confirmation Modal State
  const [deployModalPaper, setDeployModalPaper] = useState<PyqPaperSummary | null>(null);
  const [deployDuration, setDeployDuration] = useState<number | ''>(90);
  const [deployPassPercentage, setDeployPassPercentage] = useState<number | ''>(50);
  const [deployShuffleQuestions, setDeployShuffleQuestions] = useState<boolean>(true);
  const [deployShuffleOptions, setDeployShuffleOptions] = useState<boolean>(true);
  const [deployQuestionLimit, setDeployQuestionLimit] = useState<boolean>(false);
  const [deployQuestionsCount, setDeployQuestionsCount] = useState<number | ''>(90);
  const [deployAntiCheat, setDeployAntiCheat] = useState<boolean>(true);

  // Share Modal State
  const [shareModalPaper, setShareModalPaper] = useState<PyqPaperSummary | null>(null);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [deploySuccessMsg, setDeploySuccessMsg] = useState<string | null>(null);

  // Fetch papers repository on mount
  useEffect(() => {
    fetchPyqPapers();
  }, []);

  const fetchPyqPapers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/pyq/papers');
      if (res.ok) {
        const data = await res.json();
        if (data.papers && Array.isArray(data.papers)) {
          setPapers(data.papers);
        }
      }
    } catch (e) {
      console.error('Failed to load PYQ papers repository:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch full paper with pre-filled questions for inspection
  const handleOpenPaperExplorer = async (paperId: string) => {
    setIsLoadingDetails(true);
    setSelectedPaperDetails(null);
    setSubjectFilterInModal('ALL');
    setQuestionSearchInModal('');

    try {
      const res = await fetch(`/api/pyq/papers/${paperId}`);
      if (res.ok) {
        const fullPaper: Quiz = await res.json();
        setSelectedPaperDetails(fullPaper);
      }
    } catch (e) {
      console.error('Error fetching paper details:', e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Open Deployment Confirmation Modal
  const handleOpenDeployModal = (paper: PyqPaperSummary, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeployModalPaper(paper);
    setDeployDuration(paper.durationMinutes || 90);
    setDeployPassPercentage(50);
    setDeployShuffleQuestions(true);
    setDeployShuffleOptions(true);
    setDeployQuestionLimit(false);
    setDeployQuestionsCount(paper.questionCount || 90);
    setDeployAntiCheat(true);
  };

  // Execute Deployment from confirmation modal
  const handleExecuteDeploy = async () => {
    if (!deployModalPaper) return;
    setIsDeploying(true);
    try {
      const res = await fetch('/api/pyq/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: deployModalPaper.id,
          durationMinutes: Number(deployDuration) || 90,
          passPercentage: Number(deployPassPercentage) || 50,
          shuffleQuestions: deployShuffleQuestions,
          shuffleOptions: deployShuffleOptions,
          enableQuestionLimit: deployQuestionLimit,
          questionsPerAttempt: deployQuestionLimit ? (Number(deployQuestionsCount) || 90) : undefined,
          enableAntiCheat: deployAntiCheat,
        }),
      });

      if (res.ok) {
        const deployedPaper = deployModalPaper;
        setDeployModalPaper(null);
        setShareModalPaper(deployedPaper);
        setCopiedLink(false);
        setDeploySuccessMsg(`"${deployedPaper.title}" மாதிரித் தேர்வாக மாணவர் பயன்பாட்டிற்கு வெளியிடப்பட்டது!`);
        fetchPyqPapers();
        onRefreshQuizzes();
      } else {
        alert('வெளியிடுவதில் பிழை ஏற்பட்டது.');
      }
    } catch (e) {
      console.error('Failed to deploy PYQ paper:', e);
      alert('வெளியிடுவதில் பிழை ஏற்பட்டது.');
    } finally {
      setIsDeploying(false);
    }
  };

  // Copy student test link
  const handleCopyShareLink = (paperId: string) => {
    const shareUrl = `${window.location.origin}/?quiz=${paperId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // WhatsApp Share helper
  const handleWhatsAppShare = (paper: PyqPaperSummary) => {
    const shareUrl = `${window.location.origin}/?quiz=${paper.id}`;
    const todayDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const message = `📅 *நாள்:* ${todayDate}
📝 *தேர்வு:* ${paper.title} (${paper.year})
⏱️ *கால அளவு:* ${paper.durationMinutes} நிமிடங்கள்
📊 *வினாக்கள்:* ${paper.questionCount} | *மொத்த மதிப்பெண்:* ${paper.totalMarks}
📌 *விவரம்:* ${paper.description}

🔗 *தேர்வில் பங்கேற்க கீழே உள்ள இணைப்பை கிளிக் செய்யவும்:*
${shareUrl}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Load paper into Question Builder tab
  const handleLoadPaperToBuilder = async (paperId: string) => {
    try {
      const res = await fetch(`/api/pyq/papers/${paperId}`);
      if (res.ok) {
        const fullPaper: Quiz = await res.json();
        onImportToBuilder(fullPaper);
      }
    } catch (e) {
      console.error('Error importing paper to builder:', e);
    }
  };

  // Filtered papers
  const availableYears = Array.from(new Set(papers.map((p) => String(p.year)))).sort().reverse();

  const filteredPapers = papers.filter((p) => {
    if (selectedYear !== 'ALL' && String(p.year) !== selectedYear) return false;
    if (selectedType !== 'ALL' && p.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        String(p.year).includes(q)
      );
    }
    return true;
  });

  const totalQuestionsCount = papers.reduce((sum, p) => sum + p.questionCount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner / Callout */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-7 shadow-xl border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>முந்தைய ஆண்டு வினாத்தாள்கள் (Official PYQ Repository)</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{papers.length} வினாத்தாள்கள் ({totalQuestionsCount.toLocaleString()} வினாக்கள் தயார்)</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            NMMS Previous Year Question Papers (2017 – 2026)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            அனைத்து வினாக்களும், சரியான விடைக் குறிப்புகளும் மற்றும் விரிவான விளக்கங்களும் முன்கூட்டியே நிரப்பப்பட்டுள்ளன (All questions pre-filled).
            ஆசிரியர்கள் ஒரே கிளிக்கில் மாணவர்களுக்கு WhatsApp அல்லது தேர்வு இணைப்பாக அனுப்பலாம்.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPyqPapers}
          disabled={isLoading}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold backdrop-blur-sm border border-white/20 transition-all self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>புதுப்பி (Refresh)</span>
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="ஆண்டு, பாடம் அல்லது வினாத்தாள் தலைப்பைத் தேடுக..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Year Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>ஆண்டு:</span>
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none"
            >
              <option value="ALL">அனைத்து ஆண்டுகள் ({availableYears.length})</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter (MAT / SAT) */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => setSelectedType('ALL')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                selectedType === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              அனைத்தும்
            </button>
            <button
              onClick={() => setSelectedType('MAT')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                selectedType === 'MAT'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              MAT (90 Qs)
            </button>
            <button
              onClick={() => setSelectedType('SAT')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                selectedType === 'SAT'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              SAT (90 Qs)
            </button>
          </div>

        </div>

      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            முந்தைய ஆண்டு வினாத்தாள்களை ஏற்றுகிறது...
          </p>
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            வினாத்தாள் எதுவும் கண்டறியப்படவில்லை
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            வடிகட்டிகளை மாற்றி மீண்டும் முயற்சிக்கவும்.
          </p>
          <button
            onClick={() => {
              setSelectedYear('ALL');
              setSelectedType('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            வடிகட்டிகளை நீக்குக (Reset Filters)
          </button>
        </div>
      ) : (
        /* Papers Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPapers.map((paper) => {
            const isMat = paper.type === 'MAT';
            const shareUrl = `${window.location.origin}/?quiz=${paper.id}`;

            return (
              <div
                key={paper.id}
                id={`paper-card-${paper.id}`}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white">
                        {paper.year}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          isMat
                            ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {isMat ? 'மனத்திறன் (MAT)' : 'படிப்பறிவு (SAT)'}
                      </span>
                    </div>

                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      ✓ Pre-filled ({paper.questionCount} Qs)
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {paper.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {paper.description}
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{paper.durationMinutes} நிமிடம்</span>
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-medium">
                      <Award className="w-3.5 h-3.5 text-slate-500" />
                      <span>{paper.totalMarks} மதிப்பெண்கள்</span>
                    </span>
                    {paper.attemptsCount > 0 && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold">
                        <span>{paper.attemptsCount} மாணவர்கள் எழுதியுள்ளனர்</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  
                  {/* Primary Button: Send to Students */}
                  <button
                    type="button"
                    onClick={() => handleOpenDeployModal(paper)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-indigo-200" />
                    <span>மாணவர்களுக்கு அனுப்புக (Send Link)</span>
                  </button>

                  {/* Secondary Buttons Row */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    
                    {/* Inspect Questions */}
                    <button
                      type="button"
                      onClick={() => handleOpenPaperExplorer(paper.id)}
                      title="வினாக்களைப் பார் (View prefilled questions)"
                      className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>வினாக்கள்</span>
                    </button>

                    {/* Preview / Take as Student */}
                    <button
                      type="button"
                      onClick={() => onSelectQuizForPreview(paper.id)}
                      title="தேர்வை முன்னோட்டம் காண்க (Take Test)"
                      className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>தேர்வு செய்</span>
                    </button>

                    {/* Import to Builder */}
                    <button
                      type="button"
                      onClick={() => handleLoadPaperToBuilder(paper.id)}
                      title="வினாத்தாள் திருத்துநரில் ஏற்று (Import into Builder to edit)"
                      className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>திருத்து</span>
                    </button>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONFIRMATION & DEPLOYMENT SETTINGS MODAL */}
      {/* ------------------------------------------------------------- */}
      {deployModalPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    மாணவர்களுக்கு தேர்வாக அனுப்பு (Deploy Unit Test)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {deployModalPaper.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeployModalPaper(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                இந்த வினாத்தாளை வெளியிட்டதும், மாணவர்கள் தங்கள் தேர்வு எண் கொண்டு உடனடியாக ஆன்லைன் தேர்வு எழுத முடியும். நேரடி தேர்வு இணைப்பு (Direct Link) மற்றும் QR கோட் உருவாக்கப்படும்.
              </div>

              {/* Duration & Pass Percentage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    தேர்வு கால அளவு (MINUTES)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={300}
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
                        setDeployDuration(90);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    தேர்ச்சி சதவீதம் (PASS %)
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
                        setDeployPassPercentage(50);
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
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 cursor-pointer"
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
                      max={deployModalPaper.questionCount}
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
                          setDeployQuestionsCount(deployModalPaper?.questionCount || 90);
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
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 cursor-pointer"
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
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 cursor-pointer"
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
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    முழுத்திரை பாதுகாப்பு &amp; Tab Switch கண்காணிப்பு (Anti-Cheat)
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeployModalPaper(null)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-colors"
              >
                ரத்து செய் (Cancel)
              </button>
              <button
                type="button"
                onClick={handleExecuteDeploy}
                disabled={isDeploying}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{isDeploying ? 'வெளியிடப்படுகிறது...' : 'மாணவர்களுக்கு வெளியிடு (Deploy Test)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: SHARE & SEND PAPER TO STUDENTS */}
      {/* ------------------------------------------------------------- */}
      {shareModalPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 relative overflow-hidden">
            
            {/* Top Close */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    மாணவர்களுக்கு வினாத்தாள் அனுப்புக
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Direct Exam Link &amp; WhatsApp Distribution
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShareModalPaper(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Paper Info Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                  {shareModalPaper.id}
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{shareModalPaper.questionCount} வினாக்கள் தயார்</span>
                </span>
              </div>
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {shareModalPaper.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                தேர்வு காலம்: {shareModalPaper.durationMinutes} நிமிடங்கள் | மதிப்பெண்கள்: {shareModalPaper.totalMarks}
              </p>
            </div>

            {/* Link Box with Copy Button */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                மாணவர் தேர்வு நேரடி இணைப்பு (Direct Student URL)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/?quiz=${shareModalPaper.id}`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopyShareLink(shareModalPaper.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all flex-shrink-0 cursor-pointer ${
                    copiedLink
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                  }`}
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'நகலெடுக்கப்பட்டது!' : 'நகலெடு (Copy)'}</span>
                </button>
              </div>
            </div>

            {/* Actions: WhatsApp & Direct Test */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => handleWhatsAppShare(shareModalPaper)}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp மூலம் மாணவர் குழுவிற்கு அனுப்புக (Share on WhatsApp)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareModalPaper(null);
                  onSelectQuizForPreview(shareModalPaper.id);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>ஆசிரியராக தேர்வை முன்னோட்டம் செய்க (Preview Exam as Student)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: FULL PRE-FILLED QUESTIONS EXPLORER */}
      {/* ------------------------------------------------------------- */}
      {selectedPaperDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-mono text-xs font-bold">
                    {selectedPaperDetails.id}
                  </span>
                  <span className="text-xs text-slate-300">
                    {selectedPaperDetails.questions.length} Pre-filled Questions
                  </span>
                </div>
                <h3 className="text-base sm:text-xl font-black">
                  {selectedPaperDetails.title}
                </h3>
              </div>

              {/* Language Toggle & Close */}
              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setLanguageMode('ta')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      languageMode === 'ta'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    தமிழ்
                  </button>
                  <button
                    onClick={() => setLanguageMode('en')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      languageMode === 'en'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                </div>

                <button
                  onClick={() => setSelectedPaperDetails(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Search & Subject Toolbar */}
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              
              {/* Subject Tabs */}
              <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setSubjectFilterInModal('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    subjectFilterInModal === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  அனைத்து வினாக்கள் ({selectedPaperDetails.questions.length})
                </button>

                {(['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'] as NMMS_Subject[]).map((sub) => {
                  const count = selectedPaperDetails.questions.filter((q) => q.subject === sub).length;
                  if (count === 0) return null;
                  const meta = SUBJECT_METADATA[sub];
                  return (
                    <button
                      key={sub}
                      onClick={() => setSubjectFilterInModal(sub)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        subjectFilterInModal === sub
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      {meta.shortName} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="வினா அல்லது விடையைத் தேடுக..."
                  value={questionSearchInModal}
                  onChange={(e) => setQuestionSearchInModal(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Modal Questions List Content (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {(() => {
                const filtered = selectedPaperDetails.questions.filter((q, index) => {
                  if (subjectFilterInModal !== 'ALL' && q.subject !== subjectFilterInModal) return false;
                  if (questionSearchInModal.trim()) {
                    const term = questionSearchInModal.toLowerCase();
                    const textMatch = q.questionText.toLowerCase().includes(term);
                    const textEnMatch = q.question_en?.toLowerCase().includes(term);
                    const optMatch = q.options.some((o) => o.text.toLowerCase().includes(term));
                    const numMatch = String(index + 1) === term.trim();
                    return textMatch || textEnMatch || optMatch || numMatch;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-slate-500">
                      தேடல் முடிவுகள் எதுவும் கிடைக்கவில்லை.
                    </div>
                  );
                }

                return filtered.map((q, idx) => {
                  const subjectMeta = SUBJECT_METADATA[q.subject] || SUBJECT_METADATA.MAT;
                  const displayQuestionText = languageMode === 'en' && q.question_en ? q.question_en : q.questionText;
                  const displayExplanation = languageMode === 'en' && q.explanation_en ? q.explanation_en : q.explanation;

                  return (
                    <div
                      key={q.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
                    >
                      {/* Question Top Meta */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            வினா #{idx + 1}
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${subjectMeta.badgeBg}`}>
                            {subjectMeta.shortName}
                          </span>
                          {q.topic && (
                            <span className="text-[11px] text-slate-500 hidden sm:inline">
                              • {q.topic}
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                          விடை: Option {q.correctOption}
                        </span>
                      </div>

                      {/* Question Text */}
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                        <MathText text={displayQuestionText} />
                      </div>

                      {/* Question Image if present */}
                      {q.questionImage && (
                        <div className="max-w-md rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-800">
                          <img
                            src={q.questionImage}
                            alt="Question Diagram"
                            className="w-full h-auto object-contain max-h-56"
                            onError={(e) => {
                              // Hide gracefully if image file not found
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* 4 Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = opt.id === q.correctOption;
                          const optText = languageMode === 'en' && q.options_en?.[optIdx] ? q.options_en[optIdx] : opt.text;

                          return (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-xl border text-xs flex items-center space-x-2.5 ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-bold'
                                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] flex-shrink-0 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {opt.id}
                              </div>
                              <span className="flex-1">
                                <MathText text={optText} />
                              </span>
                              {isCorrect && (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      {displayExplanation && (
                        <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                          <span className="font-bold flex items-center space-x-1 text-amber-800 dark:text-amber-300">
                            <Sparkles className="w-3 h-3" />
                            <span>விளக்கம் (Step-by-step Solution):</span>
                          </span>
                          <div className="leading-relaxed">
                            <MathText text={displayExplanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                மொத்தம் {selectedPaperDetails.questions.length} வினாக்கள் சரிபார்க்கப்பட்டு உள்ளீடு செய்யப்பட்டுள்ளன.
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const currentId = selectedPaperDetails.id;
                    setSelectedPaperDetails(null);
                    onSelectQuizForPreview(currentId);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>தேர்வை எழுதுக (Test as Student)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const p = papers.find((x) => x.id === selectedPaperDetails.id);
                    if (p) {
                      setSelectedPaperDetails(null);
                      handleOpenDeployModal(p);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>மாணவர்களுக்கு அனுப்புக</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
