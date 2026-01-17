import mongoose, { Schema, Document, Model, HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';
import { hashPassword } from '../utils/password';

export interface IUser extends Document {
  name: string;
  email: string;
  username?: string;  // For admin/staff login
  password: string;
  role: 'admin' | 'staff' | 'student';
  registrationNo?: string;
  isVerified?: boolean;
  otpCode?: string | null;
  otpExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { 
      type: String, 
      unique: true, 
      sparse: true, // Allows multiple null values
      trim: true,
      lowercase: true
    },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['admin', 'staff', 'student'], default: 'student' },
    registrationNo: { type: String, unique: true, sparse: true, trim: true },
    isVerified: { type: Boolean, default: false },
    otpCode: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (this: HydratedDocument<IUser>) {
  if (!this.isModified('password')) return;
  
  // Check if password is already hashed
  const isAlreadyHashed = this.password.startsWith('$2b$') && this.password.length === 60;
  
  if (!isAlreadyHashed) {
    console.log('🔐 Hashing new password...');
    this.password = await hashPassword(this.password);
  } else {
    console.log('🔑 Password is already hashed, skipping re-hash');
  }
});

// Define the method with proper typing
UserSchema.methods.comparePassword = async function(candidate: string): Promise<boolean> {
  const user = this as IUser;
  
  try {
    console.log('\n=== COMPARE PASSWORD METHOD ===');
    console.log('User ID:', user._id);
    console.log('User email:', user.email);
    
    if (!user.password) {
      console.error('❌ No password set for user:', user._id);
      return false;
    }
    
    console.log('🔑 Password comparison details:', {
      candidateLength: candidate.length,
      candidateStartsWith: candidate.substring(0, 2) + '...' + candidate.substring(candidate.length - 2),
      storedHashLength: user.password.length,
      storedHashStartsWith: user.password.substring(0, 7) + '...',
      storedHashEndsWith: '...' + user.password.substring(user.password.length - 3)
    });
    
    // Directly use bcrypt.compare for more reliable comparison
    const isMatch = await bcrypt.compare(candidate, user.password);
    
    if (!isMatch) {
      console.error('❌ Password comparison failed for user:', {
        userId: user._id,
        email: user.email,
        storedHashLength: user.password.length,
        storedHashPrefix: user.password.substring(0, 10) + '...',
        candidateLength: candidate.length,
        candidateStartsWith: candidate.substring(0, 2) + '...' + candidate.substring(candidate.length - 2)
      });
    } else {
      console.log('✅ Password matches for user:', user.email);
    }
    
    return isMatch;
  } catch (error) {
    console.error('❌ Error comparing passwords:', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      userId: user._id,
      hasStoredPassword: !!user.password,
      storedPasswordLength: user.password?.length,
      candidateLength: candidate?.length
    });
    return false;
  }
};

// Add a static method to compare passwords
UserSchema.statics.comparePassword = async function(candidate: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidate, hash);
  } catch (error) {
    console.error('Error in static comparePassword:', error);
    return false;
  }
};

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;
