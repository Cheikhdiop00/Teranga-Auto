import { Schema, model, Document, Types } from 'mongoose';

export type HistoryStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface IHistory extends Document {
  client: Types.ObjectId; // ref Client
  mechanic: Types.ObjectId; // ref Mechanic
  breakdown: Types.ObjectId; // ref Breakdown
  requestDate: Date;
  interventionDate?: Date;
  estimatedCost?: number;
  status: HistoryStatus;
  createdAt: Date;
  updatedAt: Date;
}

const historySchema = new Schema<IHistory>(
  {
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    mechanic: { type: Schema.Types.ObjectId, ref: 'Mechanic', required: true },
    breakdown: { type: Schema.Types.ObjectId, ref: 'Breakdown', required: true },
    requestDate: { type: Date, default: () => new Date() },
    interventionDate: { type: Date },
    estimatedCost: { type: Number },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' }
  },
  { timestamps: true }
);

export default model<IHistory>('History', historySchema);
