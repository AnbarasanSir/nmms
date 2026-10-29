import { Env, jsonResponse, errorResponse } from '../../helpers';
import { AUTHORIZED_STUDENTS } from '../../../src/data/students';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;

  if (!db) {
    return jsonResponse({
      count: AUTHORIZED_STUDENTS.length,
      students: AUTHORIZED_STUDENTS.map((s) => ({
        ...s,
        totalAttempts: 0,
        isCompleted: false,
        status: 'pending',
        score: null,
        percentage: null,
        bestScore: null,
        bestPercentage: null,
        submittedAt: null,
      })),
    });
  }

  try {
    // Ensure initial students are present
    const countRes = await db.prepare('SELECT count(*) as cnt FROM students').first<{ cnt: number }>();
    if (!countRes || countRes.cnt === 0) {
      const stmts = AUTHORIZED_STUDENTS.map((s) =>
        db.prepare('INSERT OR IGNORE INTO students (exam_number, student_name, school) VALUES (?, ?, ?)')
          .bind(s.examNumber, s.studentName, s.school || 'GHS Kadayam')
      );
      await db.batch(stmts);
    }

    const studentsResult = await db.prepare('SELECT exam_number as examNumber, student_name as studentName, school FROM students ORDER BY exam_number ASC').all();
    const studentsList: any[] = studentsResult.results || [];

    const attemptsResult = await db.prepare('SELECT exam_number, submitted_at, score FROM attempts ORDER BY created_at DESC').all();
    const allAttempts: any[] = attemptsResult.results || [];

    const rosterWithStatus = studentsList.map((s) => {
      const studentAttempts = allAttempts.filter(
        (a) => String(a.exam_number).toLowerCase() === String(s.examNumber).toLowerCase()
      );

      const totalAttempts = studentAttempts.length;
      let latestScore: number | null = null;
      let latestPercentage: number | null = null;
      let bestScore: number | null = null;
      let bestPercentage: number | null = null;
      let submittedAt: string | null = null;

      if (totalAttempts > 0) {
        const latestAttempt = studentAttempts[0];
        submittedAt = latestAttempt.submitted_at;
        try {
          const parsedLatestScore = JSON.parse(latestAttempt.score || '{}');
          latestScore = parsedLatestScore.totalObtained ?? null;
          latestPercentage = parsedLatestScore.percentage ?? null;

          const allScores = studentAttempts.map((att) => {
            const sc = JSON.parse(att.score || '{}');
            return {
              obtained: sc.totalObtained || 0,
              percentage: sc.percentage || 0,
            };
          });

          bestScore = Math.max(...allScores.map((x) => x.obtained));
          bestPercentage = Math.max(...allScores.map((x) => x.percentage));
        } catch {}
      }

      return {
        ...s,
        totalAttempts,
        isCompleted: totalAttempts > 0,
        status: totalAttempts > 0 ? 'completed' : 'pending',
        score: latestScore,
        percentage: latestPercentage,
        bestScore,
        bestPercentage,
        submittedAt,
      };
    });

    return jsonResponse({
      count: rosterWithStatus.length,
      students: rosterWithStatus,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

