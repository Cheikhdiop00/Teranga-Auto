import { Schema, model, Document, Types } from 'mongoose';

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'rejected';

export interface IComplaint extends Document {
  user: Types.ObjectId; // ref User
  breakdown?: Types.ObjectId; // ref Breakdown
  description: string;
  status: ComplaintStatus;
  adminResponse?: string;
  responseAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const complaintSchema = new Schema<IComplaint>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    breakdown: { type: Schema.Types.ObjectId, ref: 'Breakdown' },
    description: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'rejected'], default: 'open' },
    adminResponse: { type: String },
    responseAt: { type: Date }
  },
  { timestamps: true }
);

export default model<IComplaint>('Complaint', complaintSchema);
