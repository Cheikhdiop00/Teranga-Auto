import { Schema, model, Document, Types } from 'mongoose';

export interface IMechanic extends Document {
  user: Types.ObjectId; // ref User
  nationalId?: string; // numero_cin
  specialty?: string;
  specialties?: string[];
  interventionZone?: string;
  available?: boolean;
  reputation?: number; // 0-5
  missionStatus?: 'idle' | 'on_mission' | 'unavailable';
  interventionsCount?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
}

const mechanicSchema = new Schema<IMechanic>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    nationalId: { type: String },
    specialty: { type: String },
    specialties: [{ type: String }],
    interventionZone: { type: String },
    available: { type: Boolean, default: true },
    reputation: { type: Number, min: 0, max: 5, default: 0 },
    missionStatus: { type: String, enum: ['idle', 'on_mission', 'unavailable'], default: 'idle' },
    interventionsCount: { type: Number, default: 0 },
    address: { type: String },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  { timestamps: true }
);

export default model<IMechanic>('Mechanic', mechanicSchema);
