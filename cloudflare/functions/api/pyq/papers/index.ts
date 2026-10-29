import { Env, jsonResponse, errorResponse } from '../../../helpers';
import { PyqPaperSummary, NMMS_Subject } from '../../../../src/types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  if (!db) {
    return errorResponse('Database connection not available', 500);
  }

  try {
    const pyqRows = await db
      .prepare("SELECT * FROM quizzes WHERE id LIKE 'pyq-%' ORDER BY created_at DESC")
      .all();

    const attemptsCounts = await db.prepare('SELECT quiz_id, count(*) as count FROM attempts GROUP BY quiz_id').all();
    const attemptsMap = new Map<string, number>();
    (attemptsCounts.results || []).forEach((row: any) => {
      attemptsMap.set(row.quiz_id, row.count);
    });

    const list: PyqPaperSummary[] = (pyqRows.results || []).map((row: any) => {
      const match = row.id.match(/^pyq-(\d{4})-(mat|sat)$/i);
      const year = match ? parseInt(match[1], 10) : 2024;
      const type = match ? (match[2].toUpperCase() as 'MAT' | 'SAT') : 'MAT';
      const questions: any[] = JSON.parse(row.questions || '[]');
      const subjects: NMMS_Subject[] = Array.from(new Set(questions.map((item) => item.subject)));

      return {
        id: row.id,
        year,
        type,
        title: row.title,
        description: row.description,
        questionCount: questions.length,
        durationMinutes: row.duration_minutes,
        totalMarks: row.total_marks,
        subjects,
        isDeployed: row.status === 'active',
        attemptsCount: attemptsMap.get(row.id) || 0,
      };
    });

    list.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return a.type === 'MAT' ? -1 : 1;
    });

    return jsonResponse({ count: list.length, papers: list });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

