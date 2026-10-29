import { Env, jsonResponse, errorResponse } from '../../../helpers';

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const examNumber = context.params.examNumber as string;
    const url = new URL(context.request.url);
    const body: any = await context.request.json().catch(() => ({}));
    const pin = (body?.pin || url.searchParams.get('pin')) as string;

    if (!pin || typeof pin !== 'string') {
      return errorResponse('தயவுசெய்து ஆசிரியர் பாதுகாப்பு PIN எண்ணை உள்ளிடவும் (Security PIN is required).', 401);
    }

    const db = context.env.DB;
    let expectedPin = context.env.ADMIN_SECURITY_PIN || '273464';

    if (db) {
      const config = await db
        .prepare('SELECT security_pin FROM admin_config WHERE config_key = ?')
        .bind('primary')
        .first<{ security_pin: string }>();
      if (config?.security_pin) {
        expectedPin = config.security_pin;
      }
    }

    if (pin.trim() !== expectedPin) {
      return errorResponse('தவறான பாதுகாப்பு PIN எண்! மாணவரை நீக்க சரியான 6-இலக்க PIN எண்ணை உள்ளிடவும் (Invalid Security PIN).', 401);
    }

    if (!examNumber) {
      return errorResponse('Exam number is required.', 400);
    }

    const cleanExamNumber = examNumber.trim().toUpperCase();

    if (db) {
      const student = await db
        .prepare('SELECT student_name FROM students WHERE exam_number = ? COLLATE NOCASE')
        .bind(cleanExamNumber)
        .first<{ student_name: string }>();

      if (!student) {
        return errorResponse(`தேர்வு எண் "${cleanExamNumber}" கொண்ட மாணவர் பட்டியலில் காணப்படவில்லை.`, 404);
      }

      await db.prepare('DELETE FROM students WHERE exam_number = ? COLLATE NOCASE').bind(cleanExamNumber).run();
      const countRes = await db.prepare('SELECT count(*) as count FROM students').first<{ count: number }>();

      return jsonResponse({
        success: true,
        message: `மாணவர் ${student.student_name} (${cleanExamNumber}) வெற்றிகரமாக நீக்கப்பட்டார்! (Student removed successfully)`,
        removedStudent: { examNumber: cleanExamNumber, studentName: student.student_name },
        totalStudents: countRes?.count || 0,
      });
    }

    return errorResponse('Database connection not available', 500);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

