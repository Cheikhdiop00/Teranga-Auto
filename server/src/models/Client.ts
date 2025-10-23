import { Schema, model, Document, Types } from 'mongoose';

export interface IClient extends Document {
  user: Types.ObjectId; // ref User
  nationalId?: string; // numero_cin
  address?: string;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    nationalId: { type: String },
    address: { type: String },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  { timestamps: true }
);

export default model<IClient>('Client', clientSchema);
