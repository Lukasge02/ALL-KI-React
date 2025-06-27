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
    const dbHealth = await database.healthCheck();
    const dbStats = await database.getStats();
    
    res.json({
        server: 'healthy',
        database: dbHealth,
        stats: dbStats,
        timestamp: new Date().toISOString()
    });
});

// API Routes
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
    res.status(500).json({ error: 'Etwas ist schief gelaufen!' });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API Route nicht gefunden' });
});

// Start server
app.listen(PORT, () => {
    console.log('\n🚀 =================================');
    console.log(`   ALL-KI Server gestartet!`);
    console.log(`   Port: ${PORT}`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log('🚀 =================================\n');
    
    console.log('📄 Verfügbare Routes:');
    console.log(`   • http://localhost:${PORT}/ (Login)`);
    console.log(`   • http://localhost:${PORT}/dashboard`);
    console.log(`   • http://localhost:${PORT}/test`);
    console.log(`   • http://localhost:${PORT}/api/auth/users\n`);
});

module.exports = app;