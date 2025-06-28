/**
 * 🚀 SERVER.JS - MONGODB CONNECTION FIX
 * EINFÜGEN/ERSETZEN IN: server.js (Database-Teil)
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Database Manager importieren
const database = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === 'development';

console.log('🗄️ DatabaseManager initialisiert');

// ========================================
// MIDDLEWARE SETUP
// ========================================

app.use(helmet({
    contentSecurityPolicy: isDev ? false : undefined,
    crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(cors({
    origin: isDev ? '*' : process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Request Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ========================================
// STARTUP SEQUENCE
// ========================================

async function startServer() {
    console.log('🚀 Starting All-KI Server...');
    
    // 1. Database Connection (mit Fallback)
    await database.connect();
    
    // 2. Models laden
    console.log('📦 Loading models...');
    
    const loadModel = (modelPath, modelName) => {
        try {
            require(modelPath);
            console.log(`✅ ${modelName} model loaded`);
            return true;
        } catch (error) {
            console.warn(`⚠️ ${modelName} model not loaded: ${error.message}`);
            return false;
        }
    };

    loadModel('./src/models/User', 'User');
    loadModel('./src/models/Chat', 'Chat');
    loadModel('./src/models/Profile', 'Profile');

    // 3. Routes laden
    console.log('🛣️ Loading API routes...');
    
    const loadRoute = (routePath, routeName, apiPath) => {
        try {
            const route = require(routePath);
            if (route && typeof route === 'function') {
                app.use(apiPath, route);
                console.log(`✅ ${routeName} routes loaded`);
                return true;
            } else {
                throw new Error('Router.use() requires a middleware function but got a Object');
            }
        } catch (error) {
            console.warn(`⚠️ ${routeName} routes not loaded: ${error.message}`);
            return false;
        }
    };

    // API Routes laden
    loadRoute('./src/routes/auth', 'Auth', '/api/auth');
    loadRoute('./src/routes/chat', 'Chat', '/api/chat');
    loadRoute('./src/routes/profiles', 'Profile', '/api/profiles');
    loadRoute('./src/routes/users', 'User', '/api/users');
    loadRoute('./src/routes/widgets', 'Widget', '/api/widgets');

    // 4. Health Check Route
    app.get('/api/health', (req, res) => {
        const dbStatus = database.getStatus();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
            database: {
                connected: dbStatus.isConnected,
                readyState: dbStatus.readyState,
                host: dbStatus.host
            },
            memory: process.memoryUsage()
        });
    });

    // 5. Frontend Routes
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

    // 6. Error Handling
    app.use((req, res) => {
        res.status(404).json({ error: 'Route nicht gefunden' });
    });

    app.use((err, req, res, next) => {
        console.error('❌ Server Error:', err.message);
        res.status(500).json({ 
            error: isDev ? err.message : 'Interner Server-Fehler' 
        });
    });

    // 7. Server starten
    const server = app.listen(PORT, () => {
        console.log('==================================================');
        console.log(`🚀 All-KI Server läuft auf Port ${PORT}`);
        console.log(`🌐 Frontend: http://localhost:${PORT}`);
        console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
        console.log(`🧪 Test Route: http://localhost:${PORT}/test`);
        console.log(`📱 Dashboard: http://localhost:${PORT}/dashboard`);
        console.log(`💬 Chat: http://localhost:${PORT}/chat`);
        console.log(`🧩 Widgets: http://localhost:${PORT}/widgets`);
        console.log('==================================================');
    });

    // Graceful Shutdown
    process.on('SIGTERM', async () => {
        console.log('🛑 SIGTERM received, shutting down gracefully');
        server.close(() => {
            console.log('👋 Server closed');
            database.disconnect();
            process.exit(0);
        });
    });

    process.on('SIGINT', async () => {
        console.log('🛑 SIGINT received, shutting down gracefully');
        server.close(() => {
            console.log('👋 Server closed');
            database.disconnect();
            process.exit(0);
        });
    });

    return server;
}

// ========================================
// SERVER STARTEN
// ========================================

startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});