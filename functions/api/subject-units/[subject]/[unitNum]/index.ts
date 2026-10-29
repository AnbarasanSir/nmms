import { Env, jsonResponse, errorResponse } from '../../../../helpers';
import { SUBJECT_CONFIGS, UNIT_METADATA_MAP } from '../../../subjectMetadata';
import { NMMS_Subject } from '../../../../src/types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const subject = (context.params.subject as string).toUpperCase() as NMMS_Subject;
  const unitNum = parseInt(context.params.unitNum as string, 10);
  const db = context.env.DB;

  if (!SUBJECT_CONFIGS[subject] || isNaN(unitNum) || !db) {
    return errorResponse('Invalid subject or unit number', 400);
  }

  try {
    const key = `${subject}_${unitNum}`;
    const overrideRow = await db.prepare('SELECT questions FROM unit_overrides WHERE key = ?').bind(key).first<{ questions: string }>();

    let questions: any[] = [];
    if (overrideRow?.questions) {
      questions = JSON.parse(overrideRow.questions);
    } else {
      const bankRow = await db.prepare('SELECT questions FROM unit_bank WHERE key = ?').bind(key).first<{ questions: string }>();
      if (bankRow?.questions) {
        questions = JSON.parse(bankRow.questions);
      }
    }

    const meta = UNIT_METADATA_MAP[subject]?.[unitNum];
    const unitId = `${SUBJECT_CONFIGS[subject].prefix}-${unitNum}`;
    const titleTa = meta?.titleTa || `பகுதி ${unitNum}`;
    const titleEn = meta?.titleEn || `Unit ${unitNum}`;

    const unitSummary = {
      id: unitId,
      subject,
      unitNumber: unitNum,
      title: `${SUBJECT_CONFIGS[subject].nameTa} - அலகு ${unitNum}: ${titleTa} (${titleEn})`,
      titleTa,
      titleEn,
      description: meta?.description || `${questions.length} பயிற்சி வினாக்கள் மற்றும் விரிவான விளக்கங்கள்.`,
      questionCount: questions.length,
      durationMinutes: Math.min(60, Math.max(15, Math.ceil(Math.max(questions.length, 10) * 1.5))),
      totalMarks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
      isDeployed: false,
      attemptsCount: 0,
      hasDiagrams: questions.some((q) => Boolean(q.questionImage)),
      hasCustomEdits: !!overrideRow,
    };

    return jsonResponse({
      unit: unitSummary,
      questions,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

