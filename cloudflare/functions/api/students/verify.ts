import { Env, jsonResponse, errorResponse } from '../../helpers';
import { AUTHORIZED_STUDENTS } from '../../../src/data/students';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const examNumber = url.searchParams.get('examNumber');
  const quizId = url.searchParams.get('quizId') || '';

  if (!examNumber) {
    return errorResponse('Exam number is required.', 400);
  }

  const cleanExamNumber = examNumber.trim();
  const db = context.env.DB;

  let student: { examNumber: string; studentName: string; school?: string } | null = null;
  let studentQuizAttempts: any[] = [];
  let quizQuestions: any[] = [];

  if (db) {
    // 1. Look up student in D1
    const studentRow = await db
      .prepare('SELECT exam_number as examNumber, student_name as studentName, school FROM students WHERE exam_number = ? COLLATE NOCASE')
      .bind(cleanExamNumber)
      .first<{ examNumber: string; studentName: string; school?: string }>();

    if (studentRow) {
      student = studentRow;
    } else {
      // Check hardcoded fallback
      const found = AUTHORIZED_STUDENTS.find(
        (s) => s.examNumber.toLowerCase() === cleanExamNumber.toLowerCase()
      );
      if (found) {
        student = { ...found, school: found.school || 'GHS Kadayam' };
        // Seed to D1
        await db.prepare('INSERT OR IGNORE INTO students (exam_number, student_name, school) VALUES (?, ?, ?)')
          .bind(found.examNumber, found.studentName, student.school)
          .run();
      }
    }

    if (!student) {
      return errorResponse(
        'Invalid Exam Number. Only registered NMMS candidates are permitted to take the examination.',
        404
      );
    }

    // 2. Fetch attempts
    let query = 'SELECT * FROM attempts WHERE exam_number = ? COLLATE NOCASE';
    const params: any[] = [student.examNumber];

    if (quizId) {
      query += ' AND quiz_id = ?';
      params.push(quizId);
    }
    query += ' ORDER BY created_at DESC';

    const attemptsResult = await db.prepare(query).bind(...params).all();
    studentQuizAttempts = (attemptsResult.results || []).map((row: any) => ({
      id: row.id,
      quizId: row.quiz_id,
      quizTitle: row.quiz_title,
      studentName: row.student_name,
      examNumber: row.exam_number,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      timeTakenSeconds: row.time_taken_seconds,
      tabSwitchCount: row.tab_switch_count,
      answers: JSON.parse(row.answers || '{}'),
      questionStatus: JSON.parse(row.question_status || '{}'),
      score: JSON.parse(row.score || '{}'),
    }));

    // 3. Quiz questions if quizId is provided
    if (quizId) {
      const qRow = await db.prepare('SELECT questions FROM quizzes WHERE id = ?').bind(quizId).first<{ questions: string }>();
      if (qRow?.questions) {
        quizQuestions = JSON.parse(qRow.questions);
      }
    }
  } else {
    // Fallback without D1
    const found = AUTHORIZED_STUDENTS.find(
      (s) => s.examNumber.toLowerCase() === cleanExamNumber.toLowerCase()
    );
    if (!found) {
      return errorResponse(
        'Invalid Exam Number. Only registered NMMS candidates are permitted to take the examination.',
        404
      );
    }
    student = { ...found, school: 'GHS Kadayam' };
  }

  const existingAttempt = studentQuizAttempts[0] || null;

  return jsonResponse({
    authorized: true,
    canAttempt: true,
    isCompleted: studentQuizAttempts.length > 0,
    attemptsCount: studentQuizAttempts.length,
    status: studentQuizAttempts.length > 0 ? 'completed_can_retry' : 'ready',
    message: studentQuizAttempts.length > 0
      ? `Candidate has attempted this exam ${studentQuizAttempts.length} time(s). Retakes are permitted.`
      : 'Candidate authorized and ready.',
    student,
    latestAttempt: existingAttempt,
    allAttempts: studentQuizAttempts,
    questions: quizQuestions,
  });
};

