import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category: Types.ObjectId;
  isAvailable: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    isAvailable: { type: Boolean, default: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

MenuItemSchema.index({ name: 'text', description: 'text' });

const MenuItem: Model<IMenuItem> = mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);
export default MenuItem;
