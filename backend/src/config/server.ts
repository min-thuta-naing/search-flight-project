import dotenv from 'dotenv';

dotenv.config();

export const serverConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  rateLimit: {
    // In development, use more lenient rate limits
    // In production, use stricter limits
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute (default)
    max: parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS || 
      (process.env.NODE_ENV === 'production' ? '300' : '1000'), // 1000 in dev, 300 in prod
      10
    ),
  },
};

