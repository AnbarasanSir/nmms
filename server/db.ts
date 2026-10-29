import mongoose, { Schema, Document, Model } from 'mongoose';
import { Quiz, Question, StudentAttempt, StudentScoreResult } from '../src/types';
import { AuthorizedStudent } from '../src/data/students';

// ---------------------------------------------------------------------------
// MongoDB Schemas & Interfaces
// ---------------------------------------------------------------------------

export interface IQuizDoc extends Document {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
  passPercentage: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  enableQuestionLimit?: boolean;
  questionsPerAttempt?: number;
  enableAntiCheat?: boolean;
  showResultsImmediately?: boolean;
  allowReview?: boolean;
  status: 'active' | 'draft' | 'archived';
  createdAt?: string;
  updatedAt?: string;
  questions: Question[];
}

const QuestionOptionSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  image: { type: String, required: false },
}, { _id: false });

const QuestionSchema = new Schema({
  id: { type: String, required: true },
  subject: { type: String, required: true },
  topic: { type: String, required: false },
  questionText: { type: String, required: true },
  questionImage: { type: String, required: false },
  options: [QuestionOptionSchema],
  correctOption: { type: String, required: true },
  explanation: { type: String, required: false },
  marks: { type: Number, default: 1 },
  negativeMarks: { type: Number, default: 0 },
  question_en: { type: String, required: false },
  options_en: [{ type: String }],
  explanation_en: { type: String, required: false },
}, { _id: false });

const QuizSchema = new Schema<IQuizDoc>({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  durationMinutes: { type: Number, default: 30 },
  totalMarks: { type: Number, default: 20 },
  passPercentage: { type: Number, default: 40 },
  shuffleQuestions: { type: Boolean, default: true },
  shuffleOptions: { type: Boolean, default: true },
  enableQuestionLimit: { type: Boolean, default: false },
  questionsPerAttempt: { type: Number, required: false },
  enableAntiCheat: { type: Boolean, default: true },
  showResultsImmediately: { type: Boolean, default: true },
  allowReview: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active', index: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
  questions: [QuestionSchema],
}, { timestamps: true });

export const QuizModel: Model<any> = mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);

// ---------------------------------------------------------------------------
// Student Attempts Schema
// ---------------------------------------------------------------------------

export interface IAttemptDoc extends Document {
  id: string;
  quizId: string;
  quizTitle: string;
  studentName: string;
  examNumber: string;
  startedAt: string;
  submittedAt: string;
  timeTakenSeconds: number;
  tabSwitchCount: number;
  answers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  questionStatus: Record<string, string>;
  score: StudentScoreResult;
}

const StudentAttemptSchema = new Schema<IAttemptDoc>({
  id: { type: String, required: true, unique: true, index: true },
  quizId: { type: String, required: true, index: true },
  quizTitle: { type: String, required: true },
  studentName: { type: String, required: true },
  examNumber: { type: String, required: true, index: true },
  startedAt: { type: String, required: true },
  submittedAt: { type: String, required: true },
  timeTakenSeconds: { type: Number, default: 0 },
  tabSwitchCount: { type: Number, default: 0 },
  answers: { type: Schema.Types.Mixed, default: {} },
  questionStatus: { type: Schema.Types.Mixed, default: {} },
  score: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });

export const AttemptModel: Model<any> = mongoose.models.StudentAttempt || mongoose.model('StudentAttempt', StudentAttemptSchema);

// ---------------------------------------------------------------------------
// Student Roster Schema
// ---------------------------------------------------------------------------

export interface IStudentDoc extends Document {
  examNumber: string;
  studentName: string;
  school?: string;
}

const StudentSchema = new Schema<IStudentDoc>({
  examNumber: { type: String, required: true, unique: true, index: true },
  studentName: { type: String, required: true },
  school: { type: String, default: 'GHS Kadayam' },
}, { timestamps: true });

export const StudentModel: Model<any> = mongoose.models.Student || mongoose.model('Student', StudentSchema);

// ---------------------------------------------------------------------------
// Admin Security Credentials Schema
// ---------------------------------------------------------------------------

export interface IAdminConfigDoc extends Document {
  configKey: string;
  adminPassword: string;
  securityPin: string;
  updatedAt: string;
}

const AdminConfigSchema = new Schema<IAdminConfigDoc>({
  configKey: { type: String, required: true, unique: true, default: 'primary' },
  adminPassword: { type: String, required: true, default: 'nmms@2026' },
  securityPin: { type: String, required: true, default: '273464' },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

export const AdminConfigModel: Model<any> = mongoose.models.AdminConfig || mongoose.model('AdminConfig', AdminConfigSchema);

// ---------------------------------------------------------------------------
// Unit Overrides Schema
// ---------------------------------------------------------------------------

export interface IUnitOverrideDoc extends Document {
  key: string; // e.g. "MAT_1"
  subject: string;
  unitNumber: number;
  metadata?: Record<string, any>;
  questions?: Question[];
  isCustom?: boolean;
  lastUpdated?: string;
}

const UnitOverrideSchema = new Schema<IUnitOverrideDoc>({
  key: { type: String, required: true, unique: true, index: true },
  subject: { type: String, required: true },
  unitNumber: { type: Number, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  questions: [QuestionSchema],
  isCustom: { type: Boolean, default: false },
  lastUpdated: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true });

export const UnitOverrideModel: Model<any> = mongoose.models.UnitOverride || mongoose.model('UnitOverride', UnitOverrideSchema);


// ---------------------------------------------------------------------------
// MongoDB Connection Manager
// ---------------------------------------------------------------------------

let isConnected = false;

export async function connectMongoDB(): Promise<boolean> {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL;

  if (!mongoUri) {
    console.log('[MongoDB] MONGODB_URI environment variable not set. Running with local memory/fallback cache.');
    return false;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  try {
    console.log('[MongoDB] Connecting to MongoDB instance...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });
    isConnected = true;
    console.log('[MongoDB] ✅ Successfully connected to MongoDB!');
    return true;
  } catch (err: any) {
    console.warn(`[MongoDB Warning] Could not connect to MongoDB (${err.message}). Falling back to memory state.`);
    isConnected = false;
    return false;
  }
}

export function isMongoConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
