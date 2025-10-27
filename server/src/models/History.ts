import { Schema, model, Document, Types } from 'mongoose';

export type HistoryStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface IHistory extends Document {
  client: Types.ObjectId; // ref Client
  mechanic: Types.ObjectId; // ref Mechanic
  breakdown: Types.ObjectId; // ref Breakdown
  requestDate: Date;
  interventionDate?: Date;
  estimatedCost?: number;
  serviceType?: string;
  description?: string;
  locationAddress?: string;
  clientName?: string;
  mechanicName?: string;
  distanceKm?: number;
  durationMinutes?: number;
  notes?: string;
  closedAt?: Date;
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
    serviceType: { type: String },
    description: { type: String },
    locationAddress: { type: String },
    clientName: { type: String },
    mechanicName: { type: String },
    distanceKm: { type: Number },
    durationMinutes: { type: Number },
    notes: { type: String },
    closedAt: { type: Date },
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' }
  },
  { timestamps: true }
);

export default model<IHistory>('History', historySchema);
