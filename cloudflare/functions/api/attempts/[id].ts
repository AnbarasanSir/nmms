import { Env, jsonResponse, errorResponse } from '../../helpers';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  const db = context.env.DB;

  if (!id || !db) {
    return errorResponse('Valid attempt ID and DB connection required', 400);
  }

  try {
    const row = await db.prepare('SELECT * FROM attempts WHERE id = ?').bind(id).first<any>();
    if (!row) {
      return errorResponse('Attempt not found', 404);
    }

    const attempt = {
      id: row.id,
      quizId: row.quiz_id,
      quizTitle: row.quiz_title,
      studentName: row.student_name,
      examNumber: row.exam_number,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      timeTakenSeconds: row.time_taken_seconds,
      tabSwitchCount: row.tab_switch_count,
      answers: JSON.parse(row.answers || '{}'),
      questionStatus: JSON.parse(row.question_status || '{}'),
      score: JSON.parse(row.score || '{}'),
    };

    const quizRow = await db.prepare('SELECT * FROM quizzes WHERE id = ?').bind(attempt.quizId).first<any>();
    const quiz = quizRow
      ? {
          id: quizRow.id,
          title: quizRow.title,
          description: quizRow.description,
          durationMinutes: quizRow.duration_minutes,
          totalMarks: quizRow.total_marks,
          passPercentage: quizRow.pass_percentage,
          status: quizRow.status,
          questions: JSON.parse(quizRow.questions || '[]'),
        }
      : null;

    return jsonResponse({
      attempt,
      quiz,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  const db = context.env.DB;

  if (!id || !db) {
    return errorResponse('Valid attempt ID and DB connection required', 400);
  }

  try {
    const res = await db.prepare('DELETE FROM attempts WHERE id = ?').bind(id).run();
    if (!res.meta.changes) {
      return errorResponse('Attempt record not found', 404);
    }
    return jsonResponse({
      success: true,
      message: 'தேர்வு முயற்சி வெற்றிகரமாக நீக்கப்பட்டது (Attempt deleted successfully)',
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

