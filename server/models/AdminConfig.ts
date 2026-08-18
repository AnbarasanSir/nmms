import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminConfig extends Document {
  id: string;
  adminPin: string;
}

const AdminConfigSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true, default: 'admin_config' },
  adminPin: { type: String, required: true }
});

export default mongoose.models.AdminConfig || mongoose.model<IAdminConfig>('AdminConfig', AdminConfigSchema);
