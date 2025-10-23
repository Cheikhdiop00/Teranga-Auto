import { Schema, model, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

const conversationSchema = new Schema<IConversation>({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

conversationSchema.index({ participants: 1 }, { unique: true });

export default model<IConversation>('Conversation', conversationSchema);
