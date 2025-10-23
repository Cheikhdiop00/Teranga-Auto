import { Schema, model, Document, Types } from 'mongoose';

export type BreakdownStatus = 'open' | 'in_progress' | 'closed';

export interface IBreakdown extends Document {
  client: Types.ObjectId; // ref Client
  mechanic?: Types.ObjectId; // ref Mechanic (optional, when assigned)
  description: string;
  latitude?: number;
  longitude?: number;
  reportedAt: Date;
  status: BreakdownStatus;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const breakdownSchema = new Schema<IBreakdown>(
  {
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    mechanic: { type: Schema.Types.ObjectId, ref: 'Mechanic' },
    description: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    reportedAt: { type: Date, default: () => new Date() },
    status: { type: String, enum: ['open', 'in_progress', 'closed'], default: 'open' },
    closedAt: { type: Date }
  },
  { timestamps: true }
);

export default model<IBreakdown>('Breakdown', breakdownSchema);
