import { Schema, model, Document, Types } from 'mongoose';

export interface IAdvice extends Document {
  title: string;
  content: string;
  category?: string;
  author?: Types.ObjectId; // ref User (admin)
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adviceSchema = new Schema<IAdvice>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date }
  },
  { timestamps: true }
);

export default model<IAdvice>('Advice', adviceSchema);
