import { Env, jsonResponse, errorResponse } from '../../../helpers';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const examNumber = context.params.examNumber as string;
  const db = context.env.DB;

  if (!examNumber || !db) {
    return errorResponse('Valid exam number and DB connection required', 400);
  }

  const cleanExamNumber = examNumber.trim();

  try {
    const student = await db
      .prepare('SELECT exam_number as examNumber, student_name as studentName, school FROM students WHERE exam_number = ? COLLATE NOCASE')
      .bind(cleanExamNumber)
      .first<{ examNumber: string; studentName: string; school: string }>();

    if (!student) {
      return errorResponse('Student not found in NMMS roster', 404);
    }

    const attemptsResult = await db
      .prepare('SELECT * FROM attempts WHERE exam_number = ? COLLATE NOCASE ORDER BY created_at DESC')
      .bind(cleanExamNumber)
      .all();

    const studentAttempts = (attemptsResult.results || []).map((row: any) => ({
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

    // Group attempts by quiz
    const quizMap = new Map<string, any[]>();
    studentAttempts.forEach((att) => {
      const list = quizMap.get(att.quizId) || [];
      list.push(att);
      quizMap.set(att.quizId, list);
    });

    const quizSummaries = Array.from(quizMap.entries()).map(([qId, atts]) => {
      const scores = atts.map((a) => a.score?.totalObtained || 0);
      const percentages = atts.map((a) => a.score?.percentage || 0);
      const latest = atts[0];

      return {
        quizId: qId,
        quizTitle: latest.quizTitle || 'NMMS Assessment',
        attemptCount: atts.length,
        bestScore: Math.max(...scores),
        totalPossible: latest.score?.totalPossible || 0,
        bestPercentage: Math.max(...percentages),
        latestScore: latest.score?.totalObtained || 0,
        latestPercentage: latest.score?.percentage || 0,
        latestSubmittedAt: latest.submittedAt,
        attempts: atts,
      };
    });

    let matSum = 0, matCount = 0;
    let mathsSum = 0, mathsCount = 0;
    let scienceSum = 0, scienceCount = 0;
    let socialSum = 0, socialCount = 0;

    studentAttempts.forEach((att) => {
      const bd = att.score?.subjectBreakdown;
      if (bd?.MAT) {
        matSum += bd.MAT.accuracy || 0;
        matCount++;
      }
      if (bd?.SAT_MATHS) {
        mathsSum += bd.SAT_MATHS.accuracy || 0;
        mathsCount++;
      }
      if (bd?.SAT_SCIENCE) {
        scienceSum += bd.SAT_SCIENCE.accuracy || 0;
        scienceCount++;
      }
      if (bd?.SAT_SOCIAL) {
        socialSum += bd.SAT_SOCIAL.accuracy || 0;
        socialCount++;
      }
    });

    const subjectAverages = {
      MAT: matCount > 0 ? Math.round((matSum / matCount) * 10) / 10 : 0,
      SAT_MATHS: mathsCount > 0 ? Math.round((mathsSum / mathsCount) * 10) / 10 : 0,
      SAT_SCIENCE: scienceCount > 0 ? Math.round((scienceSum / scienceCount) * 10) / 10 : 0,
      SAT_SOCIAL: socialCount > 0 ? Math.round((socialSum / socialCount) * 10) / 10 : 0,
    };

    const totalAttempts = studentAttempts.length;
    const overallAveragePercentage =
      totalAttempts > 0
        ? Math.round((studentAttempts.reduce((sum, a) => sum + (a.score?.percentage || 0), 0) / totalAttempts) * 10) / 10
        : 0;
    const overallBestScore =
      totalAttempts > 0 ? Math.max(...studentAttempts.map((a) => a.score?.totalObtained || 0)) : 0;

    return jsonResponse({
      student,
      totalAttempts,
      totalQuizzesAttempted: quizSummaries.length,
      overallAveragePercentage,
      overallBestScore,
      quizSummaries,
      allAttempts: studentAttempts,
      subjectAverages,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

