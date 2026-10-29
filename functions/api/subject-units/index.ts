import { Env, jsonResponse, errorResponse } from '../../helpers';
import { SUBJECT_CONFIGS, UNIT_METADATA_MAP } from '../../subjectMetadata';
import { NMMS_Subject, SubjectUnitSummary } from '../../../src/types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const subjectParam = url.searchParams.get('subject');
  const db = context.env.DB;

  if (!db) {
    return errorResponse('Database not connected', 500);
  }

  try {
    let subjects: NMMS_Subject[] = ['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'];
    if (subjectParam && subjectParam.toUpperCase() in SUBJECT_CONFIGS) {
      subjects = [subjectParam.toUpperCase() as NMMS_Subject];
    }

    const deployedQuizzesRows = await db.prepare("SELECT id, status FROM quizzes WHERE id LIKE 'unit-%'").all();
    const deployedQuizMap = new Map<string, string>();
    (deployedQuizzesRows.results || []).forEach((row: any) => {
      deployedQuizMap.set(row.id, row.status);
    });

    const overridesRows = await db.prepare('SELECT key, questions FROM unit_overrides').all();
    const overridesMap = new Map<string, any[]>();
    (overridesRows.results || []).forEach((row: any) => {
      overridesMap.set(row.key, JSON.parse(row.questions || '[]'));
    });

    const bankRows = await db.prepare('SELECT key, questions FROM unit_bank').all();
    const bankMap = new Map<string, any[]>();
    (bankRows.results || []).forEach((row: any) => {
      bankMap.set(row.key, JSON.parse(row.questions || '[]'));
    });

    const attemptsCounts = await db.prepare('SELECT quiz_id, count(*) as count FROM attempts GROUP BY quiz_id').all();
    const attemptsMap = new Map<string, number>();
    (attemptsCounts.results || []).forEach((row: any) => {
      attemptsMap.set(row.quiz_id, row.count);
    });

    const units: SubjectUnitSummary[] = [];

    for (const sub of subjects) {
      const metadataMap = UNIT_METADATA_MAP[sub] || {};
      const unitNumbers = Object.keys(metadataMap)
        .map((n) => parseInt(n, 10))
        .sort((a, b) => a - b);

      for (const unitNum of unitNumbers) {
        const key = `${sub}_${unitNum}`;
        const unitId = `${SUBJECT_CONFIGS[sub].prefix}-${unitNum}`;
        const meta = metadataMap[unitNum];

        const questions = overridesMap.get(key) || bankMap.get(key) || [];
        const isDeployed = deployedQuizMap.has(unitId) && deployedQuizMap.get(unitId) === 'active';
        const hasCustom = overridesMap.has(key);
        const hasDiagrams = questions.some((q) => Boolean(q.questionImage));

        const titleTa = meta?.titleTa || `பகுதி ${unitNum}`;
        const titleEn = meta?.titleEn || `Unit ${unitNum}`;
        const fullTitle = `${SUBJECT_CONFIGS[sub].nameTa} - அலகு ${unitNum}: ${titleTa} (${titleEn})`;

        units.push({
          id: unitId,
          subject: sub,
          unitNumber: unitNum,
          title: fullTitle,
          titleTa,
          titleEn,
          description: meta?.description || `${questions.length} பயிற்சி வினாக்கள் மற்றும் விரிவான விளக்கங்கள்.`,
          questionCount: questions.length,
          durationMinutes: Math.min(60, Math.max(15, Math.ceil(Math.max(questions.length, 10) * 1.5))),
          totalMarks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
          isDeployed,
          activeQuizId: isDeployed ? unitId : undefined,
          attemptsCount: attemptsMap.get(unitId) || 0,
          hasDiagrams,
          hasCustomEdits: hasCustom,
        });
      }
    }

    const totalQuestions = units.reduce((sum, u) => sum + u.questionCount, 0);
    const deployedUnitsCount = units.filter((u) => u.isDeployed).length;

    return jsonResponse({
      count: units.length,
      totalQuestions,
      deployedUnitsCount,
      units,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

