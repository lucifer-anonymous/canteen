import { Router, Request, Response } from 'express';
import User from '@/models/user.model';
import { sign } from '@/utils/jwt';
import logger from '@/utils/logger';
import { validate } from '@/middlewares/validate';
import { studentRegisterBody, studentVerifyBody, studentLoginBody } from '@/validation/auth.schema';
import { sendMail } from '@/utils/email';

const router = Router();

function sanitizeUser(u: any) {
  if (!u) return u;
  const obj = typeof u.toObject === 'function' ? u.toObject() : { ...u };
  delete obj.password;
  return obj;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /register - initiate registration and send OTP
router.post('/register', validate({ body: studentRegisterBody }), async (req: Request, res: Response) => {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    logger.info(`[${requestId}] === REGISTRATION REQUEST STARTED ===`);
    
    // Log detailed request information
    logger.info(`[${requestId}] Request URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
    logger.info(`[${requestId}] Request method: ${req.method}`);
    logger.info(`[${requestId}] Request headers:`, JSON.stringify(req.headers, null, 2));
    logger.info(`[${requestId}] Request IP: ${req.ip}`);
    logger.info(`[${requestId}] Request body:`, JSON.stringify(req.body, null, 2));
    
    // Log environment variables that might affect authentication
    logger.info(`[${requestId}] NODE_ENV: ${process.env.NODE_ENV}`);
    logger.info(`[${requestId}] JWT_SECRET: ${process.env.JWT_SECRET ? '***' : 'Not set'}`);
    
    const { name, registrationNo, email, password } = req.body as {
      name: string;
      registrationNo: string;
      email: string;
      password: string;
    };
    
    logger.info(`[${requestId}] Extracted registration data:`, { 
      name: name?.substring(0, 10) + (name?.length > 10 ? '...' : ''), 
      registrationNo: registrationNo?.substring(0, 10) + (registrationNo?.length > 10 ? '...' : ''), 
      email: email?.substring(0, 10) + (email?.length > 10 ? '...' : '') 
    });
    
    // Validate required fields
    if (!name || !registrationNo || !email || !password) {
      logger.error(`[${requestId}] Missing required fields`);
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    let user = await User.findOne({ $or: [{ registrationNo }, { email }] });
    const otp = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    if (user) {
      logger.info(`[${requestId}] Found existing user with email/registrationNo`);
      
      if (user.isVerified) {
        logger.warn(`[${requestId}] User already registered and verified`);
        return res.status(409).json({ 
          success: false, 
          message: 'This email or registration number is already registered and verified. Please log in instead.' 
        });
      }
      
      logger.info(`[${requestId}] Updating existing unverified user`);
      user.name = name;
      user.email = email;
      user.password = password;
      user.registrationNo = registrationNo;
      user.otpCode = otp;
      user.otpExpiresAt = expires;
      await user.save();
    } else {
      user = await User.create({
        name,
        email,
        password,
        role: 'student',
        registrationNo,
        isVerified: false,
        otpCode: otp,
        otpExpiresAt: expires,
      });
    }

    try {
      logger.info(`[${requestId}] Sending OTP email to ${email}`);
      
      // Include OTP in response for development (remove in production)
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Your OTP for email verification is:</p>
          <h1 style="font-size: 2.5em; letter-spacing: 5px; color: #2563eb;">${otp}</h1>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `;
      const emailText = `Your OTP is: ${otp}\nThis OTP is valid for 10 minutes.`;
      
      const emailResponse = await sendMail(
        email,
        'Verify Your Email',
        emailHtml,
        emailText
      );
      
      logger.info(`[${requestId}] Email sending response:`, JSON.stringify(emailResponse));
      logger.info(`[${requestId}] OTP for ${email}: ${otp}`); // Log OTP for testing
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[${requestId}] Failed to send OTP email:`, errorMessage);
      logger.error(`[${requestId}] Error details:`, error);
      
      // For development: Include OTP in the response if email fails
      if (process.env.NODE_ENV === 'development') {
        logger.warn(`[${requestId}] Development mode: Including OTP in response`);
        return res.status(201).json({
          success: true,
          message: 'Registration successful. OTP sent to email (check console for OTP in development)',
          data: {
            registrationNo,
            email,
            otp, // Only include in development
            expires: new Date(Date.now() + 10 * 60 * 1000).toISOString()
          }
        });
      }
      
      // In production, don't expose the OTP
      throw new Error('Failed to send verification email. Please try again.');
    }

    logger.info(`[${requestId}] Registration successful, sending response`);
    
    const responseData = {
      success: true,
      message: 'OTP sent to email for verification',
      data: {
        registrationNo,
        email: email, // Only include non-sensitive data
        expires: new Date(Date.now() + 10 * 60 * 1000).toISOString() // OTP expires in 10 minutes
      }
    };
    
    logger.info(`[${requestId}] Sending success response:`, JSON.stringify(responseData));
    res.status(201).json(responseData);
  } catch (err) {
    const error = err as Error;
    const errorId = `err_${Date.now()}`;
    
    logger.error(`[${requestId}] === REGISTRATION ERROR (${errorId}) ===`);
    logger.error(`[${requestId}] Error details:`, {
      errorId,
      name: error.name,
      message: error.message,
      stack: error.stack,
      rawError: JSON.stringify(err, Object.getOwnPropertyNames(err)),
      request: {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params,
        ip: req.ip,
        ips: req.ips,
        hostname: req.hostname,
        protocol: req.protocol,
        secure: req.secure
      }
    });
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        error: error.message 
      });
    }
    
    if (error.name === 'MongoError') {
      // Check for duplicate key error (MongoDB error code 11000)
      if (error.message.includes('E11000') || error.message.includes('duplicate key')) {
        return res.status(409).json({ 
          success: false, 
          message: 'Email or registration number already in use' 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Database error during registration' 
      });
    }
    
    // Default error response
    return res.status(500).json({ 
      success: false, 
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /verify - verify OTP to activate account
router.post('/verify', validate({ body: studentVerifyBody }), async (req: Request, res: Response) => {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    const { registrationNo, otp } = req.body as any;
    logger.info(`[${requestId}] OTP verification request for ${registrationNo}`);
    
    // Find user by registration number
    const user = await User.findOne({ registrationNo });
    if (!user) {
      logger.warn(`[${requestId}] User not found: ${registrationNo}`);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found. Please check your registration number.' 
      });
    }
    
    logger.debug(`[${requestId}] User found: ${user.email}, Verified: ${user.isVerified}`);
    
    // Check if already verified
    if (user.isVerified) {
      logger.info(`[${requestId}] User already verified: ${user.email}`);
      
      // If already verified but trying to verify again, log them in
      const token = sign({ 
        sub: user._id.toString(), 
        email: user.email, 
        role: user.role 
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Account already verified. You have been logged in.',
        data: sanitizeUser(user), 
        token 
      });
    }
    
    // Check if OTP exists and is not expired
    if (!user.otpCode || !user.otpExpiresAt) {
      logger.warn(`[${requestId}] No OTP found for user: ${user.email}`);
      return res.status(400).json({ 
        success: false, 
        message: 'No active verification code found. Please request a new one.' 
      });
    }
    
    // Verify OTP
    if (user.otpCode !== otp) {
      logger.warn(`[${requestId}] Invalid OTP attempt for user: ${user.email}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification code. Please try again.' 
      });
    }
    
    // Check if OTP is expired
    if (user.otpExpiresAt.getTime() < Date.now()) {
      logger.warn(`[${requestId}] Expired OTP for user: ${user.email}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code has expired. Please request a new one.' 
      });
    }
    
    // Mark user as verified and clear OTP
    user.isVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    
    // Save the updated user
    await user.save();
    
    logger.info(`[${requestId}] User verified successfully: ${user.email}`);
    
    // Generate JWT token for auto-login
    const token = sign({ 
      sub: user._id.toString(), 
      email: user.email, 
      role: user.role 
    });
    
    // Return success response with user data and token
    return res.status(200).json({ 
      success: true, 
      message: 'Account verified successfully!',
      data: sanitizeUser(user), 
      token 
    });
    
  } catch (err) {
    const error = err as Error;
    logger.error(`[${requestId}] OTP verification error:`, error.message);
    logger.error(`[${requestId}] Error details:`, error);
    
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred during verification. Please try again.'
    });
  }
});

// POST login - student login
// Student login route
router.post('/login', validate({ body: studentLoginBody }), async (req: Request, res: Response) => {
  const { registrationNo, password } = req.body as { registrationNo: string; password: string };
  
  logger.info('=== LOGIN ATTEMPT ===');
  logger.debug('Login request details', {
    registrationNo,
    passwordLength: password?.length,
    clientIp: req.ip,
    userAgent: req.get('user-agent')
  });
  
  try {
    // Find user by registration number
    logger.debug('Looking up user by registration number', { registrationNo });
    const user = await User.findOne({ registrationNo }).select('+password').lean();
    
    if (!user) {
      logger.warn('User not found', { registrationNo });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    logger.debug('User found in database', {
      userId: user._id,
      email: user.email,
      isVerified: user.isVerified,
      role: user.role,
      passwordHashLength: user.password?.length,
      passwordHashPrefix: user.password?.substring(0, 10) + '...',
      createdAt: user.createdAt
    });
    
    if (!user.isVerified) {
      logger.warn('Login attempt for unverified account', { userId: user._id });
      return res.status(403).json({ success: false, message: 'Account not verified' });
    }

    // Compare passwords
    logger.debug('Starting password comparison');
    let isMatch = false;
    
    try {
      const bcrypt = await import('bcryptjs');
      
      // Log detailed password comparison info
      logger.debug('Password comparison details', {
        inputPassword: password,
        storedHash: user.password,
        hashAlgorithm: user.password?.split('$')[1],
        costFactor: user.password?.split('$')[2]?.substring(0, 2),
        salt: user.password?.substring(0, 29)
      });
      
      // Test with a known good hash to verify bcrypt is working
      const testHash = '$2b$10$b0/CseL6/bMqwVeDUUc3nOzfN4oZVHi8qml1GhklE83ZUcbuXyfOW';
      const testCompare = await bcrypt.compare('Test@1234', testHash);
      logger.debug('Test comparison with known good hash:', { testCompare });
      
      // Try direct bcrypt comparison first
      isMatch = await bcrypt.compare(password, user.password);
      logger.debug('Direct bcrypt comparison result', { 
        method: 'direct_bcrypt',
        match: isMatch
      });
      
      // If direct compare fails, try with trimmed password
      if (!isMatch) {
        const trimmedPassword = password.trim();
        isMatch = await bcrypt.compare(trimmedPassword, user.password);
        logger.debug('Trimmed password comparison result:', { 
          match: isMatch, 
          wasTrimmed: trimmedPassword !== password 
        });
      }
      
      // If still no match, try model method as fallback
      if (!isMatch) {
        logger.debug('Direct compare failed, trying model method');
        const userDoc = await User.findById(user._id).select('+password');
        if (userDoc) {
          isMatch = await userDoc.comparePassword(password);
          logger.debug('Model compare result', { 
            method: 'model_method',
            match: isMatch
          });
        }
      }
    } catch (compareError) {
      logger.error('Error during password comparison', {
        error: compareError,
        userId: user._id
      });
      return res.status(500).json({ 
        success: false, 
        message: 'Error during authentication' 
      });
    }
    
    if (!isMatch) {
      logger.warn('Invalid password attempt', { 
        userId: user._id,
        registrationNo,
        passwordLength: password?.length,
        storedHashPrefix: user.password?.substring(0, 10) + '...',
        hashAlgorithm: user.password?.split('$')[1],
        costFactor: user.password?.split('$')[2]?.substring(0, 2)
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // If we get here, login was successful
    logger.info('Login successful', { userId: user._id, email: user.email });
    
    // Generate JWT token
    const token = sign({ 
      sub: user._id.toString(), 
      email: user.email, 
      role: user.role 
    });
    
    logger.debug('Generated JWT token', { token: token ? '***' : 'null' });
    
    return res.status(200).json({
      success: true,
      data: sanitizeUser(user),
      token
    });
    
  } catch (error) {
    logger.error('Login error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      registrationNo,
      clientIp: req.ip
    });
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

export default router;
