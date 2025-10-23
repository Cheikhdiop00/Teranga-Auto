import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  client: Types.ObjectId; // ref Client
  mechanic: Types.ObjectId; // ref Mechanic
  breakdown?: Types.ObjectId; // optional ref Breakdown
  rating: number; // 1-5
  comment?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    mechanic: { type: Schema.Types.ObjectId, ref: 'Mechanic', required: true, index: true },
    breakdown: { type: Schema.Types.ObjectId, ref: 'Breakdown' },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
    date: { type: Date, default: () => new Date() }
  },
  { timestamps: true }
);

export default model<IReview>('Review', reviewSchema);
