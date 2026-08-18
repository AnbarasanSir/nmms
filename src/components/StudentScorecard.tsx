import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { toBlob, toPng } from 'html-to-image';
import { StudentAttempt, Question, NMMS_Subject, SUBJECT_METADATA } from '../types';
import { formatSecondsToTime, formatDateTime } from '../utils/formatters';
import { MathText } from './MathText';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Clock, 
  Share2, 
  RotateCcw, 
  Sparkles, 
  CheckCircle,
  HelpCircle,
  ImageIcon,
  Download,
  Loader2
} from 'lucide-react';

interface StudentScorecardProps {
  attempt: StudentAttempt;
  questions: Question[];
  quizTitle?: string;
  onRetake: () => void;
  onGoHome: () => void;
}

export const StudentScorecard: React.FC<StudentScorecardProps> = ({
  attempt,
  questions,
  quizTitle,
  onRetake,
  onGoHome,
}) => {
  const { score, studentName, examNumber, submittedAt, timeTakenSeconds, tabSwitchCount } = attempt;
  const displayExamTitle = quizTitle || 'NMMS Full Model Examination (MAT & SAT)';

  // Filter state for reviewing answers
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong' | 'unattempted' | NMMS_Subject>('all');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [shareSuccessMessage, setShareSuccessMessage] = useState<string | null>(null);

  const bannerCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (score.isEligible) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        console.log('Confetti failed gracefully', e);
      }
    }
  }, [score.isEligible]);

  const handleShareAsImage = async () => {
    if (!bannerCardRef.current || isGeneratingImage) return;

    try {
      setIsGeneratingImage(true);
      setShareSuccessMessage(null);

      const renderOptions = {
        cacheBust: true,
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#090d16',
        skipFonts: true,
        fontEmbedCSS: '',
        filter: (node: HTMLElement) => {
          // Exclude buttons or action triggers from the rendered scorecard image
          if (node?.id === 'btn-share-scorecard-whatsapp' || node?.classList?.contains('print:hidden')) {
            return false;
          }
          return true;
        },
      };

      // Generate PNG blob from the scorecard banner card
      const blob = await toBlob(bannerCardRef.current, renderOptions);

      if (!blob) {
        throw new Error('Failed to generate image');
      }

      const fileName = `NMMS_Scorecard_${examNumber || 'Result'}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Check if Web Share API with files is supported (works on Android WhatsApp, iOS, modern browsers)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${displayExamTitle} - மதிப்பெண் அட்டை (${studentName})`,
          text: `👤 ${studentName}\n🎯 ${score.totalObtained}/${score.totalPossible} (${score.percentage}%)}`,
        });
        setShareSuccessMessage('வெற்றிகரமாக பகிரப்பட்டது!');
        setTimeout(() => setShareSuccessMessage(null), 4000);
      } else {
        // Fallback: Download image and open WhatsApp with formatted message
        const dataUrl = await toPng(bannerCardRef.current, renderOptions);
        const downloadLink = document.createElement('a');
        downloadLink.download = fileName;
        downloadLink.href = dataUrl;
        downloadLink.click();

        // Also open WhatsApp text share
        const lines = [
          `📊 *${displayExamTitle}*`,
          `*NMMS தேர்வு முடிவு விவரம்*`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `👤 *மாணவர் பெயர்:* ${studentName}`,
          `🆔 *தேர்வு எண்:* ${examNumber}`,
          `🎯 *பெற்ற மதிப்பெண்:* ${score.totalObtained} / ${score.totalPossible} (${score.percentage}%)`,
          `⏱️ *எடுத்துக்கொண்ட நேரம்:* ${formatSecondsToTime(timeTakenSeconds)}`,
          `🏆 *தேர்வு நிலை:* ${score.isEligible ? 'தகுதி பெற்றார் (தேர்ச்சி)' : 'தேர்வு நிறைவுற்றது'}`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `தேர்வு சமர்ப்பிக்கப்பட்ட நேரம்: ${formatDateTime(submittedAt)}`
        ];
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(lines.join('\n'))}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');

        setShareSuccessMessage('மதிப்பெண் அட்டை பதிவிறக்கம் செய்யப்பட்டது & வாட்ஸ்அப் திறக்கப்பட்டது!');
        setTimeout(() => setShareSuccessMessage(null), 5000);
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      // If user cancelled share sheet, don't show error
      if (error instanceof Error && error.name !== 'AbortError') {
        alert('Could not generate image directly. You can take a screenshot or share text.');
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Filter questions for review
  const filteredQuestions = questions.filter((q) => {
    const chosen = attempt.answers[q.id];
    if (reviewFilter === 'all') return true;
    if (reviewFilter === 'wrong') return chosen && chosen !== q.correctOption;
    if (reviewFilter === 'unattempted') return !chosen;
    return q.subject === reviewFilter;
  });

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-3 sm:px-6 space-y-6 sm:space-y-8 print:p-0 print:m-0">
      {/* Top Banner & Status */}
      <div 
        ref={bannerCardRef}
        className={`rounded-2xl p-4 sm:p-6 md:p-8 text-white shadow-xl border relative overflow-hidden ${
          score.isEligible
            ? 'bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 border-emerald-500/30'
            : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-slate-700'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5 sm:mb-3">
              <div className="inline-flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider bg-white/10 backdrop-blur-sm border border-white/20">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Official NMMS Scorecard</span>
              </div>
              <span className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-extrabold uppercase tracking-wider bg-emerald-500/90 text-white shadow-sm border border-emerald-400/40">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Exam Status: OVER</span>
              </span>
            </div>

            {/* Exam Name Title */}
            <div className="mb-2">
              <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-indigo-300">
                தேர்வின் பெயர் (Exam Name)
              </div>
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-white text-indigo-100 flex items-center gap-2 mt-0.5">
                <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0" />
                <span>{displayExamTitle}</span>
              </h2>
            </div>

            <div className="pt-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white flex flex-wrap items-baseline gap-1.5">
                <span>{studentName}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-1.5">
                <span>தேர்வு எண் (Exam No): <strong className="font-mono text-white text-sm">{examNumber}</strong></span>
              </div>
            </div>
          </div>

          {/* Big Score Box */}
          <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl border border-white/20 flex-shrink-0">
            <div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
                Total Score
              </div>
              <div className="text-2xl sm:text-4xl font-black text-white font-mono flex items-baseline space-x-1">
                <span>{score.totalObtained}</span>
                <span className="text-sm sm:text-lg text-slate-300">/ {score.totalPossible}</span>
              </div>
              <div className="text-xs font-bold text-indigo-200 mt-0.5">
                {score.percentage}% Aggregate
              </div>
            </div>

            <div className="border-l border-white/20 pl-3 sm:pl-4">
              <span
                className={`inline-block px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold ${
                  score.isEligible
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-amber-500 text-slate-950 shadow-sm'
                }`}
              >
                {score.isEligible ? 'QUALIFIED FOR MERIT' : 'NEEDS PRACTICE'}
              </span>
              <p className="text-[10px] text-slate-300 mt-1 max-w-[120px]">
                {score.isEligible ? 'Passed qualifying cutoff' : 'Below cutoff score'}
              </p>
            </div>
          </div>
        </div>

        {/* Attempt Metadata Strip */}
        <div className="mt-5 sm:mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Time: <strong>{formatSecondsToTime(timeTakenSeconds)}</strong></span>
            </span>
            <span>•</span>
            <span>Submitted: <strong>{formatDateTime(submittedAt)}</strong></span>
          </div>

          {tabSwitchCount > 0 && (
            <span className="text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/40 text-[11px]">
              ⚠️ {tabSwitchCount} Tab Switch Logs Recorded
            </span>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2 print:hidden w-full sm:w-auto pt-2 sm:pt-0">
            {shareSuccessMessage && (
              <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40 animate-fade-in">
                ✓ {shareSuccessMessage}
              </span>
            )}
            <button
              id="btn-share-scorecard-whatsapp"
              onClick={handleShareAsImage}
              disabled={isGeneratingImage}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-75 text-white text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-950/40 border border-emerald-400/40 cursor-pointer"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                  <span>Creating Image...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 text-emerald-200" />
                  <span>Share on Whatsapp</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Answer Key & Step-by-Step Explanations */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>Question Review &amp; Answer Solutions</span>
          </h2>

          {/* Filter Pills with Horizontal Scroll on Mobile */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto pb-1.5 text-xs no-scrollbar flex-nowrap">
            <button
              onClick={() => setReviewFilter('all')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                reviewFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              All ({questions.length})
            </button>
            <button
              onClick={() => setReviewFilter('wrong')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                reviewFilter === 'wrong'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Mistakes Only
            </button>
            <button
              onClick={() => setReviewFilter('unattempted')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                reviewFilter === 'unattempted'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Skipped
            </button>
            {(['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'] as NMMS_Subject[]).map((sub) => (
              <button
                key={sub}
                onClick={() => setReviewFilter(sub)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                  reviewFilter === sub
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {SUBJECT_METADATA[sub].shortName}
              </button>
            ))}
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            const chosen = attempt.answers[q.id];
            const isCorrect = chosen === q.correctOption;
            const isSkipped = !chosen;

            return (
              <div
                key={q.id}
                className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all ${
                  isCorrect
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20'
                    : isSkipped
                    ? 'border-slate-200 dark:border-slate-800'
                    : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20'
                }`}
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${SUBJECT_METADATA[q.subject]?.badgeBg}`}>
                      {SUBJECT_METADATA[q.subject]?.shortName}
                    </span>
                    {q.topic && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden xs:inline truncate">
                        • {q.topic}
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isCorrect && (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Correct (+1)</span>
                      </span>
                    )}
                    {!isCorrect && !isSkipped && (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-800">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Incorrect (0)</span>
                      </span>
                    )}
                    {isSkipped && (
                      <span className="inline-flex items-center space-x-1 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                        <MinusCircle className="w-3.5 h-3.5" />
                        <span>Not Attempted</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Statement */}
                <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mb-3 sm:mb-4">
                  <MathText text={q.questionText} />
                </div>

                {q.questionImage && (
                  <div className="mb-3 sm:mb-4 max-w-md rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
                    <img
                      src={q.questionImage}
                      alt="Question Diagram"
                      className="w-full h-auto object-contain max-h-56 rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Options Review */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 sm:mb-4">
                  {q.options.map((opt) => {
                    const isCandidateChoice = chosen === opt.id;
                    const isRightAnswer = q.correctOption === opt.id;

                    let optStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300';
                    if (isRightAnswer) {
                      optStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold';
                    } else if (isCandidateChoice && !isRightAnswer) {
                      optStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 line-through';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 sm:p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${optStyle}`}
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] bg-white/80 dark:bg-slate-700 flex-shrink-0">
                            {opt.id}
                          </span>
                          <span className="break-words flex-1"><MathText text={opt.text} /></span>
                        </div>

                        {isRightAnswer && (
                          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                            Correct
                          </span>
                        )}
                        {isCandidateChoice && !isRightAnswer && (
                          <span className="text-[10px] uppercase font-bold text-rose-500 flex-shrink-0">
                            Your Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200">
                    <span className="font-bold text-indigo-700 dark:text-indigo-400 block mb-0.5">
                      💡 Explanation / Solution:
                    </span>
                    <div className="leading-relaxed"><MathText text={q.explanation} /></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Retry Button Only */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-center gap-3 print:hidden">
        <button
          id="btn-scorecard-retry-exam"
          onClick={onRetake}
          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm sm:text-base flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25 active:scale-[0.99] transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-indigo-200" />
          <span>மீண்டும் தேர்வு எழுதுக (Retry Exam)</span>
        </button>
      </div>
    </div>
  );
};
