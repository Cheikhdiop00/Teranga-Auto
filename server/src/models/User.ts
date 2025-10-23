import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'ADMIN' | 'CLIENT' | 'MECANICIEN';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  profilePhoto?: string;
  status?: 'active' | 'inactive' | 'pending';
  role: UserRole;
  invitedBy?: Schema.Types.ObjectId; // Reference to the mechanic who invited this client
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true, select: false },
    phoneNumber: { type: String },
    profilePhoto: { type: String },
    status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
    role: { type: String, enum: ['ADMIN', 'CLIENT', 'MECANICIEN'], required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Optional, for clients invited by mechanics
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.password;
        return ret;
      }
    }
  }
);

userSchema.pre('save', async function (next) {
  const user = this as any;
  if (!user.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  next();
});

export default model<IUser>('User', userSchema);
