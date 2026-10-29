import { Env, jsonResponse, errorResponse } from '../../../helpers';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const pin = body.pin;

    if (!pin || typeof pin !== 'string') {
      return errorResponse('தயவுசெய்து 6-இலக்க பாதுகாப்பு PIN எண்ணை உள்ளிடவும் (Security PIN is required)', 400);
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
      return errorResponse('தவறான பாதுகாப்பு PIN எண்! சரியான 6-இலக்க PIN எண்ணை உள்ளிடவும் (Invalid PIN).', 400);
    }

    const resetToken = 'pin_rst_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);

    return jsonResponse({
      success: true,
      resetToken,
      message: 'பாதுகாப்பு PIN வெற்றிகரமாக சரிபார்க்கப்பட்டது! புதிய கடவுச்சொல்லை அமைக்கலாம்.',
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

