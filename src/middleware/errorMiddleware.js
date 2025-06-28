/**
 * 🛡️ ERROR & SECURITY MIDDLEWARE
 * Modern error handling and security for All-KI
 * 
 * FILE: src/middleware/errorMiddleware.js
 */

const isDev = process.env.NODE_ENV === 'development';

// ========================================
// NOT FOUND MIDDLEWARE
// ========================================
const notFound = (req, res, next) => {
    const error = new Error(`🔍 Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// ========================================
// GLOBAL ERROR HANDLER
// ========================================
const errorHandler = (err, req, res, next) => {
    // Set default status code
    let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    let message = err.message;

    // Mongoose bad ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404;
        message = 'Ressource nicht gefunden';
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        statusCode = 400;
        message = 'Duplicate field value entered';
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map(val => val.message).join(', ');
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Token ungültig';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token abgelaufen';
    }

    // Log error in development
    if (isDev) {
        console.error('❌ Error Details:', {
            message: err.message,
            stack: err.stack,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    }

    // Error response
    const errorResponse = {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
    };

    // Add stack trace in development
    if (isDev) {
        errorResponse.stack = err.stack;
        errorResponse.details = {
            name: err.name,
            code: err.code
        };
    }

    // Log to monitoring service in production
    if (!isDev) {
        // TODO: Send to logging service (e.g., Sentry, LogRocket)
        console.error(`Production Error: ${message} - ${req.method} ${req.originalUrl}`);
    }

    res.status(statusCode).json(errorResponse);
};

// ========================================
// ASYNC ERROR WRAPPER
// ========================================
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ========================================
// VALIDATION ERROR HANDLER
// ========================================
const validationHandler = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        
        if (error) {
            const errorMessage = error.details
                .map(detail => detail.message)
                .join(', ');
            
            return res.status(400).json({
                success: false,
                error: 'Validierungsfehler',
                details: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
        
        next();
    };
};

// ========================================
// RATE LIMIT ERROR HANDLER
// ========================================
const rateLimitHandler = (req, res) => {
    res.status(429).json({
        success: false,
        error: 'Zu viele Anfragen',
        message: 'Rate limit erreicht. Bitte versuche es später erneut.',
        retryAfter: res.get('Retry-After') || '60 Sekunden',
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    notFound,
    errorHandler,
    asyncHandler,
    validationHandler,
    rateLimitHandler
};