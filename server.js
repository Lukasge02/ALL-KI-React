/**
 * 🚀 ALL-KI SERVER - KORRIGIERTE VERSION
 * Express.js Server mit MongoDB, OpenAI Integration
 * 
 * SEPARATION OF CONCERNS:
 * - Database Connection
 * - Middleware Setup  
 * - Route Configuration
 * - Static File Serving
 * - Error Handling
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import database connection
const database = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting All-KI Server...');

// ========================================
// DATABASE CONNECTION
// ========================================
database.connect().then(() => {
    console.log('✅ Database connection established');
}).catch(error => {
    console.log('⚠️ Database connection failed, running in fallback mode');
});

// ========================================
// MIDDLEWARE SETUP
// ========================================
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ========================================
// STATIC FILE SERVING
// ========================================
app.use(express.static(path.join(__dirname, 'public')));

// ========================================
// BASIC ROUTES
// ========================================
// Root route - redirect to login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Chat page route
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Widgets page route
app.get('/widgets', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'widgets.html'));
});

// Alternative routes with .html extension
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/chat.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/widgets.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'widgets.html'));
});

// ========================================
// HEALTH CHECK & TEST ROUTES
// ========================================
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Server funktioniert!', 
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString() 
    });
});

// Database health check
app.get('/api/health', async (req, res) => {
    try {
        const dbHealth = await database.healthCheck();
        const dbStats = await database.getStats();
        
        res.json({
            server: 'healthy',
            database: dbHealth,
            stats: dbStats,
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            server: 'healthy',
            database: { status: 'error', message: error.message },
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        });
    }
});

// ========================================
// API ROUTES LOADING
// ========================================

// Load models first
console.log('📦 Loading models...');
try {
    require('./src/models/User');
    console.log('✅ User model loaded');
} catch (error) {
    console.log('⚠️ User model not loaded:', error.message);
}

try {
    require('./src/models/Chat');
    console.log('✅ Chat model loaded');
} catch (error) {
    console.log('⚠️ Chat model not loaded:', error.message);
}

try {
    require('./src/models/Profile');
    console.log('✅ Profile model loaded');
} catch (error) {
    console.log('⚠️ Profile model not loaded:', error.message);
}

// Load API routes
console.log('🛣️ Loading API routes...');

// Authentication routes
try {
    const authRoutes = require('./src/routes/auth');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded');
} catch (error) {
    console.log('⚠️ Auth routes not loaded:', error.message);
}

// Chat routes
try {
    const chatRoutes = require('./src/routes/chat');
    app.use('/api/chat', chatRoutes);
    console.log('✅ Chat routes loaded');
} catch (error) {
    console.log('⚠️ Chat routes not loaded:', error.message);
}

// Profile routes
try {
    const profileRoutes = require('./src/routes/profiles');
    app.use('/api/profiles', profileRoutes);
    console.log('✅ Profile routes loaded');
} catch (error) {
    console.log('⚠️ Profile routes not loaded:', error.message);
}

// User routes (für preferences etc.)
try {
    const userRoutes = require('./src/routes/users');
    app.use('/api/users', userRoutes);
    console.log('✅ User routes loaded');
} catch (error) {
    console.log('⚠️ User routes not loaded:', error.message);
}

// Widget routes
try {
    const widgetRoutes = require('./src/routes/widgets');
    app.use('/api/widgets', widgetRoutes);
    console.log('✅ Widget routes loaded');
} catch (error) {
    console.log('⚠️ Widget routes not loaded:', error.message);
}

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler für API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API Route nicht gefunden',
        path: req.path,
        method: req.method
    });
});

// 404 handler für andere routes
app.use((req, res) => {
    // Versuche entsprechende HTML-Datei zu finden
    const htmlPath = path.join(__dirname, 'public', req.path.endsWith('.html') ? req.path : req.path + '.html');
    
    // Wenn HTML-Datei existiert, sende sie
    require('fs').access(htmlPath, require('fs').constants.F_OK, (err) => {
        if (!err) {
            res.sendFile(htmlPath);
        } else {
            res.status(404).json({ 
                error: 'Seite nicht gefunden',
                path: req.path,
                suggestion: 'Versuche /dashboard, /chat oder /widgets'
            });
        }
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Unhandled Error:', err.stack);
    
    res.status(err.status || 500).json({ 
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

// ========================================
// SERVER START
// ========================================
const server = app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 All-KI Server läuft auf Port ${PORT}`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🧪 Test Route: http://localhost:${PORT}/test`);
    console.log(`📱 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`💬 Chat: http://localhost:${PORT}/chat`);
    console.log(`🧩 Widgets: http://localhost:${PORT}/widgets`);
    console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('👋 Server closed');
        database.disconnect();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('👋 Server closed');
        database.disconnect();
        process.exit(0);
    });
});

module.exports = app;