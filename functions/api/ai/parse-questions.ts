import { Env, jsonResponse, errorResponse, repairMangledLatex } from '../../helpers';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse('GEMINI_API_KEY is not configured on Cloudflare environment variables.', 500);
  }

  try {
    const body: any = await context.request.json().catch(() => ({}));
    const { inputType, content, images, mimeType, defaultSubject } = body;

    if (!content && (!images || !Array.isArray(images) || images.length === 0)) {
      return errorResponse('Content or images payload is required for extraction', 400);
    }

    const systemPrompt = `You are an expert NMMS (National Means-cum-Merit Scholarship) exam master and question parser specialized in TAMIL MEDIUM (தமிழ் வழிக் கல்வி).
Your task is to accurately extract or format multiple-choice questions in TAMIL (தமிழ் மொழி) from the provided input (Photo, PDF, or Text).

CRITICAL LANGUAGE REQUIREMENT:
- All extracted questions MUST BE IN TAMIL (தமிழ் வழிக் கல்வி).
- If the source is in Tamil, preserve authentic Tamil terminology. If the source is in English or bilingual, translate and format the question statement, 4 options, and explanations into clear, accurate Tamil medium terminology aligned with Tamil Nadu SCERT Class 7 & 8 textbooks.

MATHEMATICAL EQUATIONS & NOTATIONS (LaTeX / KaTeX Formatting):
- Format all mathematical equations, formulas, fractions, powers, roots, variables, and expressions cleanly using LaTeX enclosed in single dollar signs ($...$) for inline math (e.g. $x^2 + 5x + 6 = 0$, $\\frac{3}{4}$, $\\sqrt{144} = 12$, $2^{10}$, $a^2 + b^2 = c^2$, $\\pi r^2 h$, $30^\\circ$).
- Ensure fractions use $\\frac{a}{b}$, powers use $x^n$, roots use $\\sqrt{x}$, multiplication uses $\\times$, plus-minus uses $\\pm$, division uses $\\div$.
- Apply this mathematical notation to question statements, options, and step-by-step solutions/explanations.

NMMS Exam Structure (Tamil Nadu SCERT Standard):
- MAT: மனத்திறன் தேர்வு (Reasoning, எண் தொடர், ஒப்புமை, பொருந்தாத எண்/வார்த்தை, குறியீட்டு மொழி, திசை அறிதல், இரத்த உறவுகள்)
- SAT_MATHS: கணிதம் (விகிதமுறு எண்கள், நேரியல் சமன்பாடுகள், வர்க்கமூலம், அளவியல், அடுக்குகள்)
- SAT_SCIENCE: அறிவியல் (ஒளி, ஒலி, விசை மற்றும் அழுத்தம், செல் அமைப்பு, நுண்ணுயிரிகள், உலோகங்கள் மற்றும் அலோகங்கள்)
- SAT_SOCIAL: சமூக அறிவியல் (வரலாறு, 1857 புரட்சி, இந்திய அரசியலமைப்பு, வளங்கள், புவியியல்)

Guidelines:
1. Extract ALL multiple choice questions cleanly in Tamil with their 4 options (A, B, C, D in Tamil).
2. Categorize each question into exact subject code: 'MAT' | 'SAT_MATHS' | 'SAT_SCIENCE' | 'SAT_SOCIAL'.
3. Identify the accurate correct option ('A', 'B', 'C', or 'D').
4. Provide a clear, step-by-step explanation in Tamil (விளக்கம்) with complete math steps in LaTeX.
5. Identify the topic name in Tamil (e.g., "எண் தொடர்", "செல் அமைப்பு", "இந்திய அரசியலமைப்பு").
6. Set marks to 1.`;

    const parts: any[] = [];

    if (inputType === 'image') {
      const rawImages: string[] = Array.isArray(images) && images.length > 0 ? images : (content ? [content] : []);
      for (const imgStr of rawImages) {
        const base64Data = imgStr.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType || 'image/jpeg',
          },
        });
      }
      parts.push({
        text: `Please read and extract all NMMS multiple choice questions across all ${rawImages.length} uploaded photo(s)/page(s) into structured JSON format in TAMIL MEDIUM (தமிழ் வழி வினாக்கள்). Default subject preference: ${defaultSubject || 'Auto-detect'}. Extract every question sequentially.`,
      });
    } else if (inputType === 'pdf') {
      const base64Data = (content || '').replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: 'application/pdf',
        },
      });
      parts.push({
        text: `Please read and extract all NMMS multiple choice questions from this uploaded PDF document into structured JSON format in TAMIL MEDIUM (தமிழ் வழி வினாக்கள்). Default subject preference: ${defaultSubject || 'Auto-detect'}.`,
      });
    } else {
      parts.push({
        text: `Extract all NMMS multiple choice questions from the following text into structured JSON format strictly in TAMIL MEDIUM (தமிழ் வழி வினாக்கள்):\n\n${content}`,
      });
    }

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts }],
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
      return errorResponse(`AI extraction failed across models. ${lastError}`, 502);
    }

    const candidateText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = candidateText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

    let parsedJson: any = { extractedQuestions: [] };
    try {
      parsedJson = JSON.parse(cleanJson || '{"extractedQuestions": []}');
      if (Array.isArray(parsedJson)) {
        parsedJson = { extractedQuestions: parsedJson };
      }
    } catch {
      parsedJson = { extractedQuestions: [] };
    }

    const rawList = parsedJson.extractedQuestions || parsedJson.questions || [];
    const formattedQuestions = rawList.map((q: any, i: number) => ({
      id: `ai-ext-${Date.now()}-${i + 1}`,
      subject: ['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'].includes(q.subject) ? q.subject : (defaultSubject || 'MAT'),
      topic: q.topic || 'பொதுத் தலைப்பு',
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
      explanation: repairMangledLatex(q.explanation || 'NMMS வினாத்தாள் பகுப்பாய்வு மூலம் பெறப்பட்ட படிமுறை தீர்வு.'),
      marks: 1,
      negativeMarks: 0,
    }));

    return jsonResponse({
      success: true,
      count: formattedQuestions.length,
      questions: formattedQuestions,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
};

