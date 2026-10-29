import { Question, StudentAttempt, StudentScoreResult, NMMS_Subject, Quiz } from '../src/types';

export interface Env {
  DB: D1Database;
  GEMINI_API_KEY?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SECURITY_PIN?: string;
}

export function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };
}

export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message, success: false }, status);
}

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function prepareQuestionsForStudent(quiz: Quiz): Question[] {
  let pool = [...quiz.questions];

  if (quiz.enableQuestionLimit && quiz.questionsPerAttempt && quiz.questionsPerAttempt > 0 && quiz.questionsPerAttempt < pool.length) {
    pool = shuffleArray(pool).slice(0, quiz.questionsPerAttempt);
  } else if (quiz.shuffleQuestions) {
    pool = shuffleArray(pool);
  }

  if (quiz.shuffleOptions) {
    const optionLetters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    pool = pool.map((q) => {
      if (!q.options || q.options.length !== 4) return q;

      const paired = q.options.map((opt, idx) => ({
        originalId: opt.id,
        text: opt.text,
        image: opt.image,
        text_en: q.options_en ? q.options_en[idx] : undefined,
      }));

      const shuffledPaired = shuffleArray(paired);

      let newCorrectLetter: 'A' | 'B' | 'C' | 'D' = 'A';
      const newOptions = shuffledPaired.map((item, idx) => {
        const letter = optionLetters[idx];
        if (item.originalId === q.correctOption) {
          newCorrectLetter = letter;
        }
        return {
          id: letter,
          text: item.text,
          ...(item.image ? { image: item.image } : {}),
        };
      });

      const newOptionsEn = q.options_en
        ? shuffledPaired.map((item) => item.text_en || '')
        : undefined;

      return {
        ...q,
        options: newOptions,
        correctOption: newCorrectLetter,
        options_en: newOptionsEn,
      };
    });
  }

  return pool;
}

export function calculateScore(
  quiz: Quiz,
  answers: Record<string, 'A' | 'B' | 'C' | 'D' | null>,
  activeQuestions?: Question[]
): StudentScoreResult {
  const questionsToGrade = activeQuestions && activeQuestions.length > 0 ? activeQuestions : quiz.questions;
  let totalObtained = 0;
  let totalPossible = 0;
  let matScore = 0;
  let satScore = 0;

  const subjectBreakdown: StudentScoreResult['subjectBreakdown'] = {
    MAT: { obtained: 0, possible: 0, accuracy: 0, correctCount: 0, wrongCount: 0, unattemptedCount: 0 },
    SAT_MATHS: { obtained: 0, possible: 0, accuracy: 0, correctCount: 0, wrongCount: 0, unattemptedCount: 0 },
    SAT_SCIENCE: { obtained: 0, possible: 0, accuracy: 0, correctCount: 0, wrongCount: 0, unattemptedCount: 0 },
    SAT_SOCIAL: { obtained: 0, possible: 0, accuracy: 0, correctCount: 0, wrongCount: 0, unattemptedCount: 0 },
  };

  questionsToGrade.forEach((q) => {
    const qMarks = q.marks || 1;
    const negMarks = q.negativeMarks || 0;
    const chosen = answers[q.id];
    const sub = (q.subject in subjectBreakdown ? q.subject : 'MAT') as NMMS_Subject;

    subjectBreakdown[sub].possible += qMarks;
    totalPossible += qMarks;

    if (!chosen) {
      subjectBreakdown[sub].unattemptedCount += 1;
    } else if (chosen === q.correctOption) {
      subjectBreakdown[sub].correctCount += 1;
      subjectBreakdown[sub].obtained += qMarks;
      totalObtained += qMarks;
      if (sub === 'MAT') {
        matScore += qMarks;
      } else {
        satScore += qMarks;
      }
    } else {
      subjectBreakdown[sub].wrongCount += 1;
      if (negMarks > 0) {
        subjectBreakdown[sub].obtained = Math.max(0, subjectBreakdown[sub].obtained - negMarks);
        totalObtained = Math.max(0, totalObtained - negMarks);
      }
    }
  });

  (['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'] as NMMS_Subject[]).forEach((sub) => {
    const b = subjectBreakdown[sub];
    b.accuracy = b.possible > 0 ? Math.round((b.obtained / b.possible) * 1000) / 10 : 0;
  });

  const percentage = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 10000) / 100 : 0;
  const cutoff = quiz.passPercentage || 40;
  const isEligible = percentage >= cutoff;

  const subjectEntries: [string, number][] = [
    ['MAT (Mental Ability)', subjectBreakdown.MAT.accuracy],
    ['SAT Mathematics', subjectBreakdown.SAT_MATHS.accuracy],
    ['SAT Science', subjectBreakdown.SAT_SCIENCE.accuracy],
    ['SAT Social Science', subjectBreakdown.SAT_SOCIAL.accuracy],
  ];
  subjectEntries.sort((a, b) => b[1] - a[1]);

  const strengthSubject = `${subjectEntries[0][0]} (${subjectEntries[0][1]}%)`;
  const weaknessSubject = `${subjectEntries[subjectEntries.length - 1][0]} (${subjectEntries[subjectEntries.length - 1][1]}%)`;

  const aiDiagnosticInsights: string[] = [];
  if (percentage >= 80) {
    aiDiagnosticInsights.push('Outstanding performance! High likelihood of securing state merit rank in NMMS.');
  } else if (percentage >= 40) {
    aiDiagnosticInsights.push('Qualified standard NMMS scholarship cut-off. Focus on target subject areas to boost merit ranking.');
  } else {
    aiDiagnosticInsights.push('Score below 40% qualifying threshold. Systematic revision of MAT patterns and NCERT/State Board Class 7-8 fundamentals recommended.');
  }

  if (subjectBreakdown.MAT.accuracy < 50) {
    aiDiagnosticInsights.push('Practice daily MAT puzzles: Number series, alphabet coding, and direction problems.');
  }
  if (subjectBreakdown.SAT_MATHS.accuracy < 50) {
    aiDiagnosticInsights.push('Strengthen Class 8 Mathematics: Linear equations, mensuration formulas, and exponents.');
  }
  if (subjectBreakdown.SAT_SCIENCE.accuracy < 50) {
    aiDiagnosticInsights.push('Review Science textbook chapters: Cell structure, forces, light reflection, and microorganisms.');
  }
  if (subjectBreakdown.SAT_SOCIAL.accuracy < 50) {
    aiDiagnosticInsights.push('Revisit Social Science: Key modern Indian history timelines, Indian Constitution, and resource maps.');
  }

  return {
    totalObtained,
    totalPossible,
    percentage,
    isEligible,
    matScore,
    satScore,
    subjectBreakdown,
    strengthSubject,
    weaknessSubject,
    aiDiagnosticInsights,
  };
}

export function repairMangledLatex(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let text = input;
  text = text.replace(/[\x0c\f\u21e1\u2191]\s*rac/gi, '\\frac');
  text = text.replace(/(^|[\s=+\-*\/_^({\[,])rac\{/gi, '$1\\frac{');
  text = text.replace(/⇡rac/gi, '\\frac');
  text = text.replace(/↑rac/gi, '\\frac');

  text = text.replace(/[\x09\t]\s*ext\{/gi, '\\text{');
  text = text.replace(/(^|[\s0-9a-zA-Z\)\}])ext\{/gi, '$1\\text{');
  text = text.replace(/[\x09\t]\s*imes/gi, '\\times');
  text = text.replace(/(^|[\s0-9a-zA-Z\)\}])imes\b/gi, '$1\\times');
  text = text.replace(/[\x09\t]\s*heta/gi, '\\theta');
  text = text.replace(/[\x09\t]\s*riangle/gi, '\\triangle');
  text = text.replace(/[\x09\t]\s*an\b/gi, '\\tan');

  text = text.replace(/[\x0d\r]\s*ightarrow/gi, '\\rightarrow');
  text = text.replace(/(^|[\s0-9a-zA-Z\)\}])ightarrow/gi, '$1\\rightarrow');
  text = text.replace(/[\x0d\r]\s*eftarrow/gi, '\\leftarrow');
  text = text.replace(/(^|[\s0-9a-zA-Z\)\}])eftarrow/gi, '$1\\leftarrow');
  text = text.replace(/[\x0d\r]\s*ight\b/gi, '\\right');

  text = text.replace(/[\x08]\s*eta\b/gi, '\\beta');
  text = text.replace(/[\x08]\s*ar\{/gi, '\\bar{');
  text = text.replace(/[\x08]\s*ox\{/gi, '\\box{');

  text = text.replace(/[\x0a\n]\s*eq\b/gi, ' \\neq ');
  text = text.replace(/(^|[\s=+\-*\/_^({\[,])sqrt\{/gi, '$1\\sqrt{');

  return text;
}

