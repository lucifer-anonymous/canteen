import bcrypt from 'bcryptjs';

export async function hashPassword(plain: string): Promise<string> {
  console.log('🔐 Hashing password...');
  console.log('   Plain text:', plain);
  
  const salt = await bcrypt.genSalt(10);
  console.log('   Generated salt:', salt);
  
  const hashed = await bcrypt.hash(plain, salt);
  console.log('   Hashed password:', hashed);
  
  return hashed;
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  try {
    console.log('🔍 Comparing password with hash...');
    console.log('   Plain text:', plain);
    console.log('   Hash to compare:', hash);
    
    const isMatch = await bcrypt.compare(plain, hash);
    console.log('   Password match:', isMatch);
    
    if (!isMatch) {
      console.error('❌ Password does not match hash');
      // Try to diagnose the issue
      const parts = hash.split('$');
      if (parts.length < 3) {
        console.error('❌ Invalid hash format - not enough parts');
      } else {
        console.log('   Hash info:', {
          algorithm: parts[1],
          costFactor: parts[2].substring(0, 2),
          saltLength: parts[2].length - 2,
          hashLength: parts[3]?.length || 0
        });
      }
    }
    
    return isMatch;
  } catch (error) {
    console.error('❌ Error in comparePassword:', error);
    throw error;
  }
}
