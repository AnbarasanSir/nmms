import mongoose, { Schema, Document } from 'mongoose';
import { Quiz } from '../../src/types';

export type IQuiz = Quiz & Document;

const OptionSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  image: { type: String }
}, { _id: false });

const QuestionSchema = new Schema({
  id: { type: String, required: true },
  subject: { type: String, required: true },
  topic: { type: String },
  questionText: { type: String, required: true },
  questionImage: { type: String },
  options: [OptionSchema],
  correctOption: { type: String, required: true },
  explanation: { type: String },
  marks: { type: Number, required: true },
  negativeMarks: { type: Number },
  question_en: { type: String },
  options_en: [String],
  explanation_en: { type: String }
}, { _id: false });

const QuizSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  durationMinutes: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  passPercentage: { type: Number, required: true },
  enableAntiCheat: { type: Boolean, required: true },
  shuffleQuestions: { type: Boolean, required: true },
  shuffleOptions: { type: Boolean },
  enableQuestionLimit: { type: Boolean },
  questionsPerAttempt: { type: Number },
  showResultsImmediately: { type: Boolean, required: true },
  allowReview: { type: Boolean, required: true },
  status: { type: String, enum: ['active', 'draft', 'archived'], required: true },
  createdAt: { type: String, required: true },
  questions: [QuestionSchema]
});

export default mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);
