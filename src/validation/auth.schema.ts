import { z } from 'zod';

export const registerBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'staff', 'student']).optional(),
});

export const loginBody = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(6),
}).refine(data => data.email || data.username, {
  message: 'Either email or username is required',
  path: ['email']
});

export const studentRegisterBody = z.object({
  name: z.string().min(1),
  registrationNo: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

export const studentVerifyBody = z.object({
  registrationNo: z.string().min(3),
  otp: z.string().regex(/^\d{6}$/),
});

export const studentLoginBody = z.object({
  registrationNo: z.string().min(3),
  password: z.string().min(6),
});
