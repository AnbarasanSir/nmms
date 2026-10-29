import { Env, jsonResponse, errorResponse } from '../../helpers';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  if (!db) {
    return errorResponse('Database connection not available', 500);
  }

  try {
    const body: any = await context.request.json().catch(() => ({}));
    const {
      paperId,
      durationMinutes,
      passPercentage,
      shuffleQuestions,
      shuffleOptions,
      enableQuestionLimit,
      questionsPerAttempt,
      enableAntiCheat,
    } = body;

    if (!paperId) {
      return errorResponse('Paper ID is required', 400);
    }

    const row = await db.prepare('SELECT * FROM quizzes WHERE id = ?').bind(paperId).first<any>();
    if (!row) {
      return errorResponse('Paper not found in PYQ repository', 404);
    }

    const newDuration = typeof durationMinutes === 'number' && durationMinutes > 0 ? durationMinutes : row.duration_minutes;
    const newPass = typeof passPercentage === 'number' ? passPercentage : (row.pass_percentage || 40);

    await db
      .prepare(`
        UPDATE quizzes SET
          status = 'active',
          duration_minutes = ?,
          pass_percentage = ?,
          shuffle_questions = ?,
          shuffle_options = ?,
          enable_question_limit = ?,
          questions_per_attempt = ?,
          enable_anti_cheat = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(
        newDuration,
        newPass,
        shuffleQuestions ? 1 : 0,
        shuffleOptions ? 1 : 0,
        enableQuestionLimit ? 1 : 0,
        enableQuestionLimit && typeof questionsPerAttempt === 'number' ? questionsPerAttempt : null,
        enableAntiCheat !== false ? 1 : 0,
        paperId
      )
      .run();

    return jsonResponse({
      success: true,
      message: `${row.title} மாதிரித் தேர்வாக மாணவர் பயன்பாட்டிற்கு வெளியிடப்பட்டது!`,
      quiz: {
        id: row.id,
        title: row.title,
        status: 'active',
        durationMinutes: newDuration,
        passPercentage: newPass,
      },
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

