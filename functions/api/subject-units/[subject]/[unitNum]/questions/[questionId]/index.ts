import { Env, jsonResponse, errorResponse } from '../../../../../../helpers';
import { SUBJECT_CONFIGS } from '../../../../../subjectMetadata';
import { NMMS_Subject, Question } from '../../../../../../../src/types';

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const subject = (context.params.subject as string).toUpperCase() as NMMS_Subject;
  const unitNum = parseInt(context.params.unitNum as string, 10);
  const questionId = context.params.questionId as string;
  const db = context.env.DB;

  if (!SUBJECT_CONFIGS[subject] || isNaN(unitNum) || !questionId || !db) {
    return errorResponse('Invalid parameters', 400);
  }

  try {
    const updatedData: any = await context.request.json().catch(() => ({}));
    const key = `${subject}_${unitNum}`;

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

    const qIndex = questions.findIndex((q) => q.id === questionId);
    if (qIndex === -1) {
      return errorResponse('Question not found in unit', 404);
    }

    const existing = questions[qIndex];
    const merged: Question = {
      ...existing,
      ...updatedData,
      id: existing.id,
      subject: existing.subject,
      marks: Number(updatedData.marks) || 1,
      negativeMarks: Number(updatedData.negativeMarks) || 0,
    };

    questions[qIndex] = merged;

    await db
      .prepare(`
        INSERT INTO unit_overrides (key, subject, unit_number, questions, is_custom, last_updated)
        VALUES (?, ?, ?, ?, 1, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
          questions = excluded.questions,
          is_custom = 1,
          last_updated = datetime('now')
      `)
      .bind(key, subject, unitNum, JSON.stringify(questions))
      .run();

    // Synchronize deployed quiz if exists
    const unitId = `${SUBJECT_CONFIGS[subject].prefix}-${unitNum}`;
    await db
      .prepare('UPDATE quizzes SET questions = ?, total_marks = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(JSON.stringify(questions), questions.reduce((sum, q) => sum + (q.marks || 1), 0), unitId)
      .run();

    return jsonResponse({
      success: true,
      message: 'Question updated successfully',
      question: merged,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const subject = (context.params.subject as string).toUpperCase() as NMMS_Subject;
  const unitNum = parseInt(context.params.unitNum as string, 10);
  const questionId = context.params.questionId as string;
  const db = context.env.DB;

  if (!SUBJECT_CONFIGS[subject] || isNaN(unitNum) || !questionId || !db) {
    return errorResponse('Invalid parameters', 400);
  }

  try {
    const key = `${subject}_${unitNum}`;
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

    const initialLen = questions.length;
    questions = questions.filter((q) => q.id !== questionId);

    if (questions.length === initialLen) {
      return errorResponse('Question not found', 404);
    }

    await db
      .prepare(`
        INSERT INTO unit_overrides (key, subject, unit_number, questions, is_custom, last_updated)
        VALUES (?, ?, ?, ?, 1, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
          questions = excluded.questions,
          is_custom = 1,
          last_updated = datetime('now')
      `)
      .bind(key, subject, unitNum, JSON.stringify(questions))
      .run();

    const unitId = `${SUBJECT_CONFIGS[subject].prefix}-${unitNum}`;
    await db
      .prepare('UPDATE quizzes SET questions = ?, total_marks = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(JSON.stringify(questions), questions.reduce((sum, q) => sum + (q.marks || 1), 0), unitId)
      .run();

    return jsonResponse({
      success: true,
      message: 'Question deleted successfully',
      remainingCount: questions.length,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

