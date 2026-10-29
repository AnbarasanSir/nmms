import { Env, jsonResponse, errorResponse } from '../../helpers';
import { INITIAL_QUIZZES } from '../../../src/data/mockQuizzes';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;

  if (!db) {
    const fallbackSummary = INITIAL_QUIZZES.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      durationMinutes: q.durationMinutes,
      totalMarks: q.questions.reduce((sum, item) => sum + (item.marks || 1), 0),
      questionCount: q.questions.length,
      passPercentage: q.passPercentage,
      status: q.status,
      createdAt: q.createdAt,
      attemptsCount: 0,
      subjects: Array.from(new Set(q.questions.map((item) => item.subject))),
    }));
    return jsonResponse(fallbackSummary);
  }

  try {
    // 1. Ensure initial quiz is seeded if DB is empty
    const countRes = await db.prepare('SELECT count(*) as count FROM quizzes').first<{ count: number }>();
    if (!countRes || countRes.count === 0) {
      for (const q of INITIAL_QUIZZES) {
        await db
          .prepare(`
            INSERT INTO quizzes (
              id, title, description, duration_minutes, total_marks, pass_percentage,
              shuffle_questions, shuffle_options, enable_question_limit, questions_per_attempt,
              enable_anti_cheat, show_results_immediately, allow_review, status, questions, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            q.id,
            q.title,
            q.description || '',
            q.durationMinutes,
            q.totalMarks,
            q.passPercentage,
            q.shuffleQuestions ? 1 : 0,
            q.shuffleOptions ? 1 : 0,
            q.enableQuestionLimit ? 1 : 0,
            q.questionsPerAttempt || null,
            q.enableAntiCheat ? 1 : 0,
            q.showResultsImmediately ? 1 : 0,
            q.allowReview ? 1 : 0,
            q.status,
            JSON.stringify(q.questions),
            q.createdAt
          )
          .run();
      }
    }

    const quizzesRows = await db.prepare('SELECT * FROM quizzes ORDER BY created_at DESC').all();
    const attemptsCounts = await db.prepare('SELECT quiz_id, count(*) as count FROM attempts GROUP BY quiz_id').all();
    const attemptsMap = new Map<string, number>();
    (attemptsCounts.results || []).forEach((row: any) => {
      attemptsMap.set(row.quiz_id, row.count);
    });

    const summary = (quizzesRows.results || []).map((row: any) => {
      const questions: any[] = JSON.parse(row.questions || '[]');
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        durationMinutes: row.duration_minutes,
        totalMarks: row.total_marks || questions.reduce((sum, item) => sum + (item.marks || 1), 0),
        questionCount: questions.length,
        passPercentage: row.pass_percentage,
        status: row.status,
        createdAt: row.created_at,
        attemptsCount: attemptsMap.get(row.id) || 0,
        subjects: Array.from(new Set(questions.map((item) => item.subject))),
      };
    });

    return jsonResponse(summary);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data: any = await context.request.json().catch(() => ({}));
    if (!data.title || !data.questions || !Array.isArray(data.questions)) {
      return errorResponse('Quiz title and valid questions array are required', 400);
    }

    const quizId = data.id || `nmms-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const totalMarks = data.questions.reduce((acc: number, curr: any) => acc + (curr.marks || 1), 0);

    const formattedQuestions = data.questions.map((q: any, idx: number) => ({
      id: q.id || `q-${idx + 1}-${Date.now().toString(36)}`,
      subject: q.subject || 'MAT',
      topic: q.topic || 'General',
      questionText: q.questionText,
      questionImage: q.questionImage,
      options: q.options && q.options.length === 4 ? q.options : [
        { id: 'A', text: q.options?.[0]?.text || 'Option A' },
        { id: 'B', text: q.options?.[1]?.text || 'Option B' },
        { id: 'C', text: q.options?.[2]?.text || 'Option C' },
        { id: 'D', text: q.options?.[3]?.text || 'Option D' },
      ],
      correctOption: q.correctOption || 'A',
      explanation: q.explanation || '',
      marks: Number(q.marks) || 1,
      negativeMarks: Number(q.negativeMarks) || 0,
      question_en: q.question_en,
      options_en: q.options_en,
      explanation_en: q.explanation_en,
    }));

    const db = context.env.DB;
    if (db) {
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
            show_results_immediately = excluded.show_results_immediately,
            allow_review = excluded.allow_review,
            status = excluded.status,
            questions = excluded.questions,
            updated_at = datetime('now')
        `)
        .bind(
          quizId,
          data.title,
          data.description || '',
          Number(data.durationMinutes) || 90,
          totalMarks,
          Number(data.passPercentage) || 40,
          data.shuffleQuestions ? 1 : 0,
          data.shuffleOptions ? 1 : 0,
          data.enableQuestionLimit ? 1 : 0,
          data.enableQuestionLimit ? (Number(data.questionsPerAttempt) || 10) : null,
          data.enableAntiCheat !== false ? 1 : 0,
          data.showResultsImmediately !== false ? 1 : 0,
          data.allowReview !== false ? 1 : 0,
          data.status || 'active',
          JSON.stringify(formattedQuestions)
        )
        .run();
    }

    return jsonResponse({
      success: true,
      quiz: {
        id: quizId,
        title: data.title,
        description: data.description,
        durationMinutes: Number(data.durationMinutes) || 90,
        totalMarks,
        passPercentage: Number(data.passPercentage) || 40,
        questions: formattedQuestions,
      },
    }, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

