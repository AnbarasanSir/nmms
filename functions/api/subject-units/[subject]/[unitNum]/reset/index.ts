import { Env, jsonResponse, errorResponse } from '../../../../../helpers';
import { SUBJECT_CONFIGS } from '../../../../../subjectMetadata';
import { NMMS_Subject, Question } from '../../../../../src/types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const subject = (context.params.subject as string).toUpperCase() as NMMS_Subject;
  const unitNum = parseInt(context.params.unitNum as string, 10);
  const db = context.env.DB;

  if (!SUBJECT_CONFIGS[subject] || isNaN(unitNum) || !db) {
    return errorResponse('Invalid subject or unit number', 400);
  }

  try {
    const key = `${subject}_${unitNum}`;
    await db.prepare('DELETE FROM unit_overrides WHERE key = ?').bind(key).run();

    let defaultQuestions: Question[] = [];
    const bankRow = await db.prepare('SELECT questions FROM unit_bank WHERE key = ?').bind(key).first<{ questions: string }>();
    if (bankRow?.questions) {
      defaultQuestions = JSON.parse(bankRow.questions);
    }

    const unitId = `${SUBJECT_CONFIGS[subject].prefix}-${unitNum}`;
    await db
      .prepare('UPDATE quizzes SET questions = ?, total_marks = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(JSON.stringify(defaultQuestions), defaultQuestions.reduce((sum, q) => sum + (q.marks || 1), 0), unitId)
      .run();

    return jsonResponse({
      success: true,
      message: `Unit ${unitNum} reset to original questions (${defaultQuestions.length} questions).`,
      questionCount: defaultQuestions.length,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

