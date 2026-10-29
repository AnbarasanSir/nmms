import { Env, jsonResponse, errorResponse } from '../../helpers';
import { SUBJECT_CONFIGS, UNIT_METADATA_MAP } from '../../subjectMetadata';
import { NMMS_Subject, Question, Quiz } from '../../../src/types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  if (!db) {
    return errorResponse('Database connection required', 500);
  }

  try {
    const body: any = await context.request.json().catch(() => ({}));
    const {
      subject,
      unitNum,
      customTitle,
      durationMinutes,
      passPercentage,
      shuffleQuestions,
      shuffleOptions,
      enableQuestionLimit,
      questionsPerAttempt,
      enableAntiCheat,
    } = body;

    const subKey = (subject || '').toUpperCase() as NMMS_Subject;
    const num = parseInt(unitNum, 10);

    if (!SUBJECT_CONFIGS[subKey] || isNaN(num)) {
      return errorResponse('Valid subject and unit number are required', 400);
    }

    const key = `${subKey}_${num}`;
    let questions: Question[] = [];

    const overrideRow = await db.prepare('SELECT questions FROM unit_overrides WHERE key = ?').bind(key).first<{ questions: string }>();
    if (overrideRow?.questions) {
      questions = JSON.parse(overrideRow.questions);
    } else {
      const bankRow = await db.prepare('SELECT questions FROM unit_bank WHERE key = ?').bind(key).first<{ questions: string }>();
      if (bankRow?.questions) {
        questions = JSON.parse(bankRow.questions);
      }
    }

    const meta = UNIT_METADATA_MAP[subKey]?.[num];
    const unitId = `${SUBJECT_CONFIGS[subKey].prefix}-${num}`;
    const titleTa = meta?.titleTa || `பகுதி ${num}`;
    const titleEn = meta?.titleEn || `Unit ${num}`;

    const title = customTitle || `${SUBJECT_CONFIGS[subKey].nameTa} - அலகு ${num}: ${titleTa} (${titleEn})`;
    const description = meta?.description || `NMMS ${SUBJECT_CONFIGS[subKey].nameTa} தேர்வுக்கான அலகு ${num} மாதிரித் தேர்வு.`;
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    const quiz: Quiz = {
      id: unitId,
      title,
      description,
      durationMinutes: durationMinutes ? Number(durationMinutes) : Math.min(60, Math.max(15, Math.ceil(questions.length * 1.5))),
      totalMarks,
      passPercentage: passPercentage ? Number(passPercentage) : 40,
      enableAntiCheat: enableAntiCheat !== false,
      shuffleQuestions: shuffleQuestions !== false,
      shuffleOptions: shuffleOptions !== false,
      enableQuestionLimit: Boolean(enableQuestionLimit),
      questionsPerAttempt: questionsPerAttempt ? Number(questionsPerAttempt) : (enableQuestionLimit ? Math.min(20, questions.length) : undefined),
      showResultsImmediately: true,
      allowReview: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      questions,
    };

    await db
      .prepare(`
        INSERT INTO quizzes (
          id, title, description, duration_minutes, total_marks, pass_percentage,
          shuffle_questions, shuffle_options, enable_question_limit, questions_per_attempt,
          enable_anti_cheat, show_results_immediately, allow_review, status, questions,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          duration_minutes = excluded.duration_minutes,
          total_marks = excluded.total_marks,
          pass_percentage = excluded.pass_percentage,
          shuffle_questions = excluded.shuffle_questions,
          shuffle_options = excluded.shuffle_options,
          enable_question_limit = excluded.enable_question_limit,
          questions_per_attempt = excluded.questions_per_attempt,
          enable_anti_cheat = excluded.enable_anti_cheat,
          status = excluded.status,
          questions = excluded.questions,
          updated_at = datetime('now')
      `)
      .bind(
        quiz.id,
        quiz.title,
        quiz.description,
        quiz.durationMinutes,
        quiz.totalMarks,
        quiz.passPercentage,
        quiz.shuffleQuestions ? 1 : 0,
        quiz.shuffleOptions ? 1 : 0,
        quiz.enableQuestionLimit ? 1 : 0,
        quiz.questionsPerAttempt || null,
        quiz.enableAntiCheat ? 1 : 0,
        quiz.showResultsImmediately ? 1 : 0,
        quiz.allowReview ? 1 : 0,
        quiz.status,
        JSON.stringify(quiz.questions)
      )
      .run();

    return jsonResponse({
      success: true,
      message: `"${quiz.title}" தேர்வாக மாணவர்களுக்கு வெற்றிகரமாக வெளியிடப்பட்டது! (Unit test deployed to students)`,
      quiz,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

