import { Env, jsonResponse, errorResponse } from '../../../helpers';
import { Quiz, Question, NMMS_Subject } from '../../../../src/types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  const db = context.env.DB;

  if (!id || !db) {
    return errorResponse('Valid Quiz ID and Database connection required', 400);
  }

  try {
    const quizRow = await db.prepare('SELECT * FROM quizzes WHERE id = ?').bind(id).first<any>();
    if (!quizRow) {
      return errorResponse('Quiz not found', 404);
    }

    const quiz: Quiz = {
      id: quizRow.id,
      title: quizRow.title,
      description: quizRow.description,
      durationMinutes: quizRow.duration_minutes,
      totalMarks: quizRow.total_marks,
      passPercentage: quizRow.pass_percentage,
      shuffleQuestions: Boolean(quizRow.shuffle_questions),
      enableAntiCheat: Boolean(quizRow.enable_anti_cheat),
      showResultsImmediately: Boolean(quizRow.show_results_immediately),
      allowReview: Boolean(quizRow.allow_review),
      status: quizRow.status,
      createdAt: quizRow.created_at,
      questions: JSON.parse(quizRow.questions || '[]'),
    };

    const attemptsResult = await db
      .prepare('SELECT * FROM attempts WHERE quiz_id = ? ORDER BY created_at DESC')
      .bind(id)
      .all();

    const quizAttempts = (attemptsResult.results || []).map((row: any) => ({
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

    if (quizAttempts.length === 0) {
      return jsonResponse({
        quizId: quiz.id,
        quizTitle: quiz.title,
        totalAttempts: 0,
        averageScore: 0,
        averagePercentage: 0,
        highestScore: 0,
        lowestScore: 0,
        averageTimeSeconds: 0,
        passRate: 0,
        subjectAverages: { MAT: 0, SAT_MATHS: 0, SAT_SCIENCE: 0, SAT_SOCIAL: 0 },
        questionStats: quiz.questions.map((q, idx) => ({
          questionId: q.id,
          questionNumber: idx + 1,
          subject: q.subject,
          questionText: q.questionText,
          correctRate: 0,
          correctAttempts: 0,
          wrongAttempts: 0,
          unattempted: 0,
          difficultyRating: 'Moderate' as const,
        })),
        recentAttempts: [],
      });
    }

    const totalAttempts = quizAttempts.length;
    const scores = quizAttempts.map((a) => a.score?.totalObtained || 0);
    const percentages = quizAttempts.map((a) => a.score?.percentage || 0);
    const times = quizAttempts.map((a) => a.timeTakenSeconds || 0);
    const passCount = quizAttempts.filter((a) => a.score?.isEligible).length;

    const averageScore = Math.round((scores.reduce((a, b) => a + b, 0) / totalAttempts) * 10) / 10;
    const averagePercentage = Math.round((percentages.reduce((a, b) => a + b, 0) / totalAttempts) * 10) / 10;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const averageTimeSeconds = Math.round(times.reduce((a, b) => a + b, 0) / totalAttempts);
    const passRate = Math.round((passCount / totalAttempts) * 1000) / 10;

    const subjectAverages = {
      MAT: Math.round((quizAttempts.reduce((sum, a) => sum + (a.score?.subjectBreakdown?.MAT?.accuracy || 0), 0) / totalAttempts) * 10) / 10,
      SAT_MATHS: Math.round((quizAttempts.reduce((sum, a) => sum + (a.score?.subjectBreakdown?.SAT_MATHS?.accuracy || 0), 0) / totalAttempts) * 10) / 10,
      SAT_SCIENCE: Math.round((quizAttempts.reduce((sum, a) => sum + (a.score?.subjectBreakdown?.SAT_SCIENCE?.accuracy || 0), 0) / totalAttempts) * 10) / 10,
      SAT_SOCIAL: Math.round((quizAttempts.reduce((sum, a) => sum + (a.score?.subjectBreakdown?.SAT_SOCIAL?.accuracy || 0), 0) / totalAttempts) * 10) / 10,
    };

    const questionStats = quiz.questions.map((q, idx) => {
      let correct = 0;
      let wrong = 0;
      let unattempted = 0;

      quizAttempts.forEach((a) => {
        const ans = a.answers ? a.answers[q.id] : null;
        if (!ans) {
          unattempted++;
        } else if (ans === q.correctOption) {
          correct++;
        } else {
          wrong++;
        }
      });

      const correctRate = totalAttempts > 0 ? Math.round((correct / totalAttempts) * 100) : 0;
      let difficultyRating: 'Easy' | 'Moderate' | 'Hard' = 'Moderate';
      if (correctRate >= 70) difficultyRating = 'Easy';
      else if (correctRate < 40) difficultyRating = 'Hard';

      return {
        questionId: q.id,
        questionNumber: idx + 1,
        subject: q.subject,
        questionText: q.questionText,
        correctRate,
        correctAttempts: correct,
        wrongAttempts: wrong,
        unattempted,
        difficultyRating,
      };
    });

    return jsonResponse({
      quizId: quiz.id,
      quizTitle: quiz.title,
      totalAttempts,
      averageScore,
      averagePercentage,
      highestScore,
      lowestScore,
      averageTimeSeconds,
      passRate,
      subjectAverages,
      questionStats,
      recentAttempts: quizAttempts,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

