import mongoose, { Schema, Document } from 'mongoose';
import { StudentAttempt } from '../../src/types';

export type IAttempt = StudentAttempt & Document;

const SubjectScoreBreakdownSchema = new Schema({
  obtained: { type: Number, required: true },
  possible: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  wrongCount: { type: Number, required: true },
  unattemptedCount: { type: Number, required: true },
}, { _id: false });

const ScoreResultSchema = new Schema({
  totalObtained: { type: Number, required: true },
  totalPossible: { type: Number, required: true },
  percentage: { type: Number, required: true },
  isEligible: { type: Boolean, required: true },
  matScore: { type: Number, required: true },
  satScore: { type: Number, required: true },
  subjectBreakdown: {
    MAT: SubjectScoreBreakdownSchema,
    SAT_MATHS: SubjectScoreBreakdownSchema,
    SAT_SCIENCE: SubjectScoreBreakdownSchema,
    SAT_SOCIAL: SubjectScoreBreakdownSchema,
  },
  strengthSubject: { type: String, required: true },
  weaknessSubject: { type: String, required: true },
  aiDiagnosticInsights: [String]
}, { _id: false });

const AttemptSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  quizId: { type: String, required: true },
  quizTitle: { type: String, required: true },
  studentName: { type: String, required: true },
  examNumber: { type: String, required: true },
  startedAt: { type: String, required: true },
  submittedAt: { type: String, required: true },
  timeTakenSeconds: { type: Number, required: true },
  answers: { type: Map, of: String },
  questionStatus: { type: Map, of: String },
  tabSwitchCount: { type: Number, required: true },
  score: ScoreResultSchema
});

export default mongoose.models.Attempt || mongoose.model<IAttempt>('Attempt', AttemptSchema);
