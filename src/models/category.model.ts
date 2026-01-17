import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CategorySchema.pre('validate', function () {
  const doc = this as unknown as { slug?: string; name?: string };
  if (!doc.slug && doc.name) {
    doc.slug = toSlug(doc.name);
  }
});

const Category: Model<ICategory> = mongoose.model<ICategory>('Category', CategorySchema);
export default Category;
