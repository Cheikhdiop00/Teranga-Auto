import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  user: Types.ObjectId; // ref User
  title: string;
  content: string;
  type?: string; // e.g., system, chat, status
  read: boolean;
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String },
    read: { type: Boolean, default: false },
    sentAt: { type: Date, default: () => new Date() }
  },
  { timestamps: true }
);

export default model<INotification>('Notification', notificationSchema);
