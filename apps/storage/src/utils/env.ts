// Environment variable validation and export
// This file validates environment variables at module load time and exits if validation fails
import dotenv from 'dotenv';
import { z } from 'zod';
import type { EnvVariables } from '../types/env.js';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().optional(),
  PORT: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .optional(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_ISSUER: z.string().min(1, 'JWT_ISSUER is required'),
  ATTACHMENT_FOLDER_PATH: z.string().min(1, 'ATTACHMENT_FOLDER_PATH is required'),
  PUBLIC_URL: z.string().url('PUBLIC_URL must be a valid URL').optional(),
  LOCAL_URL: z.string().url('LOCAL_URL must be a valid URL').optional(),
  LOG_DIR_PATH: z.string().min(1, 'LOG_DIR_PATH is required'),
});

let env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const errorMessages = error.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join('\n');
    console.error('❌ Environment validation failed:\n', errorMessages);
    process.exit(1);
  }
  throw error;
}

const envVariables: EnvVariables = {
  ENV: env.NODE_ENV as EnvVariables['ENV'],
  HOST: env.HOST,
  PORT: env.PORT,
  JWT_SECRET: env.JWT_SECRET,
  JWT_ISSUER: env.JWT_ISSUER,
  ATTACHMENT_FOLDER_PATH: env.ATTACHMENT_FOLDER_PATH,
  PUBLIC_URL: env.PUBLIC_URL || `http://${env.HOST || 'localhost'}:${env.PORT || 5001}`,
  LOCAL_URL: env.LOCAL_URL || `http://localhost:${env.PORT || 5001}`,
  LOG_DIR_PATH: env.LOG_DIR_PATH,
};

export default envVariables;
