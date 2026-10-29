import { Env, jsonResponse, errorResponse } from '../helpers';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  if (!db) {
    return jsonResponse({
      connected: false,
      status: 'D1 binding (DB) not configured',
      latencyMs: '0ms',
    });
  }

  try {
    const startTime = Date.now();
    const [studentsRes, quizzesRes, attemptsRes, overridesRes, adminRes] = await Promise.all([
      db.prepare('SELECT count(*) as count FROM students').first<{ count: number }>(),
      db.prepare('SELECT count(*) as count FROM quizzes').first<{ count: number }>(),
      db.prepare('SELECT count(*) as count FROM attempts').first<{ count: number }>(),
      db.prepare('SELECT count(*) as count FROM unit_overrides').first<{ count: number }>(),
      db.prepare('SELECT updated_at FROM admin_config WHERE config_key = ?').bind('primary').first<{ updated_at: string }>(),
    ]);
    const latencyMs = Date.now() - startTime;

    return jsonResponse({
      connected: true,
      status: 'Connected & Operational (Cloudflare D1)',
      latencyMs: `${latencyMs}ms`,
      collections: {
        students: { count: studentsRes?.count ?? 0, description: 'Authorized students roster' },
        quizzes: { count: quizzesRes?.count ?? 0, description: 'Custom & deployed quizzes' },
        attempts: { count: attemptsRes?.count ?? 0, description: 'Student test attempts & score records' },
        unitOverrides: { count: overridesRes?.count ?? 0, description: 'Custom subject unit question overrides' },
        adminConfig: { exists: !!adminRes, lastUpdated: adminRes?.updated_at || null },
      },
    });
  } catch (err: any) {
    return errorResponse(`D1 query error: ${err.message}`, 500);
  }
};

