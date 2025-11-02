import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  read: boolean;
  readAt?: Date;
  messageType: 'text' | 'image' | 'file' | 'audio';
  fileUrl?: string;
  fileName?: string;
  audioDurationMs?: number;
}

const messageSchema = new Schema<IMessage>({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  messageType: { type: String, enum: ['text', 'image', 'file', 'audio'], default: 'text' },
  fileUrl: { type: String },
  fileName: { type: String },
  audioDurationMs: { type: Number }
}, { timestamps: true });

export default model<IMessage>('Message', messageSchema);
