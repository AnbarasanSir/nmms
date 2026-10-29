import { Env, jsonResponse, errorResponse } from '../../../../../helpers';
import { SUBJECT_CONFIGS, UNIT_METADATA_MAP } from '../../../../../subjectMetadata';
import { NMMS_Subject, Question } from '../../../../../../src/types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const subject = (context.params.subject as string).toUpperCase() as NMMS_Subject;
  const unitNum = parseInt(context.params.unitNum as string, 10);
  const db = context.env.DB;

  if (!SUBJECT_CONFIGS[subject] || isNaN(unitNum) || !db) {
    return errorResponse('Invalid subject or unit number', 400);
  }

  try {
    const questionData: any = await context.request.json().catch(() => ({}));
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

    const meta = UNIT_METADATA_MAP[subject]?.[unitNum];
    const defaultTopic = meta ? `${meta.titleTa} (${meta.titleEn})` : `பகுதி ${unitNum}`;
    const newId = questionData.id || `${SUBJECT_CONFIGS[subject].prefix}-${unitNum}-q${questions.length + 1}-${Date.now().toString(36)}`;

    const newQuestion: Question = {
      id: newId,
      subject,
      topic: questionData.topic || defaultTopic,
      questionText: questionData.questionText || 'புதிய வினா',
      questionImage: questionData.questionImage,
      options: questionData.options && questionData.options.length === 4 ? questionData.options : [
        { id: 'A', text: 'விருப்பம் A' },
        { id: 'B', text: 'விருப்பம் B' },
        { id: 'C', text: 'விருப்பம் C' },
        { id: 'D', text: 'விருப்பம் D' },
      ],
      correctOption: questionData.correctOption || 'A',
      explanation: questionData.explanation || '',
      marks: Number(questionData.marks) || 1,
      negativeMarks: Number(questionData.negativeMarks) || 0,
      question_en: questionData.question_en,
      options_en: questionData.options_en,
      explanation_en: questionData.explanation_en,
    };

    questions.push(newQuestion);

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

    // If unit quiz is deployed, synchronize questions
    const unitId = `${SUBJECT_CONFIGS[subject].prefix}-${unitNum}`;
    await db
      .prepare('UPDATE quizzes SET questions = ?, total_marks = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(JSON.stringify(questions), questions.reduce((sum, q) => sum + (q.marks || 1), 0), unitId)
      .run();

    return jsonResponse({
      success: true,
      message: 'New question added to unit successfully',
      question: newQuestion,
    }, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

