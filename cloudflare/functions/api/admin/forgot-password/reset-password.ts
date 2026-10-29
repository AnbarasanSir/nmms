import { Env, jsonResponse, errorResponse } from '../../../helpers';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const { resetToken, newPassword } = body;

    if (!resetToken || typeof resetToken !== 'string') {
      return errorResponse('அங்கீகரிக்கப்படாத கோரிக்கை (Invalid reset session)', 400);
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
      return errorResponse('கடவுச்சொல் குறைந்தது 4 எழுத்துக்களை கொண்டிருக்க வேண்டும் (Password must be at least 4 characters)', 400);
    }

    const db = context.env.DB;
    if (db) {
      await db
        .prepare(`
          INSERT INTO admin_config (config_key, admin_password, updated_at)
          VALUES ('primary', ?, datetime('now'))
          ON CONFLICT(config_key) DO UPDATE SET
            admin_password = excluded.admin_password,
            updated_at = excluded.updated_at
        `)
        .bind(newPassword.trim())
        .run();
    }

    return jsonResponse({
      success: true,
      message: 'நிர்வாகி கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது! (Admin password updated successfully)',
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

