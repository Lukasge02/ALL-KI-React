/**
 * 🚀 ALL-KI SERVER - MODERN VERSION 2.0
 * Production-ready Express.js Server mit MongoDB, OpenAI Integration
 * 
 * SEPARATION OF CONCERNS:
 * ✅ Security & Rate Limiting
 * ✅ Performance Optimizations  
 * ✅ Modern Error Handling
 * ✅ Health Monitoring
 * ✅ Development Tools
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database connection
const database = require('./src/config/database');
const { errorHandler, notFound } = require('./src/middleware/errorMiddleware');
const logger = require('./src/middleware/logger');

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === 'development';

// ========================================
// STARTUP BANNER
// ========================================
console.log('\n' + '='.repeat(60));
console.log('🚀 ALL-KI SERVER - MODERN VERSION 2.0');
console.log('⚡ Starting with enhanced performance & security...');
console.log('='.repeat(60));

// ========================================
// SECURITY MIDDLEWARE
// ========================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.openai.com"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 1000 : 100, // Development: 1000, Production: 100 requests per windowMs
    message: {
        error: 'Zu viele Anfragen. Bitte versuche es später erneut.',
        retryAfter: '15 Minuten'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', limiter);

// API specific rate limiting
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: isDev ? 100 : 30, // 30 requests per minute
    message: {
        error: 'API Rate Limit erreicht. Bitte warte kurz.',
        retryAfter: '1 Minute'
    }
});

app.use('/api/chat', apiLimiter);
app.use('/api/profiles', apiLimiter);

// ========================================
// PERFORMANCE MIDDLEWARE
// ========================================
app.use(compression({
    level: 6,
    threshold: 1000,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

// ========================================
// DATABASE CONNECTION
// ========================================
const initializeDatabase = async () => {
    try {
        await database.connect();
        console.log('✅ Database connection established');
        
        // Database health check
        const health = await database.healthCheck();
        console.log(`📊 Database Health: ${health.status}`);
        
    } catch (error) {
        console.warn('⚠️  Database connection failed, running in fallback mode');
        console.warn(`   Error: ${error.message}`);
    }
};

initializeDatabase();

// ========================================
// CORS & BASIC MIDDLEWARE
// ========================================
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://your-domain.com' // Add your production domain
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || isDev) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

app.use(express.json({ 
    limit: isDev ? '50mb' : '10mb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            res.status(400).json({ error: 'Invalid JSON' });
            throw new Error('Invalid JSON');
        }
    }
}));

app.use(express.urlencoded({ 
    extended: true, 
    limit: isDev ? '50mb' : '10mb' 
}));

// ========================================
// LOGGING MIDDLEWARE
// ========================================
app.use(logger);

// ========================================
// STATIC FILE SERVING WITH CACHING
// ========================================
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: isDev ? 0 : '1d', // 1 day cache in production
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.set('Cache-Control', isDev ? 'no-cache' : 'public, max-age=86400');
        }
        if (path.endsWith('.css')) {
            res.set('Cache-Control', isDev ? 'no-cache' : 'public, max-age=86400');
        }
        if (path.match(/\.(jpg|jpeg|png|gif|ico|svg)$/)) {
            res.set('Cache-Control', 'public, max-age=604800'); // 1 week
        }
    }
}));

// ========================================
// HEALTH CHECK ROUTES
// ========================================
app.get('/api/health', async (req, res) => {
    try {
        const dbHealth = await database.healthCheck();
        const dbStats = await database.getStats();
        
        const healthCheck = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: require('./package.json').version,
            database: dbHealth,
            stats: dbStats,
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
            },
            node: process.version
        };
        
        res.status(200).json(healthCheck);
    } catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
            database: { status: 'error', message: error.message }
        });
    }
});

app.get('/api/metrics', (req, res) => {
    if (!isDev) {
        return res.status(403).json({ error: 'Metrics only available in development' });
    }
    
    res.json({
        process: {
            pid: process.pid,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        },
        server: {
            environment: process.env.NODE_ENV,
            port: PORT,
            timestamp: new Date().toISOString()
        }
    });
});

// ========================================
// FRONTEND ROUTES WITH SPA FALLBACK
// ========================================
const routes = {
    '/': 'login.html',
    '/login': 'login.html',
    '/dashboard': 'dashboard.html',
    '/chat': 'chat.html',
    '/widgets': 'widgets.html',
    '/profile': 'profile.html'
};

Object.entries(routes).forEach(([route, file]) => {
    app.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', file));
    });
});

// ========================================
// API ROUTES LOADING WITH ERROR HANDLING
// ========================================
console.log('📦 Loading Models & Routes...');

// Load models safely
const loadModel = (modelPath, modelName) => {
    try {
        require(modelPath);
        console.log(`✅ ${modelName} model loaded`);
        return true;
    } catch (error) {
        console.warn(`⚠️  ${modelName} model not loaded: ${error.message}`);
        return false;
    }
};

loadModel('./src/models/User', 'User');
loadModel('./src/models/Chat', 'Chat');
loadModel('./src/models/Profile', 'Profile');

// Load routes safely
const loadRoute = (routePath, routeName, apiPath) => {
    try {
        const route = require(routePath);
        app.use(apiPath, route);
        console.log(`✅ ${routeName} routes loaded -> ${apiPath}`);
        return true;
    } catch (error) {
        console.warn(`⚠️  ${routeName} routes not loaded: ${error.message}`);
        return false;
    }
};

loadRoute('./src/routes/auth', 'Auth', '/api/auth');
loadRoute('./src/routes/chat', 'Chat', '/api/chat');
loadRoute('./src/routes/profiles', 'Profile', '/api/profiles');
loadRoute('./src/routes/users', 'User', '/api/users');
loadRoute('./src/routes/widgets', 'Widget', '/api/widgets');

// ========================================
// TEST ROUTES (Development Only)
// ========================================
if (isDev) {
    app.get('/test', (req, res) => {
        res.json({ 
            message: '🚀 All-KI Server läuft perfekt!',
            version: '2.0',
            features: [
                '⚡ Performance optimiert',
                '🔒 Security enhanced', 
                '📊 Health monitoring',
                '🎨 Modern UI ready',
                '📱 PWA support'
            ],
            timestamp: new Date().toISOString(),
            uptime: `${Math.floor(process.uptime())} Sekunden`
        });
    });
    
    app.get('/api/debug', (req, res) => {
        res.json({
            headers: req.headers,
            query: req.query,
            params: req.params,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });
    });
}

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================

// API 404 handler
app.use('/api/*', notFound);

// SPA fallback for unmatched routes
app.get('*', (req, res) => {
    // Serve index.html for unmatched routes (SPA behavior)
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Global error handler
app.use(errorHandler);

// ========================================
// SERVER STARTUP & GRACEFUL SHUTDOWN
// ========================================
const server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 All-KI Server running on Port ${PORT}`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`🧪 Test: http://localhost:${PORT}/test`);
    console.log(`💬 Chat: http://localhost:${PORT}/chat`);
    console.log(`📱 Dashboard: http://localhost:${PORT}/dashboard`);
    if (isDev) {
        console.log(`🔧 Debug: http://localhost:${PORT}/api/debug`);
        console.log(`📊 Metrics: http://localhost:${PORT}/api/metrics`);
    }
    console.log('='.repeat(60));
    console.log('✅ Server ready for connections!');
    console.log('🎯 Features: Security ✓ | Performance ✓ | Monitoring ✓\n');
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
    console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
    
    server.close(async () => {
        console.log('📴 HTTP server closed');
        
        try {
            await database.disconnect();
            console.log('🔌 Database disconnected');
        } catch (error) {
            console.error('❌ Database disconnect error:', error);
        }
        
        console.log('👋 All-KI Server shutdown complete');
        process.exit(0);
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejection handler
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    gracefulShutdown('Unhandled Promise Rejection');
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    gracefulShutdown('Uncaught Exception');
});

module.exports = app;