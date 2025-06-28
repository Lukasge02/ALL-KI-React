/**
 * 🔐 ALL-KI AUTH MIDDLEWARE - MODERN VERSION 2.0
 * JWT authentication, authorization, and security middleware
 * 
 * EINFÜGEN IN: src/middleware/auth.js
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { log } = require('./logger');

// ========================================
// JWT AUTHENTICATION MIDDLEWARE
// ========================================

const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authorization Token erforderlich',
                code: 'NO_TOKEN'
            });
        }
        
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token ist leer',
                code: 'EMPTY_TOKEN'
            });
        }
        
        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            let errorCode = 'INVALID_TOKEN';
            let errorMessage = 'Ungültiger Token';
            
            if (jwtError.name === 'TokenExpiredError') {
                errorCode = 'TOKEN_EXPIRED';
                errorMessage = 'Token ist abgelaufen';
            } else if (jwtError.name === 'JsonWebTokenError') {
                errorCode = 'MALFORMED_TOKEN';
                errorMessage = 'Token ist fehlerhaft';
            }
            
            return res.status(401).json({
                success: false,
                error: errorMessage,
                code: errorCode
            });
        }
        
        // Check token type
        if (decoded.type !== 'access') {
            return res.status(401).json({
                success: false,
                error: 'Ungültiger Token-Typ',
                code: 'INVALID_TOKEN_TYPE'
            });
        }
        
        // Find user
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Benutzer nicht gefunden',
                code: 'USER_NOT_FOUND'
            });
        }
        
        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Konto wurde deaktiviert',
                code: 'ACCOUNT_DISABLED'
            });
        }
        
        // Check if account is locked
        if (user.isAccountLocked) {
            return res.status(401).json({
                success: false,
                error: 'Konto ist gesperrt',
                code: 'ACCOUNT_LOCKED',
                lockedUntil: user.security.loginAttempts.lockedUntil
            });
        }
        
        // Update last activity
        user.updateLastActivity();
        
        // Attach user to request
        req.user = {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            preferences: user.preferences,
            subscription: user.subscription
        };
        
        next();
        
    } catch (error) {
        log.error('Auth middleware error', error, {
            path: req.path,
            method: req.method,
            ip: req.ip
        });
        
        res.status(500).json({
            success: false,
            error: 'Authentifizierungsfehler',
            code: 'AUTH_ERROR'
        });
    }
};

// ========================================
// OPTIONAL AUTHENTICATION
// ========================================

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return next();
        }
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            
            if (user && user.isActive && !user.isAccountLocked) {
                req.user = {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    preferences: user.preferences,
                    subscription: user.subscription
                };
            }
        } catch (error) {
            // Ignore token errors for optional auth
            log.debug('Optional auth failed', { error: error.message });
        }
        
        next();
        
    } catch (error) {
        log.error('Optional auth middleware error', error);
        next();
    }
};

// ========================================
// ROLE-BASED AUTHORIZATION
// ========================================

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentifizierung erforderlich',
                code: 'AUTH_REQUIRED'
            });
        }
        
        const userRole = req.user.subscription.plan || 'free';
        
        if (!roles.includes(userRole)) {
            log.warn('Insufficient permissions', {
                userId: req.user.id,
                userRole,
                requiredRoles: roles,
                path: req.path
            });
            
            return res.status(403).json({
                success: false,
                error: 'Unzureichende Berechtigung',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: roles,
                current: userRole
            });
        }
        
        next();
    };
};

// ========================================
// FEATURE ACCESS CONTROL
// ========================================

const requireFeature = (feature) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentifizierung erforderlich',
                code: 'AUTH_REQUIRED'
            });
        }
        
        try {
            const user = await User.findById(req.user.id);
            
            if (!user.canUseFeature(feature)) {
                const usage = user.subscription.usage;
                const limits = user.subscription.limits;
                
                return res.status(403).json({
                    success: false,
                    error: `Feature-Limit erreicht: ${feature}`,
                    code: 'FEATURE_LIMIT_EXCEEDED',
                    feature,
                    usage: usage[feature] || 0,
                    limit: limits[feature] || 0,
                    resetDate: usage.resetDate
                });
            }
            
            next();
            
        } catch (error) {
            log.error('Feature access check error', error, {
                userId: req.user.id,
                feature
            });
            
            res.status(500).json({
                success: false,
                error: 'Fehler bei Berechtigungsprüfung',
                code: 'PERMISSION_CHECK_ERROR'
            });
        }
    };
};

// ========================================
// RESOURCE OWNERSHIP VALIDATION
// ========================================

const requireOwnership = (model, paramName = 'id', userField = 'userId') => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentifizierung erforderlich',
                code: 'AUTH_REQUIRED'
            });
        }
        
        try {
            const resourceId = req.params[paramName];
            
            if (!resourceId) {
                return res.status(400).json({
                    success: false,
                    error: 'Ressourcen-ID erforderlich',
                    code: 'MISSING_RESOURCE_ID'
                });
            }
            
            const Model = require(`../models/${model}`);
            const resource = await Model.findById(resourceId);
            
            if (!resource) {
                return res.status(404).json({
                    success: false,
                    error: 'Ressource nicht gefunden',
                    code: 'RESOURCE_NOT_FOUND'
                });
            }
            
            // Check ownership
            if (!resource[userField] || !resource[userField].equals(req.user.id)) {
                log.warn('Unauthorized resource access attempt', {
                    userId: req.user.id,
                    resourceId,
                    model,
                    resourceOwner: resource[userField]
                });
                
                return res.status(403).json({
                    success: false,
                    error: 'Keine Berechtigung für diese Ressource',
                    code: 'RESOURCE_ACCESS_DENIED'
                });
            }
            
            // Attach resource to request for use in route handler
            req.resource = resource;
            
            next();
            
        } catch (error) {
            log.error('Ownership validation error', error, {
                userId: req.user.id,
                model,
                paramName
            });
            
            res.status(500).json({
                success: false,
                error: 'Fehler bei Berechtigungsprüfung',
                code: 'OWNERSHIP_CHECK_ERROR'
            });
        }
    };
};

// ========================================
// API KEY AUTHENTICATION
// ========================================

const requireApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'] || req.query.apiKey;
        
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: 'API Key erforderlich',
                code: 'NO_API_KEY'
            });
        }
        
        // Simple API key validation (you might want to store these in database)
        const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];
        
        if (!validApiKeys.includes(apiKey)) {
            log.warn('Invalid API key used', {
                apiKey: apiKey.substring(0, 8) + '...',
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            return res.status(401).json({
                success: false,
                error: 'Ungültiger API Key',
                code: 'INVALID_API_KEY'
            });
        }
        
        log.info('API key authentication successful', {
            apiKey: apiKey.substring(0, 8) + '...',
            path: req.path,
            ip: req.ip
        });
        
        // Set API user context
        req.user = {
            id: 'api-user',
            isApiUser: true,
            apiKey: apiKey.substring(0, 8) + '...'
        };
        
        next();
        
    } catch (error) {
        log.error('API key authentication error', error);
        
        res.status(500).json({
            success: false,
            error: 'API-Authentifizierungsfehler',
            code: 'API_AUTH_ERROR'
        });
    }
};

// ========================================
// SESSION VALIDATION
// ========================================

const validateSession = async (req, res, next) => {
    if (!req.user || req.user.isApiUser) {
        return next();
    }
    
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Sitzung ungültig',
                code: 'INVALID_SESSION'
            });
        }
        
        // Check if user has changed since token was issued
        const tokenIssued = new Date(req.user.iat * 1000);
        
        if (user.security.lastPasswordChange > tokenIssued) {
            return res.status(401).json({
                success: false,
                error: 'Sitzung nach Passwort-Änderung ungültig',
                code: 'SESSION_INVALIDATED'
            });
        }
        
        next();
        
    } catch (error) {
        log.error('Session validation error', error, {
            userId: req.user.id
        });
        
        res.status(500).json({
            success: false,
            error: 'Sitzungsvalidierungsfehler',
            code: 'SESSION_VALIDATION_ERROR'
        });
    }
};

// ========================================
// ADMIN MIDDLEWARE
// ========================================

const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentifizierung erforderlich',
            code: 'AUTH_REQUIRED'
        });
    }
    
    // Check if user is admin (you might store this in user model)
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
    
    if (!adminEmails.includes(req.user.email)) {
        log.warn('Non-admin attempted admin access', {
            userId: req.user.id,
            email: req.user.email,
            path: req.path,
            ip: req.ip
        });
        
        return res.status(403).json({
            success: false,
            error: 'Administrator-Berechtigung erforderlich',
            code: 'ADMIN_REQUIRED'
        });
    }
    
    next();
};

// ========================================
// RATE LIMITING BY USER
// ========================================

const createUserRateLimit = (windowMs, maxRequests) => {
    const userRequests = new Map();
    
    return (req, res, next) => {
        if (!req.user) {
            return next();
        }
        
        const userId = req.user.id;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Get or create user request history
        let userHistory = userRequests.get(userId) || [];
        
        // Remove old requests outside the window
        userHistory = userHistory.filter(timestamp => timestamp > windowStart);
        
        // Check if user has exceeded the limit
        if (userHistory.length >= maxRequests) {
            log.warn('User rate limit exceeded', {
                userId,
                requestCount: userHistory.length,
                maxRequests,
                windowMs,
                path: req.path
            });
            
            return res.status(429).json({
                success: false,
                error: 'Zu viele Anfragen',
                code: 'USER_RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil((userHistory[0] + windowMs - now) / 1000)
            });
        }
        
        // Add current request to history
        userHistory.push(now);
        userRequests.set(userId, userHistory);
        
        // Clean up old entries periodically
        if (Math.random() < 0.1) { // 10% chance
            for (const [id, history] of userRequests.entries()) {
                const cleanHistory = history.filter(timestamp => timestamp > windowStart);
                if (cleanHistory.length === 0) {
                    userRequests.delete(id);
                } else {
                    userRequests.set(id, cleanHistory);
                }
            }
        }
        
        next();
    };
};

// ========================================
// SECURITY HEADERS MIDDLEWARE
// ========================================

const securityHeaders = (req, res, next) => {
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add CSRF protection header
    if (req.user) {
        res.setHeader('X-User-ID', req.user.id);
    }
    
    next();
};

// ========================================
// DEVELOPMENT MIDDLEWARE
// ========================================

const devOnly = (req, res, next) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(404).json({
            success: false,
            error: 'Endpoint nicht verfügbar',
            code: 'NOT_AVAILABLE'
        });
    }
    
    next();
};

// ========================================
// EXPORTS
// ========================================

module.exports = {
    requireAuth,
    optionalAuth,
    requireRole,
    requireFeature,
    requireOwnership,
    requireApiKey,
    validateSession,
    requireAdmin,
    createUserRateLimit,
    securityHeaders,
    devOnly
};