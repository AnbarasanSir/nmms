import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateWithFallback, Type } from '../utils/gemini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { subject, topic, count, difficulty } = req.body;
    const numCount = Math.min(Math.max(Number(count) || 5, 1), 20);

    const prompt = `CRITICAL MANDATE: Generate exactly ${numCount} authentic National Means-cum-Merit Scholarship (NMMS) examination multiple choice questions ONLY FOR TAMIL MEDIUM (தமிழ் வழியில் மட்டுமே).
  
  Every single question, all 4 option texts (A, B, C, D), and all step-by-step explanations MUST BE WRITTEN IN TAMIL (தமிழ் மொழியில்).
  
  Subject: ${subject || 'MAT'}
  Topic: ${topic || 'மனத்திறன் தேர்வு (Tamil Nadu SCERT Class 7-8 Syllabus)'}
  Difficulty: ${difficulty || 'Moderate'} (Class 8 NMMS Scholarship standard).
  
  Curriculum Guidelines for Tamil Medium:
  - For MAT (மனத்திறன் தேர்வு): எண் தொடர்கள் (Number Series), எழுத்துத் தொடர்கள் (Letter Series), ஒப்புமை (Analogy), மாறுபட்டதை தேர்ந்தெடுத்தல் (Odd One Out), குறியீட்டு முறைகள் (Coding-Decoding), திசை அறிதல் (Direction Sense), இரத்த உறவுகள் (Blood Relations), பகடைகள் (Dice), வென்படங்கள் (Venn Diagrams).
  - For SAT_MATHS (கணிதம்): மனத்திறன் தேர்வு மற்றும் 7 & 8 ஆம் வகுப்பு கணித பாடங்கள் (எண்கள், அளவைகள், வாழ்வியல் கணிதம், இயற்கணிதம், வடிவியல், புள்ளியியல்).
  - For SAT_SCIENCE (அறிவியல்): மனத்திறன் தேர்வு மற்றும் 7 & 8 ஆம் வகுப்பு அறிவியல் பாடங்கள் (அளவீட்டியல், விசையும் இயக்கமும், நம்மைச் சுற்றியுள்ள பருப்பொருள்கள், அணு அமைப்பு, தாவரங்கள் மற்றும் விலங்குகளின் இனப்பெருக்கம், நுண்ணுயிரிகள்).
  - For SAT_SOCIAL (சமூக அறிவியல்): மனத்திறன் தேர்வு மற்றும் 7 & 8 ஆம் வகுப்பு சமூக அறிவியல் பாடங்கள் (1857 பெரும் புரட்சி, இந்திய அரசமைப்பு, மாநில அரசு எவ்வாறு செயல்படுகிறது, முகலாயப் பேரரசு).
  
  MATHEMATICAL EQUATIONS & NOTATIONS (LaTeX / KaTeX Formatting):
  - Any mathematical equations, powers, fractions, square roots, variables, and expressions ($x^2 + y^2 = r^2$, $\\frac{a}{b}$, $\\sqrt{x}$, $2^3 \\times 4^2$, $a^2 + b^2 = c^2$, $\\pi r^2 h$, $30^\\circ$) MUST BE ENCLOSED in single dollar signs ($...$) for inline math.
  - Fractions: $\\frac{numerator}{denominator}$, Square roots: $\\sqrt{number}$, Exponents: $x^2, 2^8$, Multiplication: $\\times$, Division: $\\div$, Plus-Minus: $\\pm$.
  
  Output Requirements:
  1. Question statement: In clear Tamil.
  2. Options (A, B, C, D): In clear Tamil.
  3. Correct Option: 'A' | 'B' | 'C' | 'D'.
  4. Topic: Topic name in Tamil.
  5. Explanation: Comprehensive step-by-step mathematical calculation or scientific reason in Tamil.
  6. Subject: Must strictly be one of: 'MAT' | 'SAT_MATHS' | 'SAT_SCIENCE' | 'SAT_SOCIAL'.`;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
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
    console.error('Error generating AI questions:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
