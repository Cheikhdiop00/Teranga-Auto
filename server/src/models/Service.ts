import { Schema, model, Document } from 'mongoose';

export interface IService extends Document {
  name: string;
  description?: string;
  basePrice?: number;
  scoreAverage?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    name: { type: String, required: true },
    description: { type: String },
    basePrice: { type: Number },
    scoreAverage: { type: Number, min: 0, max: 5, default: 0 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default model<IService>('Service', serviceSchema);
