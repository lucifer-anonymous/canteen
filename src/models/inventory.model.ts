import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IInventory extends Document {
  menuItem: Types.ObjectId;
  quantity: number;
  lowStockThreshold?: number;
  unit?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true, unique: true, index: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 0 },
    unit: { type: String },
  },
  { timestamps: true }
);

InventorySchema.pre('save', async function () {
  const doc = this as unknown as IInventory;
  if (doc.quantity < 0) doc.quantity = 0;
  if ((doc.lowStockThreshold ?? 0) < 0) doc.lowStockThreshold = 0;
});

const Inventory: Model<IInventory> = mongoose.model<IInventory>('Inventory', InventorySchema);
export default Inventory;
