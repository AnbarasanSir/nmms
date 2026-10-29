import { Env, jsonResponse, errorResponse, repairMangledLatex } from '../../helpers';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse('GEMINI_API_KEY is not configured on Cloudflare environment variables.', 500);
  }

  try {
    const body: any = await context.request.json().catch(() => ({}));
    const { subject, topic, count, difficulty } = body;
    const numCount = Math.min(Math.max(Number(count) || 5, 1), 20);

    const prompt = `CRITICAL MANDATE: Generate exactly ${numCount} authentic National Means-cum-Merit Scholarship (NMMS) examination multiple choice questions ONLY FOR TAMIL MEDIUM (தமிழ் வழிக் கல்வி).

Every single question, all 4 option texts (A, B, C, D), and all step-by-step explanations MUST BE WRITTEN IN TAMIL (தமிழ் மொழி).

Subject: ${subject || 'MAT'}
Topic: ${topic || 'தமிழ்நாடு அரசுப் பாடத்திட்டம் (Tamil Nadu SCERT Class 7-8 Syllabus)'}
Difficulty: ${difficulty || 'Moderate'} (Class 8 NMMS Scholarship standard).

Curriculum Guidelines for Tamil Medium:
- For MAT (மனத்திறன் தேர்வு): எண் தொடர் (Number Series), எழுத்துத் தொடர் (Letter Series), ஒப்புமை (Analogy), பொருந்தாததை கண்டறிதல் (Odd One Out), குறியீட்டு மொழியியல் (Coding-Decoding), திசை உணர்தல் (Direction Sense), இரத்த உறவுகள் (Blood Relations), பகடை கணக்குகள் (Dice), வென் வரைபடங்கள் (Venn Diagrams).
- For SAT_MATHS (கணிதம்): தமிழ்நாடு சமச்சீர் கல்வி 7 & 8 ஆம் வகுப்பு கணிதப் பாடத்திட்டம் (விகிதமுறு எண்கள், எளிய சமன்பாடுகள், வர்க்கம் மற்றும் வர்க்கமூலம், அடுக்குகள், அளவியல், காரணிப்படுத்துதல்).
- For SAT_SCIENCE (அறிவியல்): தமிழ்நாடு சமச்சீர் கல்வி 7 & 8 ஆம் வகுப்பு அறிவியல் பாடத்திட்டம் (ஒளி, ஒலி, விசை மற்றும் அழுத்தம், அணு அமைப்பு, செல் அமைப்பு, தாவர மற்றும் விலங்கு உலகம், நுண்ணுயிரிகள், காந்தவியல், மின்னியல்).
- For SAT_SOCIAL (சமூக அறிவியல்): தமிழ்நாடு சமச்சீர் கல்வி 7 & 8 ஆம் வகுப்பு சமூக அறிவியல் பாடத்திட்டம் (1857 பெரும் புரட்சி, இந்திய அரசியலமைப்பு, வளங்கள் மற்றும் தொழிலகங்கள், முகலாயர்கள், பாளையக்காரர்கள் கிளர்ச்சி, நீதித்துறை).

MATHEMATICAL EQUATIONS & NOTATIONS (LaTeX / KaTeX Formatting):
- Any mathematical equations, powers, fractions, square roots, variables, and expressions ($x^2 + y^2 = r^2$, $\\frac{a}{b}$, $\\sqrt{x}$, $2^3 \\times 4^2$, $a^2 + b^2 = c^2$, $\\pi r^2 h$, $30^\\circ$) MUST BE ENCLOSED in single dollar signs ($...$) for inline math.
- Fractions: $\\frac{numerator}{denominator}$, Square roots: $\\sqrt{number}$, Exponents: $x^2, 2^8$, Multiplication: $\\times$, Division: $\\div$, Plus-Minus: $\\pm$.
- Apply this cleanly to question text, all 4 options, and step-by-step solutions.

Output Requirements:
1. Question statement: In clear Tamil (தமிழ்).
2. Options (A, B, C, D): In clear Tamil (தமிழ்).
3. Correct Option: 'A' | 'B' | 'C' | 'D'.
4. Topic: Topic name in Tamil (e.g., "எண் தொடர்", "ஒளி மற்றும் ஒளியியல்", "இந்திய அரசியலமைப்பு").
5. Explanation: Comprehensive step-by-step mathematical calculation or scientific reason in Tamil (தமிழ் விளக்கம்).
6. Subject: Must strictly be one of: 'MAT' | 'SAT_MATHS' | 'SAT_SCIENCE' | 'SAT_SOCIAL'.`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let lastError = '';
    let responseData: any = null;

    for (const model of models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          responseData = await res.json();
          break;
        } else {
          const errText = await res.text();
          lastError = `${model} failed (${res.status}): ${errText}`;
        }
      } catch (e: any) {
        lastError = `${model} fetch error: ${e.message}`;
      }
    }

    if (!responseData) {
      return errorResponse(`AI question generation failed across models. ${lastError}`, 502);
    }

    const candidateText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = candidateText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

    let parsed: any = { questions: [] };
    try {
      parsed = JSON.parse(cleanJson || '{"questions": []}');
      if (Array.isArray(parsed)) {
        parsed = { questions: parsed };
      }
    } catch {
      parsed = { questions: [] };
    }

    const rawList = parsed.questions || [];
    const generated = rawList.map((q: any, i: number) => ({
      id: `ai-gen-${Date.now()}-${i + 1}`,
      subject: ['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'].includes(q.subject) ? q.subject : (subject || 'MAT'),
      topic: q.topic || topic || 'பொதுப் பகுதி',
      questionText: repairMangledLatex(q.questionText || ''),
      options: (q.options && q.options.length === 4 ? q.options : [
        { id: 'A', text: q.options?.[0]?.text || 'விருப்பம் A' },
        { id: 'B', text: q.options?.[1]?.text || 'விருப்பம் B' },
        { id: 'C', text: q.options?.[2]?.text || 'விருப்பம் C' },
        { id: 'D', text: q.options?.[3]?.text || 'விருப்பம் D' },
      ]).map((opt: any, oIdx: number) => ({
        id: (['A', 'B', 'C', 'D'][oIdx] || 'A') as 'A' | 'B' | 'C' | 'D',
        text: repairMangledLatex(String(opt.text || '')),
      })),
      correctOption: ['A', 'B', 'C', 'D'].includes(q.correctOption?.toUpperCase()) ? q.correctOption.toUpperCase() : 'A',
      explanation: repairMangledLatex(q.explanation || ''),
      marks: 1,
      negativeMarks: 0,
    }));

    return jsonResponse({
      success: true,
      count: generated.length,
      questions: generated,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

