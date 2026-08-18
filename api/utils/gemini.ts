import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODELS = ['gemini-2.5-pro', 'gemini-2.0-flash'];

function isTransientError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.code;
  if (status === 429 || status === 503 || status === 500 || status === 504 || status === 502 || status === 524) return true;
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('overloaded') || msg.includes('quota') || msg.includes('timeout') || msg.includes('unavailable') || msg.includes('internal error')) return true;
  return false;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateWithFallback(params: { contents: any; config?: any; }) {
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini Attempt Failed] model=${model} attempt=${attempt + 1}:`, err.message || err);

        if (isTransientError(err)) {
          await delay(800 * (attempt + 1));
          continue;
        } else {
          throw err;
        }
      }
    }
  }

  throw lastError;
}

export { Type };
