import { Env, jsonResponse, errorResponse } from '../../helpers';
import { SUBJECT_CONFIGS, UNIT_METADATA_MAP } from '../../subjectMetadata';
import { NMMS_Subject, Question, Quiz } from '../../../src/types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  if (!db) {
    return errorResponse('Database connection required', 500);
  }

  try {
    const body: any = await context.request.json().catch(() => ({}));
    const { subject } = body;

    let subjectsToDeploy: NMMS_Subject[] = ['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'];
    if (subject && typeof subject === 'string' && subject.toUpperCase() in SUBJECT_CONFIGS) {
      subjectsToDeploy = [subject.toUpperCase() as NMMS_Subject];
    }

    const overridesRows = await db.prepare('SELECT key, questions FROM unit_overrides').all();
    const overridesMap = new Map<string, Question[]>();
    (overridesRows.results || []).forEach((row: any) => {
      overridesMap.set(row.key, JSON.parse(row.questions || '[]'));
    });

    const bankRows = await db.prepare('SELECT key, questions FROM unit_bank').all();
    const bankMap = new Map<string, Question[]>();
    (bankRows.results || []).forEach((row: any) => {
      bankMap.set(row.key, JSON.parse(row.questions || '[]'));
    });

    let deployedCount = 0;

    for (const sub of subjectsToDeploy) {
      const metadataMap = UNIT_METADATA_MAP[sub] || {};
      const unitNumbers = Object.keys(metadataMap)
        .map((n) => parseInt(n, 10))
        .sort((a, b) => a - b);

      for (const num of unitNumbers) {
        const key = `${sub}_${num}`;
        const questions = overridesMap.get(key) || bankMap.get(key) || [];
        if (questions.length === 0) continue;

        const meta = metadataMap[num];
        const unitId = `${SUBJECT_CONFIGS[sub].prefix}-${num}`;
        const titleTa = meta?.titleTa || `பகுதி ${num}`;
        const titleEn = meta?.titleEn || `Unit ${num}`;
        const title = `${SUBJECT_CONFIGS[sub].nameTa} - அலகு ${num}: ${titleTa} (${titleEn})`;
        const description = meta?.description || `NMMS ${SUBJECT_CONFIGS[sub].nameTa} தேர்வுக்கான அலகு ${num} மாதிரித் தேர்வு.`;
        const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

        await db
          .prepare(`
            INSERT INTO quizzes (
              id, title, description, duration_minutes, total_marks, pass_percentage,
              shuffle_questions, shuffle_options, enable_question_limit, questions_per_attempt,
              enable_anti_cheat, show_results_immediately, allow_review, status, questions,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              description = excluded.description,
              duration_minutes = excluded.duration_minutes,
              total_marks = excluded.total_marks,
              status = 'active',
              questions = excluded.questions,
              updated_at = datetime('now')
          `)
          .bind(
            unitId,
            title,
            description,
            Math.min(60, Math.max(15, Math.ceil(questions.length * 1.5))),
            totalMarks,
            40,
            1,
            1,
            0,
            null,
            1,
            1,
            1,
            'active',
            JSON.stringify(questions)
          )
          .run();

        deployedCount++;
      }
    }

    return jsonResponse({
      success: true,
      message: `அனைத்து ${deployedCount} பாட அலகுகளும் மாணவர் பயன்பாட்டிற்கு வெற்றிகரமாக வெளியிடப்பட்டன! (All units deployed successfully)`,
      deployedCount,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

