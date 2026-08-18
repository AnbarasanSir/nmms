import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateWithFallback, Type } from '../utils/gemini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { inputType, content, images, mimeType, defaultSubject } = req.body;

    if (!content && (!images || !Array.isArray(images) || images.length === 0)) {
      return res.status(400).json({ error: 'Content or images payload is required for extraction' });
    }

    const systemPrompt = `You are an expert NMMS (National Means-cum-Merit Scholarship) exam master and question parser specialized in TAMIL MEDIUM (தமிழ் வழியில் மட்டுமே).
Your task is to accurately extract or format multiple-choice questions in TAMIL from the provided input (Photo, PDF, or Text).

MATHEMATICAL EQUATIONS & NOTATIONS (LaTeX / KaTeX Formatting):
- Any mathematical equations, powers, fractions, square roots, variables, and expressions ($x^2 + y^2 = r^2$, $\\frac{a}{b}$, $\\sqrt{x}$, $2^3 \\times 4^2$, $a^2 + b^2 = c^2$, $\\pi r^2 h$, $30^\\circ$) MUST BE ENCLOSED in single dollar signs ($...$) for inline math.

If the user provides an image or a messy OCR text block:
1. Extract the question and its 4 options EXACTLY as written in the source, but fix any Tamil spelling/grammar errors introduced by OCR.
2. Determine the correct answer logically if not provided.
3. Write a brief Tamil explanation.
4. Categorize the subject (${defaultSubject ? 'Default to: ' + defaultSubject : "'MAT' | 'SAT_MATHS' | 'SAT_SCIENCE' | 'SAT_SOCIAL'"}) and Topic.

Output ONLY a JSON array of questions matching the schema.`;

    let parts: any[] = [];

    if (inputType === 'image' && images && Array.isArray(images)) {
      parts = images.map((base64Data: string) => {
        let b64 = base64Data;
        if (b64.startsWith('data:')) {
          b64 = b64.split(',')[1];
        }
        return {
          inlineData: {
            data: b64,
            mimeType: mimeType || 'image/jpeg',
          },
        };
      });

      parts.unshift({
        text: `Extract all multiple choice questions from these images into structured JSON format strictly in TAMIL MEDIUM. Use the provided Subject: ${defaultSubject || 'Auto-detect'}`,
      });
    } else {
      parts = [
        {
          text: `Extract all NMMS multiple choice questions from the following text into structured JSON format strictly in TAMIL MEDIUM:\n\n${content}`,
        },
      ];
    }

    const response = await generateWithFallback({
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  questionText: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        text: { type: Type.STRING },
                      },
                      required: ['id', 'text'],
                    },
                  },
                  correctOption: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ['subject', 'questionText', 'options', 'correctOption', 'explanation'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    const data = JSON.parse(response.text || '{}');
    if (!data.questions) {
      throw new Error('AI failed to return the expected JSON format');
    }

    return res.status(200).json(data.questions);
  } catch (error: any) {
    console.error('Error parsing AI questions:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
