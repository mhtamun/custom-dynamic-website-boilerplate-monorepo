import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/index.js';
import envVariables from './env.js';

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    if (!envVariables.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return null;
    }

    // Match passport-jwt behavior: don't restrict algorithms explicitly
    // passport-jwt uses jsonwebtoken.verify which accepts multiple algorithms by default
    // The token is signed with HS256, so it will verify correctly
    const decoded = jwt.verify(token, envVariables.JWT_SECRET, {
      issuer: envVariables.JWT_ISSUER,
    }) as JwtPayload;

    // Log decoded token in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('JWT decoded successfully:', {
        email: decoded.email,
        name: decoded.name,
        iss: decoded.iss,
        sub: decoded.sub,
      });
    }

    return decoded;
  } catch (err) {
    // Log detailed error for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('JWT verification error:', {
        message: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : 'Unknown',
        secretLength: envVariables.JWT_SECRET?.length || 0,
        secretPreview: envVariables.JWT_SECRET?.substring(0, 5) + '...',
      });
    }
    return null;
  }
};

export const validateTokenPayload = (decoded: JwtPayload): boolean => {
  // Match API app validation: just check for email in payload
  // The API app's JwtStrategy only validates that payload has email field
  if (decoded.email) {
    return true;
  }
  return false;
};
