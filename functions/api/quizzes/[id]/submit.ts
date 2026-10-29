import { Env, jsonResponse, errorResponse, calculateScore } from '../../../helpers';
import { Quiz, Question, StudentAttempt } from '../../../../src/types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  const db = context.env.DB;

  if (!id || !db) {
    return errorResponse('Valid Quiz ID and Database connection required', 400);
  }

  try {
    const body: any = await context.request.json().catch(() => ({}));
    const {
      studentName,
      examNumber,
      startedAt,
      answers,
      questionStatus,
      tabSwitchCount,
      timeTakenSeconds,
      clientQuestions,
    } = body;

    if (!studentName || !examNumber) {
      return errorResponse('Student Name and Exam Number are required', 400);
    }

    const row = await db.prepare('SELECT * FROM quizzes WHERE id = ?').bind(id).first<any>();
    if (!row) {
      return errorResponse('Exam paper not found', 404);
    }

    const quiz: Quiz = {
      id: row.id,
      title: row.title,
      description: row.description,
      durationMinutes: row.duration_minutes,
      totalMarks: row.total_marks,
      passPercentage: row.pass_percentage,
      shuffleQuestions: Boolean(row.shuffle_questions),
      shuffleOptions: Boolean(row.shuffle_options),
      enableQuestionLimit: Boolean(row.enable_question_limit),
      questionsPerAttempt: row.questions_per_attempt || undefined,
      enableAntiCheat: Boolean(row.enable_anti_cheat),
      showResultsImmediately: Boolean(row.show_results_immediately),
      allowReview: Boolean(row.allow_review),
      status: row.status,
      createdAt: row.created_at,
      questions: JSON.parse(row.questions || '[]'),
    };

    let activeQuestions: Question[] = quiz.questions;
    if (Array.isArray(clientQuestions) && clientQuestions.length > 0) {
      activeQuestions = clientQuestions.map((cq: any) => {
        const orig = quiz.questions.find((q) => q.id === cq.id) || cq;

        let resolvedCorrectOption = orig.correctOption;
        if (Array.isArray(cq.options) && cq.options.length === 4 && orig.options) {
          const origCorrectText = orig.options.find((o: any) => o.id === orig.correctOption)?.text;
          const matchedOpt = cq.options.find((o: any) => o.text === origCorrectText);
          if (matchedOpt) {
            resolvedCorrectOption = matchedOpt.id;
          }
        }

        return {
          ...orig,
          questionText: cq.questionText || orig.questionText,
          questionImage: cq.questionImage || orig.questionImage,
          options: cq.options || orig.options,
          correctOption: resolvedCorrectOption,
          options_en: cq.options_en || orig.options_en,
        };
      });
    } else {
      const answeredKeys = Object.keys(answers || {});
      if (answeredKeys.length > 0 && answeredKeys.length < quiz.questions.length && quiz.enableQuestionLimit) {
        const subset = quiz.questions.filter((q) => q.id in answers || (questionStatus && q.id in questionStatus));
        if (subset.length > 0) {
          activeQuestions = subset;
        }
      }
    }

    const scoreResult = calculateScore(quiz, answers || {}, activeQuestions);
    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const cleanExamNumber = examNumber.trim().toUpperCase();

    const attempt: StudentAttempt = {
      id: attemptId,
      quizId: quiz.id,
      quizTitle: quiz.title,
      studentName: studentName.trim(),
      examNumber: cleanExamNumber,
      startedAt: startedAt || new Date(Date.now() - (timeTakenSeconds || 0) * 1000).toISOString(),
      submittedAt: new Date().toISOString(),
      timeTakenSeconds: Number(timeTakenSeconds) || 0,
      answers: answers || {},
      questionStatus: questionStatus || {},
      tabSwitchCount: Number(tabSwitchCount) || 0,
      score: scoreResult,
    };

    await db
      .prepare(`
        INSERT INTO attempts (
          id, quiz_id, quiz_title, student_name, exam_number, started_at, submitted_at,
          time_taken_seconds, tab_switch_count, answers, question_status, score, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      .bind(
        attempt.id,
        attempt.quizId,
        attempt.quizTitle,
        attempt.studentName,
        attempt.examNumber,
        attempt.startedAt,
        attempt.submittedAt,
        attempt.timeTakenSeconds,
        attempt.tabSwitchCount,
        JSON.stringify(attempt.answers),
        JSON.stringify(attempt.questionStatus),
        JSON.stringify(attempt.score)
      )
      .run();

    return jsonResponse({
      success: true,
      attemptId: attempt.id,
      score: scoreResult,
      attempt,
      quizDetails: {
        id: quiz.id,
        title: quiz.title,
        questions: activeQuestions,
      },
    }, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

