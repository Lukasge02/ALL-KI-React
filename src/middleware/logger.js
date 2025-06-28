/**
 * 📊 LOGGER MIDDLEWARE
 * Structured logging for All-KI
 * 
 * FILE: src/middleware/logger.js
 */

const isDev = process.env.NODE_ENV === 'development';

// ========================================
// COLOR CODES FOR CONSOLE
// ========================================
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
};

// ========================================
// METHOD COLORS
// ========================================
const getMethodColor = (method) => {
    const methodColors = {
        GET: colors.green,
        POST: colors.blue,
        PUT: colors.yellow,
        DELETE: colors.red,
        PATCH: colors.magenta,
        OPTIONS: colors.gray
    };
    return methodColors[method] || colors.white;
};

// ========================================
// STATUS CODE COLORS
// ========================================
const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return colors.green;
    if (status >= 300 && status < 400) return colors.cyan;
    if (status >= 400 && status < 500) return colors.yellow;
    if (status >= 500) return colors.red;
    return colors.white;
};

// ========================================
// FORMAT DURATION
// ========================================
const formatDuration = (duration) => {
    if (duration < 1) return `${(duration * 1000).toFixed(0)}μs`;
    if (duration < 100) return `${duration.toFixed(1)}ms`;
    if (duration < 1000) return `${duration.toFixed(0)}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
};

// ========================================
// LOGGER MIDDLEWARE
// ========================================
const logger = (req, res, next) => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    // Skip logging for static files in production
    if (!isDev && req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        return next();
    }
    
    // Override res.end to capture response
    const originalEnd = res.end;
    
    res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        
        // Log format
        const methodColor = getMethodColor(req.method);
        const statusColor = getStatusColor(status);
        const durationColor = duration > 1000 ? colors.red : duration > 500 ? colors.yellow : colors.green;
        
        if (isDev) {
            // Development: Colorful console logging
            console.log(
                `${colors.gray}[${timestamp.slice(11, 19)}]${colors.reset} ` +
                `${methodColor}${req.method.padEnd(7)}${colors.reset} ` +
                `${statusColor}${status}${colors.reset} ` +
                `${durationColor}${formatDuration(duration).padStart(8)}${colors.reset} ` +
                `${colors.cyan}${req.originalUrl}${colors.reset}` +
                (req.ip !== '::1' && req.ip !== '127.0.0.1' ? ` ${colors.gray}[${req.ip}]${colors.reset}` : '')
            );
        } else {
            // Production: JSON structured logging
            const logData = {
                timestamp,
                method: req.method,
                url: req.originalUrl,
                status,
                duration,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                referer: req.get('Referer'),
                contentLength: res.get('Content-Length')
            };
            
            // Add user info if available
            if (req.user) {
                logData.userId = req.user.id;
                logData.userEmail = req.user.email;
            }
            
            console.log(JSON.stringify(logData));
        }
        
        // Call original end
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

// ========================================
// CUSTOM LOGGERS
// ========================================
const log = {
    info: (message, data = {}) => {
        const timestamp = new Date().toISOString();
        if (isDev) {
            console.log(`${colors.blue}ℹ${colors.reset} ${colors.white}${message}${colors.reset}`, data);
        } else {
            console.log(JSON.stringify({ level: 'info', timestamp, message, ...data }));
        }
    },
    
    warn: (message, data = {}) => {
        const timestamp = new Date().toISOString();
        if (isDev) {
            console.warn(`${colors.yellow}⚠${colors.reset} ${colors.yellow}${message}${colors.reset}`, data);
        } else {
            console.warn(JSON.stringify({ level: 'warn', timestamp, message, ...data }));
        }
    },
    
    error: (message, error = {}, data = {}) => {
        const timestamp = new Date().toISOString();
        if (isDev) {
            console.error(`${colors.red}❌${colors.reset} ${colors.red}${message}${colors.reset}`);
            if (error.stack) console.error(colors.red + error.stack + colors.reset);
            if (Object.keys(data).length) console.error(data);
        } else {
            console.error(JSON.stringify({
                level: 'error',
                timestamp,
                message,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                },
                ...data
            }));
        }
    },
    
    success: (message, data = {}) => {
        const timestamp = new Date().toISOString();
        if (isDev) {
            console.log(`${colors.green}✅${colors.reset} ${colors.green}${message}${colors.reset}`, data);
        } else {
            console.log(JSON.stringify({ level: 'success', timestamp, message, ...data }));
        }
    },
    
    debug: (message, data = {}) => {
        if (!isDev) return; // Only log debug in development
        
        const timestamp = new Date().toISOString();
        console.log(`${colors.gray}🔧${colors.reset} ${colors.gray}${message}${colors.reset}`, data);
    }
};

module.exports = logger;
module.exports.log = log;