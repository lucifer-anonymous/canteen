import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type OrderStatus = 'placed' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface IOrderItem {
  menuItem: Types.ObjectId;
  name: string;
  price: number;
  qty: number;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: ['placed', 'preparing', 'ready', 'served', 'cancelled'], default: 'placed', index: true },
    notes: { type: String },
  },
  { timestamps: true }
);

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', OrderSchema);
export default Order;
