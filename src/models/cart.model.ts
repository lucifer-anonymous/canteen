import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICartItem {
  menuItem: Types.ObjectId;
  name: string;
  price: number;
  qty: number;
}

export interface ICart extends Document {
  user: Types.ObjectId;
  items: ICartItem[];
  subtotal: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const CartSchema = new Schema<ICart>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [CartItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

function recalc(cart: ICart) {
  const subtotal = cart.items.reduce((sum, it) => sum + it.price * it.qty, 0);
  cart.subtotal = Number(subtotal.toFixed(2));
  cart.total = cart.subtotal; // extend with taxes/fees if needed
}

CartSchema.pre('save', async function () {
  recalc(this as unknown as ICart);
});

const Cart: Model<ICart> = mongoose.model<ICart>('Cart', CartSchema);
export default Cart;
export { recalc };
