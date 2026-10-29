import { Env, jsonResponse, errorResponse } from '../../../../helpers';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  const db = context.env.DB;

  if (!id || !db) {
    return errorResponse('Valid paper ID and DB connection required', 400);
  }

  try {
    const row = await db.prepare('SELECT * FROM quizzes WHERE id = ?').bind(id).first<any>();
    if (!row) {
      return errorResponse('Previous year question paper not found', 404);
    }

    const paper = {
      id: row.id,
      title: row.title,
      description: row.description,
      durationMinutes: row.duration_minutes,
      totalMarks: row.total_marks,
      passPercentage: row.pass_percentage,
      shuffleQuestions: Boolean(row.shuffle_questions),
      enableAntiCheat: Boolean(row.enable_anti_cheat),
      status: row.status,
      createdAt: row.created_at,
      questions: JSON.parse(row.questions || '[]'),
    };

    return jsonResponse(paper);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

