import { Env, jsonResponse, errorResponse } from '../../helpers';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const { examNumber, studentName, pin } = body;

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
      return errorResponse('தவறான பாதுகாப்பு PIN எண்! மாணவரை சேர்க்க சரியான 6-இலக்க PIN எண்ணை உள்ளிடவும் (Invalid Security PIN).', 401);
    }

    if (!examNumber || typeof examNumber !== 'string' || !examNumber.trim()) {
      return errorResponse('தயவுசெய்து தேர்வு எண்ணை (Exam Number) உள்ளிடவும்.', 400);
    }

    if (!studentName || typeof studentName !== 'string' || !studentName.trim()) {
      return errorResponse('தயவுசெய்து மாணவர் பெயரை (Student Name) உள்ளிடவும்.', 400);
    }

    const cleanExamNumber = examNumber.trim().toUpperCase();
    const cleanStudentName = studentName.trim();

    if (db) {
      const existing = await db
        .prepare('SELECT student_name FROM students WHERE exam_number = ? COLLATE NOCASE')
        .bind(cleanExamNumber)
        .first<{ student_name: string }>();

      if (existing) {
        return errorResponse(
          `தேர்வு எண் "${cleanExamNumber}" கொண்ட மாணவர் ஏற்கனவே பட்டியலில் உள்ளார் (${existing.student_name}).`,
          400
        );
      }

      await db
        .prepare('INSERT INTO students (exam_number, student_name, school) VALUES (?, ?, ?)')
        .bind(cleanExamNumber, cleanStudentName, 'GHS Kadayam')
        .run();

      const countRes = await db.prepare('SELECT count(*) as count FROM students').first<{ count: number }>();

      return jsonResponse({
        success: true,
        message: `மாணவர் ${cleanStudentName} (${cleanExamNumber}) வெற்றிகரமாக சேர்க்கப்பட்டார்! (Student added successfully)`,
        student: { examNumber: cleanExamNumber, studentName: cleanStudentName, school: 'GHS Kadayam' },
        totalStudents: countRes?.count || 1,
      });
    }

    return errorResponse('Database connection not available', 500);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

