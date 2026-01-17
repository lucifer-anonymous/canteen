import jwt, { SignOptions, JwtPayload, Secret } from 'jsonwebtoken';
import config from '@/config/config';

const secret: Secret = config.jwtSecret as unknown as Secret;

export const sign = (
  payload: string | object | Buffer,
  options?: SignOptions
): string => {
  const base: SignOptions = { expiresIn: config.jwtExpiresIn as any };
  return jwt.sign(payload, secret, { ...base, ...(options || {}) });
};

export const verify = <T = JwtPayload | string>(token: string): T => {
  return jwt.verify(token, secret) as T;
};

export default { sign, verify };
