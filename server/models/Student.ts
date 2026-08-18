import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  examNumber: string;
  name: string;
  status: 'active' | 'inactive';
}

const StudentSchema: Schema = new Schema({
  examNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

export default mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
