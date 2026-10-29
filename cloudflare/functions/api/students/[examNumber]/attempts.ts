import { Env, jsonResponse, errorResponse } from '../../../helpers';

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const examNumber = context.params.examNumber as string;
  const url = new URL(context.request.url);
  const quizId = url.searchParams.get('quizId');
  const db = context.env.DB;

  if (!examNumber || !db) {
    return errorResponse('Valid exam number and DB connection required', 400);
  }

  const cleanExamNumber = examNumber.trim();

  try {
    let query = 'DELETE FROM attempts WHERE exam_number = ? COLLATE NOCASE';
    const params: any[] = [cleanExamNumber];

    if (quizId) {
      query += ' AND quiz_id = ?';
      params.push(quizId);
    }

    const res = await db.prepare(query).bind(...params).run();

    return jsonResponse({
      success: true,
      deletedCount: res.meta.changes || 0,
      message: `${res.meta.changes || 0} attempt records deleted successfully for ${cleanExamNumber}`,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

