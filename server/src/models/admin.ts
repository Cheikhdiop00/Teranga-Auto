import { Schema, model, Document, Types } from 'mongoose';

export interface IAdmin extends Document {
  user: Types.ObjectId;
  position?: string;
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    position: { type: String },
    permissions: [{ type: String }]
  },
  { timestamps: true }
);

export default model<IAdmin>('Admin', adminSchema);