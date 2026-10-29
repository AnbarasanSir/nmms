import { Env, jsonResponse, errorResponse, prepareQuestionsForStudent } from '../../../helpers';
import { Quiz } from '../../../../src/types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  const url = new URL(context.request.url);
  const role = url.searchParams.get('role');
  const db = context.env.DB;

  if (!id || !db) {
    return errorResponse('Valid Quiz ID and Database connection required', 400);
  }

  try {
    const row = await db.prepare('SELECT * FROM quizzes WHERE id = ?').bind(id).first<any>();

    if (!row) {
      return errorResponse('Quiz not found', 404);
    }

    const quiz: Quiz = {
      id: row.id,
      title: row.title,
      description: row.description,
      durationMinutes: row.duration_minutes,
      totalMarks: row.total_marks,
      passPercentage: row.pass_percentage,
      shuffleQuestions: Boolean(row.shuffle_questions),
      shuffleOptions: Boolean(row.shuffle_options),
      enableQuestionLimit: Boolean(row.enable_question_limit),
      questionsPerAttempt: row.questions_per_attempt || undefined,
      enableAntiCheat: Boolean(row.enable_anti_cheat),
      showResultsImmediately: Boolean(row.show_results_immediately),
      allowReview: Boolean(row.allow_review),
      status: row.status,
      createdAt: row.created_at,
      questions: JSON.parse(row.questions || '[]'),
    };

    if (role === 'student') {
      const studentQuestions = prepareQuestionsForStudent(quiz);
      const studentQuiz = {
        ...quiz,
        totalMarks: studentQuestions.reduce((sum, item) => sum + (item.marks || 1), 0),
        questionCount: studentQuestions.length,
        questions: studentQuestions.map((q) => ({
          id: q.id,
          subject: q.subject,
          topic: q.topic,
          questionText: q.questionText,
          questionImage: q.questionImage,
          options: q.options,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          question_en: q.question_en,
          options_en: q.options_en,
        })),
      };
      return jsonResponse(studentQuiz);
    }

    return jsonResponse(quiz);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  const db = context.env.DB;

  if (!id || !db) {
    return errorResponse('Valid Quiz ID and Database connection required', 400);
  }

  try {
    const res = await db.prepare('DELETE FROM quizzes WHERE id = ?').bind(id).run();
    if (!res.meta.changes) {
      return errorResponse('Quiz not found', 404);
    }
    return jsonResponse({ success: true, message: 'Quiz deleted successfully' });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

