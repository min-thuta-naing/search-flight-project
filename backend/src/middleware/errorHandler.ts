import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    console.error('\n' + '='.repeat(80));
    console.error('[ERROR] [Validation] Zod Validation Error');
    console.error(`  Timestamp: ${new Date().toISOString()}`);
    console.error(`  Request: ${req.method} ${req.path}`);
    console.error(`  URL: ${req.originalUrl || req.url}`);
    console.error('  Validation Errors:', JSON.stringify(err.errors, null, 2));
    if (req.body && Object.keys(req.body).length > 0) {
      // Sanitize sensitive data before logging
      const sanitizedBody = { ...req.body };
      if (sanitizedBody.password) sanitizedBody.password = '***';
      if (sanitizedBody.token) sanitizedBody.token = '***';
      console.error('  Request Body:', JSON.stringify(sanitizedBody, null, 2));
    }
    console.error('='.repeat(80) + '\n');

    res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: err.errors,
    });
    return;
  }

  // Custom API errors
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const timestamp = new Date().toISOString();

  // Enhanced error logging
  const errorLog = {
    timestamp,
    statusCode,
    error: err.name || 'Error',
    message,
    code: err.code,
    path: req.path,
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.socket.remoteAddress,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  // Log request body/query if available (sanitized)
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '***';
    if (sanitizedBody.token) sanitizedBody.token = '***';
    (errorLog as any).requestBody = sanitizedBody;
  }
  if (req.query && Object.keys(req.query).length > 0) {
    (errorLog as any).requestQuery = req.query;
  }

  console.error('\n' + '='.repeat(80));
  console.error('❌ API Error:', JSON.stringify(errorLog, null, 2));
  console.error('='.repeat(80) + '\n');

  res.status(statusCode).json({
    error: err.name || 'Error',
    message,
    code: err.code,
    timestamp,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, path: req.path }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
}

