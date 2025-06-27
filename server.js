const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import database connection
const database = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
database.connect();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Basic routes first
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/chat.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Test route to check if server works
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Server funktioniert!', 
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
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            server: 'healthy',
            database: { status: 'error', message: error.message },
            timestamp: new Date().toISOString()
        });
    }
});

// API Routes

// Chat Model für Referenz laden
try {
    require('./src/models/Chat');
    console.log('✅ Chat model loaded successfully');
} catch (error) {
    console.log('⚠️ Chat model not loaded:', error.message);
}

try {
    const authRoutes = require('./src/routes/auth');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes loaded successfully');
} catch (error) {
    console.log('⚠️ Auth routes not loaded:', error.message);
}

try {
    const chatRoutes = require('./src/routes/chat');
    app.use('/api/chat', chatRoutes);
    console.log('✅ Chat routes loaded successfully');
} catch (error) {
    console.log('⚠️ Chat routes not loaded:', error.message);
}

// Profile Routes hinzufügen
try {
    const profileRoutes = require('./src/routes/profiles');
    app.use('/api/profiles', profileRoutes);
    console.log('✅ Profile routes loaded successfully');
} catch (error) {
    console.log('⚠️ Profile routes not loaded:', error.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        error: 'Etwas ist schief gelaufen!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route nicht gefunden',
        path: req.path 
    });
});

// Server starten
app.listen(PORT, () => {
    console.log(`🚀 Server läuft auf Port ${PORT}`);
    console.log(`🌐 Zugriff unter: http://localhost:${PORT}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
});