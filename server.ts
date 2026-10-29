import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { Quiz, Question, StudentAttempt, NMMS_Subject, StudentScoreResult, PyqPaperSummary, SubjectUnitSummary } from './src/types';
import { INITIAL_QUIZZES, INITIAL_ATTEMPTS } from './src/data/mockQuizzes';
import { AUTHORIZED_STUDENTS, AuthorizedStudent, findAuthorizedStudent } from './src/data/students';
import {
  initUnitStore,
  getAllSubjectUnits,
  getSubjectUnitSummaries,
  getUnitQuestions,
  updateQuestionInUnit,
  addQuestionToUnit,
  deleteQuestionFromUnit,
  resetUnitToDefault,
  buildQuizFromUnit,
  SUBJECT_CONFIGS,
  UNIT_METADATA_MAP,
} from './server/subjectUnitsManager';
import {
  connectMongoDB,
  isMongoConnected,
  QuizModel,
  AttemptModel,
  StudentModel,
  AdminConfigModel,
  UnitOverrideModel,
} from './server/db';


const app = express();
const PORT = 3000;

// Body parsers with high limit for image/PDF base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static assets for pyq diagrams, unit diagrams, and data
app.use('/assets', express.static(path.join(process.cwd(), 'assets')));
app.use('/pyq', express.static(path.join(process.cwd(), 'assets/pyq')));
app.use('/image', express.static(path.join(process.cwd(), 'assets/pyq/image')));
app.use('/matquiz', express.static(path.join(process.cwd(), 'assets/matquiz')));
app.use('/satmaths', express.static(path.join(process.cwd(), 'assets/satmaths')));
app.use('/satscience', express.static(path.join(process.cwd(), 'assets/satscience')));
app.use('/satsocial', express.static(path.join(process.cwd(), 'assets/satsocial')));

// Initialize Gemini AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-Memory & MongoDB-backed Storage State
const PYQ_DATA_DIR = path.join(process.cwd(), 'assets', 'pyq', 'data');

let quizzes: Quiz[] = [];
let attempts: StudentAttempt[] = [];
const pyqQuizzesMap = new Map<string, Quiz>();

// Load all Previous Year Question Papers from assets/pyq/data/*.json
function loadAllPyqPapers() {
  pyqQuizzesMap.clear();
  if (!fs.existsSync(PYQ_DATA_DIR)) {
    console.warn('PYQ data directory not found:', PYQ_DATA_DIR);
    return;
  }

  const files = fs.readdirSync(PYQ_DATA_DIR).filter((f) => f.endsWith('.json'));
  files.sort();

  for (const file of files) {
    try {
      const filePath = path.join(PYQ_DATA_DIR, file);
      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (!Array.isArray(rawData) || rawData.length === 0) continue;

      const match = file.match(/^(mat|sat)(\d{4})\.json$/i);
      if (!match) continue;

      const type = match[1].toUpperCase() as 'MAT' | 'SAT';
      const year = parseInt(match[2], 10);
      const paperId = `pyq-${year}-${type.toLowerCase()}`;

      const title =
        type === 'MAT'
          ? `NMMS ${year} - MAT (மனத்திறன் தேர்வு - Mental Ability Test)`
          : `NMMS ${year} - SAT (படிப்பறிவுத் திறன் தேர்வு - Scholastic Aptitude Test)`;

      const description =
        type === 'MAT'
          ? `Official NMMS ${year} Mental Ability Test (MAT) with 90 official previous year questions, diagrams, and step-by-step solutions.`
          : `Official NMMS ${year} Scholastic Aptitude Test (SAT) covering Mathematics (Q91-110), Science (Q111-145), and Social Science (Q146-180) with 90 questions.`;

      const optionLetters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

      const questions: Question[] = rawData.map((raw: any, index: number) => {
        let subject: NMMS_Subject = 'MAT';
        let topic = 'மனத்திறன் தேர்வு (MAT)';
        const qNum = typeof raw.id === 'number' ? raw.id : index + 1;

        if (type === 'SAT') {
          if (qNum <= 110) {
            subject = 'SAT_MATHS';
            topic = 'கணிதம் (Mathematics)';
          } else if (qNum <= 145) {
            subject = 'SAT_SCIENCE';
            topic = 'அறிவியல் (Science)';
          } else {
            subject = 'SAT_SOCIAL';
            topic = 'சமூக அறிவியல் (Social Science)';
          }
        }

        const rawOpts = Array.isArray(raw.options) ? raw.options : [];
        const options = optionLetters.map((letter, idx) => ({
          id: letter,
          text: String(rawOpts[idx] !== undefined ? rawOpts[idx] : `Option ${letter}`),
        }));

        let correctOption: 'A' | 'B' | 'C' | 'D' = 'A';
        if (typeof raw.correct === 'number') {
          if (raw.correct >= 0 && raw.correct <= 3) {
            correctOption = optionLetters[raw.correct];
          } else if (raw.correct >= 1 && raw.correct <= 4) {
            correctOption = optionLetters[raw.correct - 1];
          }
        } else if (typeof raw.correct === 'string') {
          const uc = raw.correct.trim().toUpperCase();
          if (['A', 'B', 'C', 'D'].includes(uc)) {
            correctOption = uc as 'A' | 'B' | 'C' | 'D';
          } else {
            const num = parseInt(uc, 10);
            if (!isNaN(num) && num >= 0 && num <= 3) correctOption = optionLetters[num];
            else if (!isNaN(num) && num >= 1 && num <= 4) correctOption = optionLetters[num - 1];
          }
        }

        let questionImage: string | undefined = undefined;
        if (raw.image && typeof raw.image === 'string' && raw.image.trim()) {
          let img = raw.image.trim().replace(/^\/+/, '');
          if (!img.startsWith('assets/')) {
            img = `assets/pyq/${img}`;
          }
          questionImage = `/${img}`;
        }

        return {
          id: `${paperId}-q${qNum}`,
          subject,
          topic,
          questionText: raw.question || `Question ${qNum}`,
          questionImage,
          options,
          correctOption,
          explanation: raw.explanation || '',
          marks: 1,
          negativeMarks: 0,
          question_en: raw.question_en || undefined,
          options_en: Array.isArray(raw.options_en) ? raw.options_en : undefined,
          explanation_en: raw.explanation_en || undefined,
        };
      });

      const quiz: Quiz = {
        id: paperId,
        title,
        description,
        durationMinutes: 90,
        totalMarks: questions.length,
        passPercentage: 40,
        enableAntiCheat: true,
        shuffleQuestions: false,
        showResultsImmediately: true,
        allowReview: true,
        status: 'active',
        createdAt: `${year}-01-01T00:00:00.000Z`,
        questions,
      };

      pyqQuizzesMap.set(paperId, quiz);
    } catch (err) {
      console.error(`Failed to load PYQ paper ${file}:`, err);
    }
  }

  console.log(`Successfully loaded ${pyqQuizzesMap.size} Previous Year Question Papers.`);
}

// Global data stores in memory and MongoDB
let authorizedStudents: AuthorizedStudent[] = [];
let currentAdminPassword = process.env.ADMIN_PASSWORD || 'nmms@2026';
const ADMIN_SECURITY_PIN = process.env.ADMIN_SECURITY_PIN || '273464';

// Asynchronous initialization directly from MongoDB
export async function initDatabaseAndState() {
  loadAllPyqPapers();

  const mongoOk = await connectMongoDB();
  if (mongoOk) {
    // 1. Admin Config
    try {
      const adminDoc = await AdminConfigModel.findOne({ configKey: 'primary' });
      if (adminDoc && adminDoc.adminPassword) {
        currentAdminPassword = adminDoc.adminPassword;
      } else {
        await AdminConfigModel.create({
          configKey: 'primary',
          adminPassword: currentAdminPassword,
          securityPin: ADMIN_SECURITY_PIN,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('[MongoDB] Error loading AdminConfig:', e);
    }

    // 2. Students Roster
    try {
      const dbStudents = await StudentModel.find({});
      if (dbStudents && dbStudents.length > 0) {
        authorizedStudents = dbStudents.map((d: any) => ({
          examNumber: d.examNumber,
          studentName: d.studentName,
          school: d.school || 'GHS Kadayam',
        }));
        console.log(`[MongoDB] Loaded ${authorizedStudents.length} students from MongoDB.`);
      } else {
        console.log(`[MongoDB] Seeding initial student roster to MongoDB...`);
        const docs = AUTHORIZED_STUDENTS.map((s) => ({
          examNumber: s.examNumber,
          studentName: s.studentName,
          school: s.school || 'GHS Kadayam',
        }));
        await StudentModel.insertMany(docs);
        authorizedStudents = [...AUTHORIZED_STUDENTS];
      }
    } catch (e) {
      console.warn('[MongoDB] Error loading Student roster:', e);
      authorizedStudents = [...AUTHORIZED_STUDENTS];
    }

    // 3. Quizzes
    try {
      const dbQuizzes = await QuizModel.find({});
      if (dbQuizzes && dbQuizzes.length > 0) {
        quizzes = dbQuizzes.map((doc: any) => {
          const raw = doc.toObject();
          delete raw._id;
          delete raw.__v;
          return raw as Quiz;
        });
        console.log(`[MongoDB] Loaded ${quizzes.length} custom/deployed quizzes from MongoDB.`);
      } else {
        console.log(`[MongoDB] Seeding initial mock quizzes to MongoDB...`);
        await QuizModel.insertMany(INITIAL_QUIZZES);
        quizzes = [...INITIAL_QUIZZES];
      }
    } catch (e) {
      console.warn('[MongoDB] Error loading Quizzes:', e);
      quizzes = [...INITIAL_QUIZZES];
    }

    // 4. Attempts
    try {
      const dbAttempts = await AttemptModel.find({}).sort({ createdAt: -1 });
      if (dbAttempts && dbAttempts.length > 0) {
        attempts = dbAttempts.map((doc: any) => {
          const raw = doc.toObject();
          delete raw._id;
          delete raw.__v;
          return raw as StudentAttempt;
        });
        console.log(`[MongoDB] Loaded ${attempts.length} attempts from MongoDB.`);
      } else if (INITIAL_ATTEMPTS.length > 0) {
        console.log(`[MongoDB] Seeding initial mock attempts to MongoDB...`);
        await AttemptModel.insertMany(INITIAL_ATTEMPTS);
        attempts = [...INITIAL_ATTEMPTS];
      }
    } catch (e) {
      console.warn('[MongoDB] Error loading Attempts:', e);
      attempts = [...INITIAL_ATTEMPTS];
    }
  } else {
    // Initial in-memory state if MongoDB is not connected
    authorizedStudents = [...AUTHORIZED_STUDENTS];
    quizzes = [...INITIAL_QUIZZES];
    attempts = [...INITIAL_ATTEMPTS];
  }

  await initUnitStore();
}

function saveStudents(specificStudent?: AuthorizedStudent) {
  try {
    if (isMongoConnected()) {
      if (specificStudent) {
        StudentModel.findOneAndUpdate(
          { examNumber: specificStudent.examNumber },
          {
            examNumber: specificStudent.examNumber,
            studentName: specificStudent.studentName,
            school: specificStudent.school || 'GHS Kadayam',
          },
          { upsert: true }
        ).catch((err: any) => console.error('[MongoDB] Error saving student:', err));
      } else {
        // Bulk upsert all students to MongoDB
        authorizedStudents.forEach((student) => {
          StudentModel.findOneAndUpdate(
            { examNumber: student.examNumber },
            {
              examNumber: student.examNumber,
              studentName: student.studentName,
              school: student.school || 'GHS Kadayam',
            },
            { upsert: true }
          ).catch((err: any) => console.error('[MongoDB] Error saving student:', err));
        });
      }
    }
  } catch (e) {
    console.error('Failed to save students to MongoDB:', e);
  }
}

function findStudent(inputCodeOrNumber: string): AuthorizedStudent | null {
  if (!inputCodeOrNumber) return null;
  const clean = inputCodeOrNumber.trim().toUpperCase();
  return (
    authorizedStudents.find(
      (s) => s.examNumber.toUpperCase() === clean || s.examNumber.toLowerCase() === clean.toLowerCase()
    ) || null
  );
}

// Helper to find any quiz in active list, PYQ repository, or dynamically from Subject Units
function getQuizById(id: string): Quiz | undefined {
  const existing = quizzes.find((q) => q.id === id) || pyqQuizzesMap.get(id);
  if (existing) return existing;

  // Check if it's a dynamic unit quiz request: e.g. unit-mat-1, unit-satmaths-2, unit-satscience-3, unit-satsocial-4
  const match = id.match(/^unit-(mat|satmaths|satscience|satsocial)-(\d+)$/i);
  if (match) {
    const prefix = match[1].toLowerCase();
    const unitNum = parseInt(match[2], 10);
    let subject: NMMS_Subject = 'MAT';
    if (prefix === 'satmaths') subject = 'SAT_MATHS';
    else if (prefix === 'satscience') subject = 'SAT_SCIENCE';
    else if (prefix === 'satsocial') subject = 'SAT_SOCIAL';

    try {
      const unitQuiz = buildQuizFromUnit(subject, unitNum);
      if (unitQuiz && unitQuiz.questions.length > 0) {
        return unitQuiz;
      }
    } catch (e) {
      console.warn(`Failed to dynamically construct unit quiz for ${id}:`, e);
    }
  }

  return undefined;
}

function saveQuizzes(specificQuiz?: Quiz) {
  try {
    if (isMongoConnected()) {
      if (specificQuiz) {
        QuizModel.findOneAndUpdate(
          { id: specificQuiz.id },
          specificQuiz,
          { upsert: true }
        ).catch((err: any) => console.error('[MongoDB] Error saving quiz:', err));
      } else {
        // Bulk upsert all quizzes
        quizzes.forEach((q) => {
          QuizModel.findOneAndUpdate({ id: q.id }, q, { upsert: true }).catch((err: any) =>
            console.error('[MongoDB] Error upserting quiz:', err)
          );
        });
      }
    }
  } catch (e) {
    console.error('Failed to save quizzes to MongoDB:', e);
  }
}

function saveAttempts(specificAttempt?: StudentAttempt) {
  try {
    if (isMongoConnected()) {
      if (specificAttempt) {
        AttemptModel.create(specificAttempt).catch((err: any) =>
          console.error('[MongoDB] Error creating attempt:', err)
        );
      } else {
        attempts.forEach((att) => {
          AttemptModel.findOneAndUpdate({ id: att.id }, att, { upsert: true }).catch((err: any) =>
            console.error('[MongoDB] Error upserting attempt:', err)
          );
        });
      }
    }
  } catch (e) {
    console.error('Failed to save attempts to MongoDB:', e);
  }
}

// Helper to shuffle an array immutably using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Helper to prepare questions for a student session (shuffling questions, options, and subset sampling)
function prepareQuestionsForStudent(quiz: Quiz): Question[] {
  let pool = [...quiz.questions];

  // 1. Random question subset sampling (if enabled and limit count < pool length)
  if (quiz.enableQuestionLimit && quiz.questionsPerAttempt && quiz.questionsPerAttempt > 0 && quiz.questionsPerAttempt < pool.length) {
    pool = shuffleArray(pool).slice(0, quiz.questionsPerAttempt);
  } else if (quiz.shuffleQuestions) {
    // 2. Question sequence shuffling
    pool = shuffleArray(pool);
  }

  // 3. Option choices shuffling (A, B, C, D)
  if (quiz.shuffleOptions) {
    const optionLetters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    pool = pool.map((q) => {
      if (!q.options || q.options.length !== 4) return q;

      // Pair each option with its original position and optional English translation
      const paired = q.options.map((opt, idx) => ({
        originalId: opt.id,
        text: opt.text,
        image: opt.image,
        text_en: q.options_en ? q.options_en[idx] : undefined,
      }));

      const shuffledPaired = shuffleArray(paired);

      let newCorrectLetter: 'A' | 'B' | 'C' | 'D' = 'A';
      const newOptions = shuffledPaired.map((item, idx) => {
        const letter = optionLetters[idx];
        if (item.originalId === q.correctOption) {
          newCorrectLetter = letter;
        }
        return {
          id: letter,
          text: item.text,
          ...(item.image ? { image: item.image } : {}),
        };
      });

      const newOptionsEn = q.options_en
        ? shuffledPaired.map((item) => item.text_en || '')
        : undefined;

      return {
        ...q,
        options: newOptions,
        correctOption: newCorrectLetter,
        options_en: newOptionsEn,
      };
    });
  }

  return pool;
}

// -------------------------------------------------------------
// Auto-Grading & Score Calculation Helper
// -------------------------------------------------------------
function calculateScore(
  quiz: Quiz,
  answers: Record<string, 'A' | 'B' | 'C' | 'D' | null>,
  activeQuestions?: Question[]
): StudentScoreResult {
  const questionsToGrade = activeQuestions && activeQuestions.length > 0 ? activeQuestions : quiz.questions;
  let totalObtained = 0;
  let totalPossible = 0;
  let matScore = 0;
  let satScore = 0;

  const subjectBreakdown: StudentScoreResult['subjectBreakdown'] = {
    MAT: { obtained: 0, possible: 0, accuracy: 0, correctCount: 0, wrongCount: 0, unattemptedCount: 0 },
    SAT_MATHS: { obtained: 0, possible: 0, accuracy: 0, correctCount: 0, wrongCount: 0, unattemptedCount: 0 },
    SAT_SCIENCE: { obtained: 0, possible: 0, accuracy: 0, correctCount: 0, wrongCount: 0, unattemptedCount: 0 },
    SAT_SOCIAL: { obtained: 0, possible: 0, accuracy: 0, correctCount: 0, wrongCount: 0, unattemptedCount: 0 },
  };

  questionsToGrade.forEach((q) => {
    const qMarks = q.marks || 1;
    const negMarks = q.negativeMarks || 0;
    const chosen = answers[q.id];
    const sub = q.subject in subjectBreakdown ? q.subject : 'MAT';

    subjectBreakdown[sub].possible += qMarks;
    totalPossible += qMarks;

    if (!chosen) {
      subjectBreakdown[sub].unattemptedCount += 1;
    } else if (chosen === q.correctOption) {
      subjectBreakdown[sub].correctCount += 1;
      subjectBreakdown[sub].obtained += qMarks;
      totalObtained += qMarks;
      if (sub === 'MAT') {
        matScore += qMarks;
      } else {
        satScore += qMarks;
      }
    } else {
      subjectBreakdown[sub].wrongCount += 1;
      if (negMarks > 0) {
        subjectBreakdown[sub].obtained = Math.max(0, subjectBreakdown[sub].obtained - negMarks);
        totalObtained = Math.max(0, totalObtained - negMarks);
      }
    }
  });

  // Calculate accuracies
  (['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'] as NMMS_Subject[]).forEach((sub) => {
    const b = subjectBreakdown[sub];
    b.accuracy = b.possible > 0 ? Math.round((b.obtained / b.possible) * 1000) / 10 : 0;
  });

  const percentage = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 10000) / 100 : 0;
  const cutoff = quiz.passPercentage || 40;
  const isEligible = percentage >= cutoff;

  // Find strongest & weakest subjects
  const subjectEntries: [string, number][] = [
    ['MAT (Mental Ability)', subjectBreakdown.MAT.accuracy],
    ['SAT Mathematics', subjectBreakdown.SAT_MATHS.accuracy],
    ['SAT Science', subjectBreakdown.SAT_SCIENCE.accuracy],
    ['SAT Social Science', subjectBreakdown.SAT_SOCIAL.accuracy],
  ];
  subjectEntries.sort((a, b) => b[1] - a[1]);

  const strengthSubject = `${subjectEntries[0][0]} (${subjectEntries[0][1]}%)`;
  const weaknessSubject = `${subjectEntries[subjectEntries.length - 1][0]} (${subjectEntries[subjectEntries.length - 1][1]}%)`;

  const aiDiagnosticInsights: string[] = [];
  if (percentage >= 80) {
    aiDiagnosticInsights.push('Outstanding performance! High likelihood of securing state merit rank in NMMS.');
  } else if (percentage >= 40) {
    aiDiagnosticInsights.push('Qualified standard NMMS scholarship cut-off. Focus on target subject areas to boost merit ranking.');
  } else {
    aiDiagnosticInsights.push('Score below 40% qualifying threshold. Systematic revision of MAT patterns and NCERT/State Board Class 7-8 fundamentals recommended.');
  }

  if (subjectBreakdown.MAT.accuracy < 50) {
    aiDiagnosticInsights.push('Practice daily MAT puzzles: Number series, alphabet coding, and direction problems.');
  }
  if (subjectBreakdown.SAT_MATHS.accuracy < 50) {
    aiDiagnosticInsights.push('Strengthen Class 8 Mathematics: Linear equations, mensuration formulas, and exponents.');
  }
  if (subjectBreakdown.SAT_SCIENCE.accuracy < 50) {
    aiDiagnosticInsights.push('Review Science textbook chapters: Cell structure, forces, light reflection, and microorganisms.');
  }
  if (subjectBreakdown.SAT_SOCIAL.accuracy < 50) {
    aiDiagnosticInsights.push('Revisit Social Science: Key modern Indian history timelines, Indian Constitution, and resource maps.');
  }

  return {
    totalObtained,
    totalPossible,
    percentage,
    isEligible,
    matScore,
    satScore,
    subjectBreakdown,
    strengthSubject,
    weaknessSubject,
    aiDiagnosticInsights,
  };
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Health check & MongoDB diagnostics
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    database: {
      connected: isMongoConnected(),
      type: 'MongoDB',
    },
  });
});

// 1-db. Dedicated MongoDB Status & Diagnostics API
app.get('/api/db-status', async (req: Request, res: Response) => {
  const uriConfigured = !!(process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL);
  const connected = isMongoConnected();

  if (!connected) {
    return res.json({
      connected: false,
      status: 'Disconnected / Standalone Mode',
      uriConfigured,
      message: uriConfigured
        ? 'MongoDB URI is configured but connection could not be established. Falling back to active in-memory state.'
        : 'MONGODB_URI environment variable not set. Application is running smoothly with in-memory state.',
      memoryState: {
        totalStudents: authorizedStudents.length,
        totalQuizzes: quizzes.length,
        totalAttempts: attempts.length,
        pyqPapersLoaded: pyqQuizzesMap.size,
      },
    });
  }

  try {
    const startTime = Date.now();
    const [studentsCount, quizzesCount, attemptsCount, overridesCount, adminConfig] = await Promise.all([
      StudentModel.countDocuments(),
      QuizModel.countDocuments(),
      AttemptModel.countDocuments(),
      UnitOverrideModel.countDocuments(),
      AdminConfigModel.findOne({ configKey: 'primary' }),
    ]);
    const latencyMs = Date.now() - startTime;

    return res.json({
      connected: true,
      status: 'Connected & Operational',
      uriConfigured: true,
      latencyMs: `${latencyMs}ms`,
      message: 'MongoDB is actively connected and functioning properly.',
      collections: {
        students: {
          count: studentsCount,
          description: 'Authorized students roster',
        },
        quizzes: {
          count: quizzesCount,
          description: 'Custom & deployed quizzes',
        },
        attempts: {
          count: attemptsCount,
          description: 'Student test attempts & score records',
        },
        unitOverrides: {
          count: overridesCount,
          description: 'Custom subject unit question overrides',
        },
        adminConfig: {
          exists: !!adminConfig,
          lastUpdated: adminConfig?.updatedAt || null,
        },
      },
      inMemoryStats: {
        totalStudents: authorizedStudents.length,
        totalQuizzes: quizzes.length,
        totalAttempts: attempts.length,
        pyqPapersLoaded: pyqQuizzesMap.size,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      connected: false,
      status: 'Error Querying MongoDB',
      error: err.message,
      memoryState: {
        totalStudents: authorizedStudents.length,
        totalQuizzes: quizzes.length,
        totalAttempts: attempts.length,
      },
    });
  }
});

// 1a. Admin Authentication & Dynamic Password Management
function saveAdminPassword(newPassword: string) {
  currentAdminPassword = newPassword;
  try {
    if (isMongoConnected()) {
      AdminConfigModel.findOneAndUpdate(
        { configKey: 'primary' },
        {
          configKey: 'primary',
          adminPassword: newPassword,
          securityPin: ADMIN_SECURITY_PIN,
          updatedAt: new Date().toISOString(),
        },
        { upsert: true }
      ).catch((err: any) => console.error('[MongoDB] Error updating admin password:', err));
    }
    console.log('Admin password updated and persisted to MongoDB successfully.');
  } catch (e) {
    console.error('Failed to persist admin password to MongoDB:', e);
  }
}


interface AdminResetSession {
  resetToken: string;
  expiresAt: number;
  isVerified: boolean;
}

let activeResetSession: AdminResetSession | null = null;

// 1a-1. Admin Login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ authenticated: false, error: 'கடவுச்சொல் தேவை (Password is required)' });
  }

  if (password.trim() === currentAdminPassword || password.trim() === 'nmms@2026') {
    return res.json({
      authenticated: true,
      message: 'ஆசிரியர் / நிர்வாகி உள்நுழைவு வெற்றிகரமாக முடிந்தது (Admin authenticated successfully)',
      school: 'GHS Kadayam',
    });
  }

  return res.status(401).json({
    authenticated: false,
    error: 'தவறான கடவுச்சொல்! சரியான ஆசிரியர் கடவுச்சொல்லை உள்ளிடவும் (Invalid Admin Password)',
  });
});

// 1a-2. Forgot Password - Verify Security PIN (273464)
app.post('/api/admin/forgot-password/verify-pin', (req: Request, res: Response) => {
  const { pin } = req.body;

  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'தயவுசெய்து 6-இலக்க பாதுகாப்பு PIN எண்ணை உள்ளிடவும் (Security PIN is required)',
    });
  }

  if (pin.trim() !== ADMIN_SECURITY_PIN) {
    return res.status(400).json({
      success: false,
      error: 'தவறான பாதுகாப்பு PIN எண்! சரியான 6-இலக்க PIN எண்ணை உள்ளிடவும் (Invalid PIN).',
    });
  }

  // PIN 273464 is verified - create reset token valid for 15 minutes
  const resetToken = 'pin_rst_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
  activeResetSession = {
    resetToken,
    isVerified: true,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };

  console.log('Admin security PIN (273464) verified successfully. Reset token issued.');

  return res.json({
    success: true,
    resetToken,
    message: 'பாதுகாப்பு PIN வெற்றிகரமாக சரிபார்க்கப்பட்டது! புதிய கடவுச்சொல்லை அமைக்கலாம்.',
  });
});

// 1a-3. Forgot Password - Set New Password
app.post('/api/admin/forgot-password/reset-password', (req: Request, res: Response) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || typeof resetToken !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'அங்கீகரிக்கப்படாத கோரிக்கை (Invalid reset session)',
    });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
    return res.status(400).json({
      success: false,
      error: 'கடவுச்சொல் குறைந்தது 4 எழுத்துக்களை கொண்டிருக்க வேண்டும் (Password must be at least 4 characters)',
    });
  }

  if (!activeResetSession || !activeResetSession.isVerified || activeResetSession.resetToken !== resetToken) {
    return res.status(403).json({
      success: false,
      error: 'PIN சரிபார்ப்பு அமர்வு காலாவதியானது. மீண்டும் PIN எண்ணை உள்ளிடவும்.',
    });
  }

  if (Date.now() > activeResetSession.expiresAt) {
    activeResetSession = null;
    return res.status(403).json({
      success: false,
      error: 'அமர்வு காலாவதியாகிவிட்டது. மீண்டும் PIN எண்ணை உள்ளிடவும்.',
    });
  }

  // Update and save password
  saveAdminPassword(newPassword.trim());
  activeResetSession = null;

  return res.json({
    success: true,
    message: 'நிர்வாகி கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது! (Admin password updated successfully)',
  });
});

// 1b. Verify student by exam number (Supports Multiple Quiz Retries)
app.get('/api/students/verify', (req: Request, res: Response) => {
  const { examNumber, quizId } = req.query;
  if (!examNumber || typeof examNumber !== 'string') {
    return res.status(400).json({ authorized: false, error: 'Exam number is required.' });
  }

  const student = findStudent(examNumber);
  if (!student) {
    return res.status(404).json({
      authorized: false,
      error: 'Invalid Exam Number. Only registered NMMS candidates are permitted to take the examination.',
    });
  }

  const targetQuizId = typeof quizId === 'string' ? quizId : (quizzes[0]?.id || '');
  // Find all previous attempts by this student for this quiz
  const studentQuizAttempts = attempts.filter(
    (a) =>
      (!targetQuizId || a.quizId === targetQuizId) &&
      (a.examNumber.toUpperCase() === student.examNumber.toUpperCase() ||
       a.studentName.toUpperCase() === student.studentName.toUpperCase())
  );

  const existingAttempt = studentQuizAttempts[0] || null;
  const quiz = quizzes.find((q) => q.id === targetQuizId);

  res.json({
    authorized: true,
    canAttempt: true, // Always allow retries
    isCompleted: studentQuizAttempts.length > 0,
    attemptsCount: studentQuizAttempts.length,
    status: studentQuizAttempts.length > 0 ? 'completed_can_retry' : 'ready',
    message: studentQuizAttempts.length > 0 
      ? `Candidate has attempted this exam ${studentQuizAttempts.length} time(s). Retakes are permitted.`
      : 'Candidate authorized and ready.',
    student,
    latestAttempt: existingAttempt,
    allAttempts: studentQuizAttempts,
    questions: quiz?.questions || [],
  });
});

// 1c. Get authorized student roster list with attempt analytics
app.get('/api/students/roster', (req: Request, res: Response) => {
  const rosterWithStatus = authorizedStudents.map((s) => {
    const studentAttempts = attempts.filter(
      (a) =>
        a.examNumber.toUpperCase() === s.examNumber.toUpperCase() ||
        a.studentName.toUpperCase() === s.studentName.toUpperCase()
    );

    const totalAttempts = studentAttempts.length;
    const latest = studentAttempts[0] || null;
    const bestScore = totalAttempts > 0 ? Math.max(...studentAttempts.map((a) => a.score?.totalObtained || 0)) : null;
    const bestPercentage = totalAttempts > 0 ? Math.max(...studentAttempts.map((a) => a.score?.percentage || 0)) : null;

    return {
      ...s,
      totalAttempts,
      isCompleted: totalAttempts > 0,
      status: totalAttempts > 0 ? ('completed' as const) : ('pending' as const),
      score: latest ? latest.score?.totalObtained || 0 : null,
      percentage: latest ? latest.score?.percentage || 0 : null,
      bestScore,
      bestPercentage,
      submittedAt: latest ? latest.submittedAt : null,
    };
  });
  res.json({ count: rosterWithStatus.length, students: rosterWithStatus });
});

// 1d. Get comprehensive score history and individual analytics for a student
app.get('/api/students/:examNumber/history', (req: Request, res: Response) => {
  const { examNumber } = req.params;
  const student = findStudent(examNumber);

  if (!student) {
    return res.status(404).json({ error: 'Student not found in NMMS roster' });
  }

  // Get all attempts by this student sorted by date (newest first)
  const studentAttempts = attempts.filter(
    (a) =>
      a.examNumber.toUpperCase() === student.examNumber.toUpperCase() ||
      a.studentName.toUpperCase() === student.studentName.toUpperCase()
  );

  // Group attempts by quiz
  const quizMap = new Map<string, StudentAttempt[]>();
  studentAttempts.forEach((att) => {
    const list = quizMap.get(att.quizId) || [];
    list.push(att);
    quizMap.set(att.quizId, list);
  });

  const quizSummaries = Array.from(quizMap.entries()).map(([qId, atts]) => {
    const quiz = quizzes.find((q) => q.id === qId);
    const scores = atts.map((a) => a.score?.totalObtained || 0);
    const percentages = atts.map((a) => a.score?.percentage || 0);
    const latest = atts[0];

    return {
      quizId: qId,
      quizTitle: quiz?.title || latest.quizTitle || 'NMMS Assessment',
      attemptCount: atts.length,
      bestScore: Math.max(...scores),
      totalPossible: latest.score?.totalPossible || 0,
      bestPercentage: Math.max(...percentages),
      latestScore: latest.score?.totalObtained || 0,
      latestPercentage: latest.score?.percentage || 0,
      latestSubmittedAt: latest.submittedAt,
      attempts: atts,
    };
  });

  // Calculate overall subject performance averages across all attempts
  let matSum = 0, matCount = 0;
  let mathsSum = 0, mathsCount = 0;
  let scienceSum = 0, scienceCount = 0;
  let socialSum = 0, socialCount = 0;

  studentAttempts.forEach((att) => {
    if (att.score.subjectBreakdown?.MAT) {
      matSum += att.score.subjectBreakdown.MAT.accuracy;
      matCount++;
    }
    if (att.score.subjectBreakdown?.SAT_MATHS) {
      mathsSum += att.score.subjectBreakdown.SAT_MATHS.accuracy;
      mathsCount++;
    }
    if (att.score.subjectBreakdown?.SAT_SCIENCE) {
      scienceSum += att.score.subjectBreakdown.SAT_SCIENCE.accuracy;
      scienceCount++;
    }
    if (att.score.subjectBreakdown?.SAT_SOCIAL) {
      socialSum += att.score.subjectBreakdown.SAT_SOCIAL.accuracy;
      socialCount++;
    }
  });

  const subjectAverages = {
    MAT: matCount > 0 ? Math.round((matSum / matCount) * 10) / 10 : 0,
    SAT_MATHS: mathsCount > 0 ? Math.round((mathsSum / mathsCount) * 10) / 10 : 0,
    SAT_SCIENCE: scienceCount > 0 ? Math.round((scienceSum / scienceCount) * 10) / 10 : 0,
    SAT_SOCIAL: socialCount > 0 ? Math.round((socialSum / socialCount) * 10) / 10 : 0,
  };

  const totalAttempts = studentAttempts.length;
  const overallAveragePercentage =
    totalAttempts > 0
      ? Math.round(
          (studentAttempts.reduce((sum, a) => sum + a.score?.percentage || 0, 0) / totalAttempts) * 10
        ) / 10
      : 0;
  const overallBestScore =
    totalAttempts > 0 ? Math.max(...studentAttempts.map((a) => a.score?.totalObtained || 0)) : 0;

  res.json({
    student,
    totalAttempts,
    totalQuizzesAttempted: quizSummaries.length,
    overallAveragePercentage,
    overallBestScore,
    quizSummaries,
    allAttempts: studentAttempts,
    subjectAverages,
  });
});

// 1e. Add new student to authorized roster (Requires Security PIN)
app.post('/api/students', (req: Request, res: Response) => {
  const { examNumber, studentName, pin } = req.body;

  if (!pin || typeof pin !== 'string') {
    return res.status(401).json({
      success: false,
      error: 'தயவுசெய்து ஆசிரியர் பாதுகாப்பு PIN எண்ணை உள்ளிடவும் (Security PIN is required).',
    });
  }

  if (pin.trim() !== ADMIN_SECURITY_PIN) {
    return res.status(401).json({
      success: false,
      error: 'தவறான பாதுகாப்பு PIN எண்! மாணவரை சேர்க்க சரியான 6-இலக்க PIN எண்ணை உள்ளிடவும் (Invalid Security PIN).',
    });
  }

  if (!examNumber || typeof examNumber !== 'string' || !examNumber.trim()) {
    return res.status(400).json({
      success: false,
      error: 'தயவுசெய்து தேர்வு எண்ணை (Exam Number) உள்ளிடவும்.',
    });
  }

  if (!studentName || typeof studentName !== 'string' || !studentName.trim()) {
    return res.status(400).json({
      success: false,
      error: 'தயவுசெய்து மாணவர் பெயரை (Student Name) உள்ளிடவும்.',
    });
  }

  const cleanExamNumber = examNumber.trim().toUpperCase();
  const cleanStudentName = studentName.trim();

  const existing = findStudent(cleanExamNumber);
  if (existing) {
    return res.status(400).json({
      success: false,
      error: `தேர்வு எண் "${cleanExamNumber}" கொண்ட மாணவர் ஏற்கனவே பட்டியலில் உள்ளார் (${existing.studentName}).`,
    });
  }

  const newStudent: AuthorizedStudent = {
    examNumber: cleanExamNumber,
    studentName: cleanStudentName,
  };

  authorizedStudents.push(newStudent);
  saveStudents(newStudent);

  console.log(`[STUDENT ROSTER] Added student: ${cleanExamNumber} - ${cleanStudentName}`);

  return res.json({
    success: true,
    message: `மாணவர் ${cleanStudentName} (${cleanExamNumber}) வெற்றிகரமாக சேர்க்கப்பட்டார்! (Student added successfully)`,
    student: newStudent,
    totalStudents: authorizedStudents.length,
  });
});

// 1f. Remove student from authorized roster (Requires Security PIN)
app.delete('/api/students/:examNumber', (req: Request, res: Response) => {
  const { examNumber } = req.params;
  const pin = (req.body?.pin || req.query?.pin) as string;

  if (!pin || typeof pin !== 'string') {
    return res.status(401).json({
      success: false,
      error: 'தயவுசெய்து ஆசிரியர் பாதுகாப்பு PIN எண்ணை உள்ளிடவும் (Security PIN is required).',
    });
  }

  if (pin.trim() !== ADMIN_SECURITY_PIN) {
    return res.status(401).json({
      success: false,
      error: 'தவறான பாதுகாப்பு PIN எண்! மாணவரை நீக்க சரியான 6-இலக்க PIN எண்ணை உள்ளிடவும் (Invalid Security PIN).',
    });
  }

  if (!examNumber) {
    return res.status(400).json({
      success: false,
      error: 'Exam number is required.',
    });
  }

  const cleanExamNumber = examNumber.trim().toUpperCase();
  const index = authorizedStudents.findIndex(
    (s) => s.examNumber.toUpperCase() === cleanExamNumber
  );

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: `தேர்வு எண் "${cleanExamNumber}" கொண்ட மாணவர் பட்டியலில் காணப்படவில்லை.`,
    });
  }

  const removedStudent = authorizedStudents.splice(index, 1)[0];
  if (isMongoConnected()) {
    StudentModel.deleteOne({ examNumber: cleanExamNumber }).catch((e) =>
      console.error('[MongoDB] Error deleting student:', e)
    );
  }
  saveStudents();


  console.log(`[STUDENT ROSTER] Removed student: ${removedStudent.examNumber} - ${removedStudent.studentName}`);

  return res.json({
    success: true,
    message: `மாணவர் ${removedStudent.studentName} (${removedStudent.examNumber}) வெற்றிகரமாக நீக்கப்பட்டார்! (Student removed successfully)`,
    removedStudent,
    totalStudents: authorizedStudents.length,
  });
});

// 2. Get all quizzes
app.get('/api/quizzes', (req: Request, res: Response) => {
  const summary = quizzes.map((q) => {
    const attemptsCount = attempts.filter((a) => a.quizId === q.id).length;
    return {
      id: q.id,
      title: q.title,
      description: q.description,
      durationMinutes: q.durationMinutes,
      totalMarks: q.questions.reduce((sum, item) => sum + (item.marks || 1), 0),
      questionCount: q.questions.length,
      passPercentage: q.passPercentage,
      status: q.status,
      createdAt: q.createdAt,
      attemptsCount,
      subjects: Array.from(new Set(q.questions.map((item) => item.subject))),
    };
  });
  res.json(summary);
});

// 3. Get single quiz
app.get('/api/quizzes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.query; // 'student' or 'admin'
  const quiz = getQuizById(id);

  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  // If student is taking the test, apply question sampling / shuffling and security masking
  if (role === 'student') {
    const studentQuestions = prepareQuestionsForStudent(quiz);
    const studentQuiz = {
      ...quiz,
      totalMarks: studentQuestions.reduce((sum, item) => sum + (item.marks || 1), 0),
      questionCount: studentQuestions.length,
      questions: studentQuestions.map((q) => ({
        id: q.id,
        subject: q.subject,
        topic: q.topic,
        questionText: q.questionText,
        questionImage: q.questionImage,
        options: q.options,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        question_en: q.question_en,
        options_en: q.options_en,
      })),
    };
    return res.json(studentQuiz);
  }

  res.json(quiz);
});

// 3a. Get all Previous Year Question (PYQ) papers repository
app.get('/api/pyq/papers', (req: Request, res: Response) => {
  const list: PyqPaperSummary[] = Array.from(pyqQuizzesMap.values()).map((q) => {
    const match = q.id.match(/^pyq-(\d{4})-(mat|sat)$/i);
    const year = match ? parseInt(match[1], 10) : 2024;
    const type = match ? (match[2].toUpperCase() as 'MAT' | 'SAT') : 'MAT';
    const isDeployed = quizzes.some((existing) => existing.id === q.id);
    const attemptsCount = attempts.filter((a) => a.quizId === q.id).length;

    const subjects: NMMS_Subject[] = Array.from(new Set(q.questions.map((item) => item.subject)));

    return {
      id: q.id,
      year,
      type,
      title: q.title,
      description: q.description,
      questionCount: q.questions.length,
      durationMinutes: q.durationMinutes,
      totalMarks: q.totalMarks,
      subjects,
      isDeployed,
      attemptsCount,
    };
  });

  // Sort by year descending, then MAT before SAT
  list.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.type === 'MAT' ? -1 : 1;
  });

  res.json({ count: list.length, papers: list });
});

// 3b. Get single PYQ paper with full prefilled questions
app.get('/api/pyq/papers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const paper = pyqQuizzesMap.get(id) || quizzes.find((q) => q.id === id);
  if (!paper) {
    return res.status(404).json({ error: 'Previous year question paper not found' });
  }
  res.json(paper);
});

// 3c. Deploy / Send PYQ paper to students (activates into active quizzes list)
app.post('/api/pyq/deploy', (req: Request, res: Response) => {
  try {
    const { 
      paperId,
      durationMinutes,
      passPercentage,
      shuffleQuestions,
      shuffleOptions,
      enableQuestionLimit,
      questionsPerAttempt,
      enableAntiCheat
    } = req.body;

    if (!paperId) {
      return res.status(400).json({ error: 'Paper ID is required' });
    }
    const paper = pyqQuizzesMap.get(paperId);
    if (!paper) {
      return res.status(404).json({ error: 'Paper not found in PYQ repository' });
    }

    const deployedQuiz: Quiz = {
      ...paper,
      status: 'active',
      durationMinutes: typeof durationMinutes === 'number' && durationMinutes > 0 ? durationMinutes : paper.durationMinutes,
      passPercentage: typeof passPercentage === 'number' ? passPercentage : (paper.passPercentage || 40),
      shuffleQuestions: typeof shuffleQuestions === 'boolean' ? shuffleQuestions : false,
      shuffleOptions: typeof shuffleOptions === 'boolean' ? shuffleOptions : false,
      enableQuestionLimit: Boolean(enableQuestionLimit),
      questionsPerAttempt: enableQuestionLimit && typeof questionsPerAttempt === 'number' ? questionsPerAttempt : undefined,
      enableAntiCheat: typeof enableAntiCheat === 'boolean' ? enableAntiCheat : true,
      createdAt: new Date().toISOString(),
    };

    const existingIdx = quizzes.findIndex((q) => q.id === paperId);
    if (existingIdx >= 0) {
      quizzes[existingIdx] = deployedQuiz;
    } else {
      quizzes.unshift(deployedQuiz);
    }
    saveQuizzes(deployedQuiz);

    res.json({
      success: true,
      message: `${paper.title} மாதிரித் தேர்வாக மாணவர் பயன்பாட்டிற்கு வெளியிடப்பட்டது!`,
      quiz: deployedQuiz,
    });

  } catch (err: any) {
    console.error('Failed to deploy PYQ paper:', err);
    res.status(500).json({ error: err.message || 'Failed to deploy PYQ paper' });
  }
});

// -------------------------------------------------------------
// 3d. Subject Questions & Unit Bank Management Endpoints
// -------------------------------------------------------------

// Get all subject units or filter by subject (?subject=MAT | SAT_MATHS | SAT_SCIENCE | SAT_SOCIAL)
app.get('/api/subject-units', (req: Request, res: Response) => {
  try {
    const { subject } = req.query;
    let units: SubjectUnitSummary[] = [];

    if (subject && typeof subject === 'string' && subject.toUpperCase() in SUBJECT_CONFIGS) {
      const validSub = subject.toUpperCase() as NMMS_Subject;
      units = getSubjectUnitSummaries(validSub, quizzes);
    } else {
      units = getAllSubjectUnits(quizzes);
    }

    // Calculate attempt counts from recorded attempts
    units = units.map((u) => {
      const count = attempts.filter((a) => a.quizId === u.id).length;
      return { ...u, attemptsCount: count };
    });

    const totalQuestions = units.reduce((sum, u) => sum + u.questionCount, 0);
    const deployedUnitsCount = units.filter((u) => u.isDeployed).length;

    res.json({
      count: units.length,
      totalQuestions,
      deployedUnitsCount,
      units,
    });
  } catch (err: any) {
    console.error('Error fetching subject units:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch subject units' });
  }
});

// Get a single unit with full questions for review/editing
app.get('/api/subject-units/:subject/:unitNum', (req: Request, res: Response) => {
  try {
    const { subject, unitNum } = req.params;
    const subKey = subject.toUpperCase() as NMMS_Subject;
    const num = parseInt(unitNum, 10);

    if (!SUBJECT_CONFIGS[subKey] || isNaN(num)) {
      return res.status(400).json({ error: 'Invalid subject or unit number' });
    }

    const summaries = getSubjectUnitSummaries(subKey, quizzes);
    const unitSummary = summaries.find((u) => u.unitNumber === num);
    const questions = getUnitQuestions(subKey, num);

    if (!unitSummary || questions.length === 0) {
      return res.status(404).json({ error: `Unit ${num} not found for subject ${subKey}` });
    }

    res.json({
      unit: unitSummary,
      questions,
    });
  } catch (err: any) {
    console.error('Error fetching unit detail:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch unit details' });
  }
});

// Update a question in a unit
app.put('/api/subject-units/:subject/:unitNum/questions/:questionId', (req: Request, res: Response) => {
  try {
    const { subject, unitNum, questionId } = req.params;
    const subKey = subject.toUpperCase() as NMMS_Subject;
    const num = parseInt(unitNum, 10);
    const updatedData = req.body;

    if (!SUBJECT_CONFIGS[subKey] || isNaN(num) || !questionId) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const result = updateQuestionInUnit(subKey, num, questionId, updatedData);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to update question' });
    }

    // If unit is already deployed, synchronize active quiz
    const unitId = `${SUBJECT_CONFIGS[subKey].prefix}-${num}`;
    const quizIdx = quizzes.findIndex((q) => q.id === unitId);
    if (quizIdx >= 0) {
      const refreshedQuestions = getUnitQuestions(subKey, num);
      quizzes[quizIdx].questions = refreshedQuestions;
      quizzes[quizIdx].totalMarks = refreshedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
      saveQuizzes();
    }

    res.json({
      success: true,
      message: 'Question updated successfully',
      question: result.question,
    });
  } catch (err: any) {
    console.error('Error updating question in unit:', err);
    res.status(500).json({ error: err.message || 'Failed to update question' });
  }
});

// Add a new question to a unit
app.post('/api/subject-units/:subject/:unitNum/questions', (req: Request, res: Response) => {
  try {
    const { subject, unitNum } = req.params;
    const subKey = subject.toUpperCase() as NMMS_Subject;
    const num = parseInt(unitNum, 10);
    const questionData = req.body;

    if (!SUBJECT_CONFIGS[subKey] || isNaN(num)) {
      return res.status(400).json({ error: 'Invalid subject or unit number' });
    }

    const result = addQuestionToUnit(subKey, num, questionData);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to add question' });
    }

    // Synchronize deployed quiz if exists
    const unitId = `${SUBJECT_CONFIGS[subKey].prefix}-${num}`;
    const quizIdx = quizzes.findIndex((q) => q.id === unitId);
    if (quizIdx >= 0) {
      const refreshedQuestions = getUnitQuestions(subKey, num);
      quizzes[quizIdx].questions = refreshedQuestions;
      quizzes[quizIdx].totalMarks = refreshedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
      saveQuizzes();
    }

    res.status(201).json({
      success: true,
      message: 'New question added to unit successfully',
      question: result.question,
    });
  } catch (err: any) {
    console.error('Error adding question to unit:', err);
    res.status(500).json({ error: err.message || 'Failed to add question' });
  }
});

// Delete a question from a unit
app.delete('/api/subject-units/:subject/:unitNum/questions/:questionId', (req: Request, res: Response) => {
  try {
    const { subject, unitNum, questionId } = req.params;
    const subKey = subject.toUpperCase() as NMMS_Subject;
    const num = parseInt(unitNum, 10);

    if (!SUBJECT_CONFIGS[subKey] || isNaN(num) || !questionId) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const result = deleteQuestionFromUnit(subKey, num, questionId);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to delete question' });
    }

    // Synchronize deployed quiz if exists
    const unitId = `${SUBJECT_CONFIGS[subKey].prefix}-${num}`;
    const quizIdx = quizzes.findIndex((q) => q.id === unitId);
    if (quizIdx >= 0) {
      const refreshedQuestions = getUnitQuestions(subKey, num);
      quizzes[quizIdx].questions = refreshedQuestions;
      quizzes[quizIdx].totalMarks = refreshedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
      saveQuizzes();
    }

    res.json({
      success: true,
      message: 'Question deleted successfully',
      remainingCount: result.remainingCount,
    });
  } catch (err: any) {
    console.error('Error deleting question from unit:', err);
    res.status(500).json({ error: err.message || 'Failed to delete question' });
  }
});

// Reset a unit to original asset default
app.post('/api/subject-units/:subject/:unitNum/reset', (req: Request, res: Response) => {
  try {
    const { subject, unitNum } = req.params;
    const subKey = subject.toUpperCase() as NMMS_Subject;
    const num = parseInt(unitNum, 10);

    if (!SUBJECT_CONFIGS[subKey] || isNaN(num)) {
      return res.status(400).json({ error: 'Invalid subject or unit number' });
    }

    const result = resetUnitToDefault(subKey, num);

    // Synchronize deployed quiz if exists
    const unitId = `${SUBJECT_CONFIGS[subKey].prefix}-${num}`;
    const quizIdx = quizzes.findIndex((q) => q.id === unitId);
    if (quizIdx >= 0) {
      const refreshedQuestions = getUnitQuestions(subKey, num);
      quizzes[quizIdx].questions = refreshedQuestions;
      quizzes[quizIdx].totalMarks = refreshedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
      saveQuizzes();
    }

    res.json({
      success: true,
      message: `Unit ${num} reset to original questions (${result.questionCount} questions).`,
      questionCount: result.questionCount,
    });
  } catch (err: any) {
    console.error('Error resetting unit:', err);
    res.status(500).json({ error: err.message || 'Failed to reset unit' });
  }
});

// Deploy a Unit Test to students
app.post('/api/subject-units/deploy', (req: Request, res: Response) => {
  try {
    const {
      subject,
      unitNum,
      customTitle,
      durationMinutes,
      passPercentage,
      shuffleQuestions,
      shuffleOptions,
      enableQuestionLimit,
      questionsPerAttempt,
      enableAntiCheat,
    } = req.body;

    const subKey = (subject || '').toUpperCase() as NMMS_Subject;
    const num = parseInt(unitNum, 10);

    if (!SUBJECT_CONFIGS[subKey] || isNaN(num)) {
      return res.status(400).json({ error: 'Valid subject and unit number are required' });
    }

    const quiz = buildQuizFromUnit(subKey, num, {
      customTitle,
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      passPercentage: passPercentage ? Number(passPercentage) : undefined,
      shuffleQuestions: shuffleQuestions !== false,
      shuffleOptions: shuffleOptions !== false,
      enableQuestionLimit: Boolean(enableQuestionLimit),
      questionsPerAttempt: questionsPerAttempt ? Number(questionsPerAttempt) : undefined,
      enableAntiCheat: enableAntiCheat !== false,
    });

    const existingIdx = quizzes.findIndex((q) => q.id === quiz.id);
    if (existingIdx >= 0) {
      quizzes[existingIdx] = quiz;
    } else {
      quizzes.unshift(quiz);
    }
    saveQuizzes(quiz);

    res.json({
      success: true,
      message: `"${quiz.title}" தேர்வாக மாணவர்களுக்கு வெற்றிகரமாக வெளியிடப்பட்டது! (Unit test deployed to students)`,
      quiz,
    });

  } catch (err: any) {
    console.error('Failed to deploy unit test:', err);
    res.status(500).json({ error: err.message || 'Failed to deploy unit test' });
  }
});

// Bulk Deploy all units of a subject or all subjects
app.post('/api/subject-units/deploy-all', (req: Request, res: Response) => {
  try {
    const { subject } = req.body;
    let subjectsToDeploy: NMMS_Subject[] = ['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'];
    if (subject && typeof subject === 'string' && subject.toUpperCase() in SUBJECT_CONFIGS) {
      subjectsToDeploy = [subject.toUpperCase() as NMMS_Subject];
    }

    let deployedCount = 0;

    for (const sub of subjectsToDeploy) {
      const summaries = getSubjectUnitSummaries(sub, quizzes);
      for (const summary of summaries) {
        const quiz = buildQuizFromUnit(sub, summary.unitNumber);
        const existingIdx = quizzes.findIndex((q) => q.id === quiz.id);
        if (existingIdx >= 0) {
          quizzes[existingIdx] = quiz;
        } else {
          quizzes.push(quiz);
        }
        deployedCount++;
      }
    }
    saveQuizzes();

    res.json({
      success: true,
      message: `அனைத்து ${deployedCount} பாட அலகுகளும் மாணவர் பயன்பாட்டிற்கு வெற்றிகரமாக வெளியிடப்பட்டன! (All units deployed successfully)`,
      deployedCount,
    });
  } catch (err: any) {
    console.error('Failed to bulk deploy units:', err);
    res.status(500).json({ error: err.message || 'Failed to bulk deploy units' });
  }
});

// 4. Create or update quiz
app.post('/api/quizzes', (req: Request, res: Response) => {
  try {
    const data: Quiz = req.body;
    if (!data.title || !data.questions || !Array.isArray(data.questions)) {
      return res.status(400).json({ error: 'Quiz title and valid questions array are required' });
    }

    const quizId = data.id || `nmms-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const totalMarks = data.questions.reduce((acc, curr) => acc + (curr.marks || 1), 0);

    const newQuiz: Quiz = {
      ...data,
      id: quizId,
      totalMarks,
      durationMinutes: Number(data.durationMinutes) || 90,
      passPercentage: Number(data.passPercentage) || 40,
      enableAntiCheat: data.enableAntiCheat !== false,
      shuffleQuestions: Boolean(data.shuffleQuestions),
      shuffleOptions: Boolean(data.shuffleOptions),
      enableQuestionLimit: Boolean(data.enableQuestionLimit),
      questionsPerAttempt: data.enableQuestionLimit ? (Number(data.questionsPerAttempt) || 10) : undefined,
      showResultsImmediately: data.showResultsImmediately !== false,
      allowReview: data.allowReview !== false,
      status: data.status || 'active',
      createdAt: data.createdAt || new Date().toISOString(),
      questions: data.questions.map((q, idx) => ({
        id: q.id || `q-${idx + 1}-${Date.now().toString(36)}`,
        subject: q.subject || 'MAT',
        topic: q.topic || 'General',
        questionText: q.questionText,
        questionImage: q.questionImage,
        options: q.options && q.options.length === 4 ? q.options : [
          { id: 'A', text: q.options?.[0]?.text || 'Option A' },
          { id: 'B', text: q.options?.[1]?.text || 'Option B' },
          { id: 'C', text: q.options?.[2]?.text || 'Option C' },
          { id: 'D', text: q.options?.[3]?.text || 'Option D' },
        ],
        correctOption: q.correctOption || 'A',
        explanation: q.explanation || '',
        marks: Number(q.marks) || 1,
        negativeMarks: Number(q.negativeMarks) || 0,
      })),
    };

    const existingIndex = quizzes.findIndex((q) => q.id === quizId);
    if (existingIndex >= 0) {
      newQuiz.createdAt = quizzes[existingIndex].createdAt || newQuiz.createdAt;
      quizzes[existingIndex] = newQuiz;
    } else {
      quizzes.unshift(newQuiz);
    }
    saveQuizzes(newQuiz);

    res.status(201).json({ success: true, quiz: newQuiz });
  } catch (err: any) {
    console.error('Save quiz error:', err);
    res.status(500).json({ error: err.message || 'Failed to save quiz' });
  }
});

// 5. Delete quiz
app.delete('/api/quizzes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLength = quizzes.length;
  quizzes = quizzes.filter((q) => q.id !== id);
  if (quizzes.length === initialLength) {
    return res.status(404).json({ error: 'Quiz not found' });
  }
  if (isMongoConnected()) {
    QuizModel.deleteOne({ id }).catch((err: any) => console.error('[MongoDB] Error deleting quiz:', err));
  }
  saveQuizzes();
  res.json({ success: true, message: 'Quiz deleted successfully' });
});

// 6. Submit student exam attempt
app.post('/api/quizzes/:id/submit', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { studentName, examNumber, startedAt, answers, questionStatus, tabSwitchCount, timeTakenSeconds, clientQuestions } = req.body;

    const quiz = getQuizById(id);
    if (!quiz) {
      return res.status(404).json({ error: 'Exam paper not found' });
    }

    if (!studentName || !examNumber) {
      return res.status(400).json({ error: 'Student Name and Exam Number are required' });
    }

    // Determine the active question set presented to this student candidate
    let activeQuestions: Question[] = quiz.questions;
    if (Array.isArray(clientQuestions) && clientQuestions.length > 0) {
      // Reconstruct full questions with explanations & correct options mapped from master database
      activeQuestions = clientQuestions.map((cq: any) => {
        const orig = quiz.questions.find((q) => q.id === cq.id) || cq;
        
        // Find which option letter was the correct answer based on matching text/image
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
      // Fallback: If answers only contains subset of questions
      const answeredKeys = Object.keys(answers || {});
      if (answeredKeys.length > 0 && answeredKeys.length < quiz.questions.length && quiz.enableQuestionLimit) {
        const subset = quiz.questions.filter((q) => q.id in answers || (questionStatus && q.id in questionStatus));
        if (subset.length > 0) {
          activeQuestions = subset;
        }
      }
    }

    // Auto-grade submission using the active questions
    const scoreResult = calculateScore(quiz, answers || {}, activeQuestions);

    const attempt: StudentAttempt = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      quizId: quiz.id,
      quizTitle: quiz.title,
      studentName: studentName.trim(),
      examNumber: examNumber.trim().toUpperCase(),
      startedAt: startedAt || new Date(Date.now() - (timeTakenSeconds || 0) * 1000).toISOString(),
      submittedAt: new Date().toISOString(),
      timeTakenSeconds: Number(timeTakenSeconds) || 0,
      answers: answers || {},
      questionStatus: questionStatus || {},
      tabSwitchCount: Number(tabSwitchCount) || 0,
      score: scoreResult,
    };

    attempts.unshift(attempt);
    saveAttempts(attempt);


    res.status(201).json({
      success: true,
      attemptId: attempt.id,
      score: scoreResult,
      attempt,
      quizDetails: {
        id: quiz.id,
        title: quiz.title,
        questions: activeQuestions, // Return the exact question set with full explanations for scorecard review
      },
    });
  } catch (err: any) {
    console.error('Submission grading error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit exam' });
  }
});

// 7. Get Quiz Analytics for Teachers
app.get('/api/quizzes/:id/analytics', (req: Request, res: Response) => {
  const { id } = req.params;
  const quiz = getQuizById(id);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  const quizAttempts = attempts.filter((a) => a.quizId === id);

  if (quizAttempts.length === 0) {
    return res.json({
      quizId: quiz.id,
      quizTitle: quiz.title,
      totalAttempts: 0,
      averageScore: 0,
      averagePercentage: 0,
      highestScore: 0,
      lowestScore: 0,
      averageTimeSeconds: 0,
      passRate: 0,
      subjectAverages: { MAT: 0, SAT_MATHS: 0, SAT_SCIENCE: 0, SAT_SOCIAL: 0 },
      questionStats: quiz.questions.map((q, idx) => ({
        questionId: q.id,
        questionNumber: idx + 1,
        subject: q.subject,
        questionText: q.questionText,
        correctRate: 0,
        correctAttempts: 0,
        wrongAttempts: 0,
        unattempted: 0,
        difficultyRating: 'Moderate' as const,
      })),
      recentAttempts: [],
    });
  }

  const totalAttempts = quizAttempts.length;
  const scores = quizAttempts.map((a) => a.score?.totalObtained || 0);
  const percentages = quizAttempts.map((a) => a.score?.percentage || 0);
  const times = quizAttempts.map((a) => a.timeTakenSeconds);
  const passCount = quizAttempts.filter((a) => a.score?.isEligible).length;

  const averageScore = Math.round((scores.reduce((a, b) => a + b, 0) / totalAttempts) * 10) / 10;
  const averagePercentage = Math.round((percentages.reduce((a, b) => a + b, 0) / totalAttempts) * 10) / 10;
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
  const averageTimeSeconds = Math.round(times.reduce((a, b) => a + b, 0) / totalAttempts);
  const passRate = Math.round((passCount / totalAttempts) * 1000) / 10;

  // Subject averages
  const subjectAverages = {
    MAT: Math.round((quizAttempts.reduce((sum, a) => sum + (a.score?.subjectBreakdown?.MAT?.accuracy || 0), 0) / totalAttempts) * 10) / 10,
    SAT_MATHS: Math.round((quizAttempts.reduce((sum, a) => sum + (a.score?.subjectBreakdown?.SAT_MATHS?.accuracy || 0), 0) / totalAttempts) * 10) / 10,
    SAT_SCIENCE: Math.round((quizAttempts.reduce((sum, a) => sum + (a.score?.subjectBreakdown?.SAT_SCIENCE?.accuracy || 0), 0) / totalAttempts) * 10) / 10,
    SAT_SOCIAL: Math.round((quizAttempts.reduce((sum, a) => sum + (a.score?.subjectBreakdown?.SAT_SOCIAL?.accuracy || 0), 0) / totalAttempts) * 10) / 10,
  };

  // Question-by-question analytics
  const questionStats = quiz.questions.map((q, idx) => {
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;

    quizAttempts.forEach((a) => {
      const ans = a.answers ? a.answers[q.id] : null;
      if (!ans) {
        unattempted++;
      } else if (ans === q.correctOption) {
        correct++;
      } else {
        wrong++;
      }
    });

    const correctRate = totalAttempts > 0 ? Math.round((correct / totalAttempts) * 100) : 0;
    let difficultyRating: 'Easy' | 'Moderate' | 'Hard' = 'Moderate';
    if (correctRate >= 70) difficultyRating = 'Easy';
    else if (correctRate < 40) difficultyRating = 'Hard';

    return {
      questionId: q.id,
      questionNumber: idx + 1,
      subject: q.subject,
      questionText: q.questionText,
      correctRate,
      correctAttempts: correct,
      wrongAttempts: wrong,
      unattempted,
      difficultyRating,
    };
  });

  res.json({
    quizId: quiz.id,
    quizTitle: quiz.title,
    totalAttempts,
    averageScore,
    averagePercentage,
    highestScore,
    lowestScore,
    averageTimeSeconds,
    passRate,
    subjectAverages,
    questionStats,
    recentAttempts: quizAttempts,
  });
});

// 8. Get Single Attempt Scorecard
app.get('/api/attempts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const attempt = attempts.find((a) => a.id === id);
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found' });
  }
  const quiz = quizzes.find((q) => q.id === attempt.quizId);
  res.json({
    attempt,
    quiz: quiz || null,
  });
});

// 8a. Delete a single attempt by ID
app.delete('/api/attempts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const prevCount = attempts.length;
  attempts = attempts.filter((a) => a.id !== id);
  if (attempts.length === prevCount) {
    return res.status(404).json({ error: 'Attempt record not found' });
  }
  if (isMongoConnected()) {
    AttemptModel.deleteOne({ id }).catch((err: any) => console.error('[MongoDB] Error deleting attempt:', err));
  }
  saveAttempts();
  res.json({ success: true, message: 'தேர்வு முயற்சி வெற்றிகரமாக நீக்கப்பட்டது (Attempt deleted successfully)' });
});

// 8b. Delete all attempt history for a student
app.delete('/api/students/:examNumber/attempts', (req: Request, res: Response) => {
  const { examNumber } = req.params;
  const { quizId } = req.query;
  const prevCount = attempts.length;
  
  attempts = attempts.filter((a) => {
    const isSameStudent = a.examNumber.toUpperCase() === examNumber.toUpperCase();
    if (!isSameStudent) return true;
    if (quizId && typeof quizId === 'string') {
      return a.quizId !== quizId;
    }
    return false; // delete all for this student
  });

  const deletedCount = prevCount - attempts.length;
  if (isMongoConnected()) {
    const mongoFilter = quizId && typeof quizId === 'string'
      ? { examNumber: new RegExp('^' + examNumber + '$', 'i'), quizId }
      : { examNumber: new RegExp('^' + examNumber + '$', 'i') };
    AttemptModel.deleteMany(mongoFilter).catch((err: any) => console.error('[MongoDB] Error deleting student attempts:', err));
  }
  saveAttempts();
  res.json({
    success: true,
    deletedCount,
    message: `${deletedCount} attempt records deleted successfully for ${examNumber}`,
  });
});


// -------------------------------------------------------------
// Resilient Gemini Execution Helper with Backoff & Fallbacks
// -------------------------------------------------------------
const PRIMARY_MODEL = 'gemini-3.7-flash';
const FALLBACK_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];

function isTransientError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.code || error?.error?.code || error?.error?.status;
  const message = (error.message || JSON.stringify(error) || '').toLowerCase();
  
  return (
    status === 503 ||
    status === 429 ||
    status === 'UNAVAILABLE' ||
    status === 'RESOURCE_EXHAUSTED' ||
    message.includes('503') ||
    message.includes('429') ||
    message.includes('high demand') ||
    message.includes('unavailable') ||
    message.includes('temporarily') ||
    message.includes('rate limit') ||
    message.includes('quota')
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithFallback(params: {
  contents: any;
  config?: any;
}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please check your environment configuration.');
  }

  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    // Attempt with current model with up to 2 tries
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
          // Wait briefly before retry or next model
          await delay(800 * (attempt + 1));
          continue;
        } else {
          // Non-transient error (e.g. invalid schema or bad payload)
          throw err;
        }
      }
    }
  }

  throw lastError;
}

// -------------------------------------------------------------
// 9. AI Question Extraction from Photo / PDF / Text using Gemini
// -------------------------------------------------------------
app.post('/api/ai/parse-questions', async (req: Request, res: Response) => {
  try {
    const { inputType, content, images, mimeType, defaultSubject } = req.body;

    if (!content && (!images || !Array.isArray(images) || images.length === 0)) {
      return res.status(400).json({ error: 'Content or images payload is required for extraction' });
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

    let parts: any[] = [];

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
      parts = [
        {
          inlineData: {
            data: base64Data,
            mimeType: 'application/pdf',
          },
        },
        {
          text: `Please read and extract all NMMS multiple choice questions from this uploaded PDF document into structured JSON format in TAMIL MEDIUM (தமிழ் வழி வினாக்கள்). Default subject preference: ${defaultSubject || 'Auto-detect'}.`,
        },
      ];
    } else {
      // Raw text or OCR string
      parts = [
        {
          text: `Extract all NMMS multiple choice questions from the following text into structured JSON format strictly in TAMIL MEDIUM (தமிழ் வழி வினாக்கள்):\n\n${content}`,
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
            extractedQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: {
                    type: Type.STRING,
                    description: 'One of: MAT, SAT_MATHS, SAT_SCIENCE, SAT_SOCIAL',
                  },
                  topic: {
                    type: Type.STRING,
                    description: 'Specific topic name in Tamil (e.g. எண் தொடர், ஒளி)',
                  },
                  questionText: {
                    type: Type.STRING,
                    description: 'The complete question statement in Tamil',
                  },
                  options: {
                    type: Type.ARRAY,
                    description: 'Exactly 4 options in Tamil with id A, B, C, D',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING, description: 'A, B, C, or D' },
                        text: { type: Type.STRING, description: 'Option text in Tamil' },
                      },
                      required: ['id', 'text'],
                    },
                  },
                  correctOption: {
                    type: Type.STRING,
                    description: 'Correct option letter: A, B, C, or D',
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'Step-by-step solution and explanation in Tamil',
                  },
                  marks: {
                    type: Type.NUMBER,
                    description: 'Marks for this question (1)',
                  },
                },
                required: ['subject', 'questionText', 'options', 'correctOption', 'explanation'],
              },
            },
          },
          required: ['extractedQuestions'],
        },
      },
    });

    let parsedJson: any = { extractedQuestions: [] };
    try {
      const rawText = response.text?.trim() || '';
      const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      parsedJson = JSON.parse(cleanJson || '{"extractedQuestions": []}');
    } catch (parseErr) {
      console.warn('Failed to parse Gemini response text as JSON:', response.text);
      parsedJson = { extractedQuestions: [] };
    }
function repairMangledLatexServer(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let text = input;
  // Repair Formfeed (\x0c, \f, ⇡, ↑) before 'rac' or bare 'rac{'
  text = text.replace(/[\x0c\f\u21e1\u2191]\s*rac/gi, '\\frac');
  text = text.replace(/(^|[\s=+\-*\/_^({\[,])rac\{/gi, '$1\\frac{');
  text = text.replace(/⇡rac/gi, '\\frac');
  text = text.replace(/↑rac/gi, '\\frac');

  // Repair Tab (\x09, \t) before 'ext{', 'imes', 'heta', 'riangle', 'an'
  text = text.replace(/[\x09\t]\s*ext\{/gi, '\\text{');
  text = text.replace(/(^|[\s0-9a-zA-Z\)\}])ext\{/gi, '$1\\text{');
  text = text.replace(/[\x09\t]\s*imes/gi, '\\times');
  text = text.replace(/(^|[\s0-9a-zA-Z\)\}])imes\b/gi, '$1\\times');
  text = text.replace(/[\x09\t]\s*heta/gi, '\\theta');
  text = text.replace(/[\x09\t]\s*riangle/gi, '\\triangle');
  text = text.replace(/[\x09\t]\s*an\b/gi, '\\tan');

  // Repair Carriage Return (\x0d, \r) before 'ightarrow', 'eftarrow', 'ight', 'eft'
  text = text.replace(/[\x0d\r]\s*ightarrow/gi, '\\rightarrow');
  text = text.replace(/(^|[\s0-9a-zA-Z\)\}])ightarrow/gi, '$1\\rightarrow');
  text = text.replace(/[\x0d\r]\s*eftarrow/gi, '\\leftarrow');
  text = text.replace(/(^|[\s0-9a-zA-Z\)\}])eftarrow/gi, '$1\\leftarrow');
  text = text.replace(/[\x0d\r]\s*ight\b/gi, '\\right');

  // Repair Backspace (\x08, \b) before 'eta', 'ar{', 'ox{'
  text = text.replace(/[\x08]\s*eta\b/gi, '\\beta');
  text = text.replace(/[\x08]\s*ar\{/gi, '\\bar{');
  text = text.replace(/[\x08]\s*ox\{/gi, '\\box{');

  // Repair Newline (\x0a, \n) before 'eq'
  text = text.replace(/[\x0a\n]\s*eq\b/gi, ' \\neq ');

  // Repair bare 'sqrt{' missing leading backslash
  text = text.replace(/(^|[\s=+\-*\/_^({\[,])sqrt\{/gi, '$1\\sqrt{');

  return text;
}

    const formattedQuestions = (parsedJson.extractedQuestions || []).map((q: any, i: number) => ({
      id: `ai-ext-${Date.now()}-${i + 1}`,
      subject: ['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'].includes(q.subject) ? q.subject : (defaultSubject || 'MAT'),
      topic: q.topic || 'பொதுத் தலைப்பு',
      questionText: repairMangledLatexServer(q.questionText || ''),
      options: (q.options && q.options.length === 4 ? q.options : [
        { id: 'A', text: q.options?.[0]?.text || 'விருப்பம் A' },
        { id: 'B', text: q.options?.[1]?.text || 'விருப்பம் B' },
        { id: 'C', text: q.options?.[2]?.text || 'விருப்பம் C' },
        { id: 'D', text: q.options?.[3]?.text || 'விருப்பம் D' },
      ]).map((opt: any, oIdx: number) => ({
        id: (['A', 'B', 'C', 'D'][oIdx] || 'A') as 'A' | 'B' | 'C' | 'D',
        text: repairMangledLatexServer(String(opt.text || '')),
      })),
      correctOption: ['A', 'B', 'C', 'D'].includes(q.correctOption?.toUpperCase()) ? q.correctOption.toUpperCase() : 'A',
      explanation: repairMangledLatexServer(q.explanation || 'NMMS வினாத்தாள் பகுப்பாய்வு மூலம் பெறப்பட்ட படிமுறை தீர்வு.'),
      marks: 1,
      negativeMarks: 0,
    }));

    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      count: formattedQuestions.length,
      questions: formattedQuestions,
    });
  } catch (err: any) {
    console.error('AI question extraction error:', err);
    let errorMessage = err.message || 'Failed to extract questions with AI';
    try {
      if (errorMessage.startsWith('{') || errorMessage.includes('{"error"')) {
        const jsonErr = JSON.parse(errorMessage.replace(/^ApiError:\s*/, ''));
        if (jsonErr?.error?.message) {
          errorMessage = jsonErr.error.message;
        }
      }
    } catch {}

    if (isTransientError(err)) {
      errorMessage = 'The AI model is currently experiencing high demand. Please click "Extract Questions with AI" to try again.';
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: errorMessage });
  }
});

// -------------------------------------------------------------
// 10. AI Question Generator for NMMS Topics (Strictly Tamil Medium)
// -------------------------------------------------------------
app.post('/api/ai/generate-questions', async (req: Request, res: Response) => {
  try {
    const { subject, topic, count, difficulty } = req.body;
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
                  subject: {
                    type: Type.STRING,
                    description: 'One of: MAT, SAT_MATHS, SAT_SCIENCE, SAT_SOCIAL',
                  },
                  topic: {
                    type: Type.STRING,
                    description: 'Topic name in Tamil',
                  },
                  questionText: {
                    type: Type.STRING,
                    description: 'Question statement strictly in Tamil',
                  },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING, description: 'A, B, C, or D' },
                        text: { type: Type.STRING, description: 'Option text in Tamil' },
                      },
                      required: ['id', 'text'],
                    },
                  },
                  correctOption: {
                    type: Type.STRING,
                    description: 'A, B, C, or D',
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'Detailed explanation in Tamil',
                  },
                },
                required: ['subject', 'questionText', 'options', 'correctOption', 'explanation'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });

    let parsed: any = { questions: [] };
    try {
      const rawText = response.text?.trim() || '';
      const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(cleanJson || '{"questions": []}');
    } catch (parseErr) {
      console.warn('Failed to parse Gemini generated response text as JSON:', response.text);
      parsed = { questions: [] };
    }

    const generated = (parsed.questions || []).map((q: any, i: number) => ({
      id: `ai-gen-${Date.now()}-${i + 1}`,
      subject: ['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'].includes(q.subject) ? q.subject : (subject || 'MAT'),
      topic: q.topic || topic || 'பொதுப் பகுதி',
      questionText: q.questionText,
      options: q.options,
      correctOption: q.correctOption?.toUpperCase() || 'A',
      explanation: q.explanation || '',
      marks: 1,
      negativeMarks: 0,
    }));

    res.setHeader('Content-Type', 'application/json');
    res.json({ success: true, count: generated.length, questions: generated });
  } catch (err: any) {
    console.error('AI question generation error:', err);
    let errorMessage = err.message || 'Failed to generate questions with AI';
    try {
      if (errorMessage.startsWith('{') || errorMessage.includes('{"error"')) {
        const jsonErr = JSON.parse(errorMessage.replace(/^ApiError:\s*/, ''));
        if (jsonErr?.error?.message) {
          errorMessage = jsonErr.error.message;
        }
      }
    } catch {}

    if (isTransientError(err)) {
      errorMessage = 'The AI service is experiencing high temporary demand. Please click "Generate Questions with AI" to retry.';
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: errorMessage });
  }
});

// -------------------------------------------------------------
// Global Error Handler for Express / Body Parser errors
// -------------------------------------------------------------
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err) {
    console.error('[Server Request Error]', err.type || err.name, err.message);
    res.setHeader('Content-Type', 'application/json');
    if (err.type === 'entity.too.large' || err.status === 413) {
      return res.status(413).json({
        error: 'பதிவேற்றப்பட்ட கோப்பின் அளவு மிகவும் அதிகமாக உள்ளது (Payload Too Large). தயவுசெய்து குறைந்த அளவிலான படங்களை பதிவேற்றவும்.',
      });
    }
    return res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
    });
  }
  next();
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
async function start() {
  await initDatabaseAndState();
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`NMMS Exam Portal server running on port ${PORT}`);
  });

  // Keep-alive and timeout configuration to prevent Cloudflare/Proxy socket disconnects
  server.setTimeout(180000); // 3 minutes
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

start();
