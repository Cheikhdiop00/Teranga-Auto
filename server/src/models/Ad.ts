import { Schema, model, Document, Types } from 'mongoose';

export interface IAd extends Document {
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  startDate: Date;
  endDate: Date;
  isPublished: boolean;
  publishedBy: Types.ObjectId;
  targetRoles: string[];
  priority: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const adSchema = new Schema<IAd>(
  {
    title: { 
      type: String, 
      required: [true, 'Le titre est obligatoire'] 
    },
    description: { 
      type: String, 
      required: [true, 'La description est obligatoire'] 
    },
    imageUrl: { 
      type: String, 
      required: [true, 'L\'image est obligatoire'] 
    },
    category: { 
      type: String,
      enum: ['PROMOTION', 'INFORMATION', 'MAINTENANCE', 'AUTRE'],
      default: 'INFORMATION'
    },
    startDate: { 
      type: Date, 
      default: Date.now 
    },
    endDate: { 
      type: Date,
      validate: {
        validator: function(this: IAd, value: Date) {
          return !this.startDate || value > this.startDate;
        },
        message: 'La date de fin doit être postérieure à la date de début'
      }
    },
    isPublished: { 
      type: Boolean, 
      default: false 
    },
    publishedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    targetRoles: [{
      type: String,
      enum: ['CLIENT', 'MECANICIEN', 'ALL'],
      default: ['ALL']
    }],
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    active: { 
      type: Boolean, 
      default: true 
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index pour les requêtes fréquentes
adSchema.index({ isPublished: 1, targetRoles: 1, startDate: 1, endDate: 1 });

export default model<IAd>('Ad', adSchema);
