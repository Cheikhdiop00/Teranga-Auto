import { Schema, model, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  participantsHash?: string;
}

const conversationSchema = new Schema<IConversation>({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  isActive: { type: Boolean, default: true },
  participantsHash: { type: String, unique: true, index: true }
}, { timestamps: true });

conversationSchema.index({ participants: 1 });

conversationSchema.pre('save', function (next) {
  if (Array.isArray(this.participants) && this.participants.length === 2) {
    this.participantsHash = this.participants.map((id) => id.toString()).sort().join(':');
  }
  next();
});

export default model<IConversation>('Conversation', conversationSchema);
