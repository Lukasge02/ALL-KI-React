const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const database = require('../config/database');

// Fallback-Speicher für den Fall, dass MongoDB nicht verfügbar ist
const fallbackUsers = [];

// Register Route
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, acceptNewsletter } = req.body;

        console.log('Register attempt:', { firstName, lastName, email, acceptNewsletter });

        // Validierung
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ 
                error: 'Alle Felder sind erforderlich' 
            });
        }

        // Check if database is connected
        if (!database.isConnected) {
            console.log('Database not connected, using fallback storage');
            return handleRegistrationFallback(req, res);
        }

        // Prüfen ob User bereits existiert
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ 
                error: 'Ein Benutzer mit dieser E-Mail existiert bereits' 
            });
        }

        // Passwort hashen
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Neuen User erstellen
        const newUser = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password: hashedPassword,
            preferences: {
                theme: 'dark',
                language: 'de',
                notifications: acceptNewsletter || false,
                aiModel: 'gpt-3.5-turbo'
            }
        });

        // User in MongoDB speichern
        const savedUser = await newUser.save();

        console.log('User registered successfully in MongoDB:', email);

        // Erfolgreiche Registrierung
        res.status(201).json({
            success: true,
            message: 'Erfolgreich registriert',
            token: 'jwt-token-' + Date.now(), // In Produktion: echtes JWT verwenden
            user: {
                id: savedUser._id,
                email: savedUser.email,
                name: savedUser.fullName
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        
        // MongoDB-spezifische Fehler behandeln
        if (error.code === 11000) {
            return res.status(409).json({ 
                error: 'Ein Benutzer mit dieser E-Mail existiert bereits' 
            });
        }
        
        res.status(500).json({ error: 'Server-Fehler bei der Registrierung' });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Login attempt:', { email, password: '***' });

        // Validierung
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'E-Mail und Passwort sind erforderlich' 
            });
        }

        // Check if database is connected
        if (!database.isConnected) {
            console.log('Database not connected, using fallback storage');
            return handleLoginFallback(req, res);
        }

        // User suchen
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({ 
                error: 'Ungültige Anmeldedaten' 
            });
        }

        // Passwort überprüfen
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ 
                error: 'Ungültige Anmeldedaten' 
            });
        }

        // Letzten Login aktualisieren
        if (user.stats) {
            user.stats.lastActive = new Date();
        } else {
            user.stats = { lastActive: new Date() };
        }
        await user.save();

        console.log('Login successful for:', email);

        // Erfolgreiche Anmeldung
        res.json({
            success: true,
            message: 'Erfolgreich angemeldet',
            token: 'jwt-token-' + Date.now(), // In Produktion: echtes JWT verwenden
            user: {
                id: user._id,
                email: user.email,
                name: user.fullName,
                preferences: user.preferences
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server-Fehler beim Anmelden' });
    }
});

// Fallback-Funktionen für den Fall, dass MongoDB nicht verbunden ist
function handleRegistrationFallback(req, res) {
    const { firstName, lastName, email, password, acceptNewsletter } = req.body;
    
    // Prüfen ob User bereits existiert
    const existingUser = fallbackUsers.find(u => u.email === email.toLowerCase());
    if (existingUser) {
        return res.status(409).json({ 
            error: 'Ein Benutzer mit dieser E-Mail existiert bereits' 
        });
    }

    // Neuen User erstellen
    const newUser = {
        id: Date.now().toString(),
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email: email.toLowerCase(),
        password, // In echter Anwendung: gehashed speichern!
        acceptNewsletter: acceptNewsletter || false,
        createdAt: new Date()
    };

    // User speichern (Fallback-Array)
    fallbackUsers.push(newUser);

    console.log('User registered successfully (fallback):', email);
    console.log('Total users now:', fallbackUsers.length);

    // Erfolgreiche Registrierung
    res.status(201).json({
        success: true,
        message: 'Erfolgreich registriert (Fallback-Modus)',
        token: 'fallback-jwt-token-' + Date.now(),
        user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name
        }
    });
}

function handleLoginFallback(req, res) {
    const { email, password } = req.body;
    
    // User suchen (Fallback-Array)
    const user = fallbackUsers.find(u => u.email === email.toLowerCase() && u.password === password);

    if (!user) {
        return res.status(401).json({ 
            error: 'Ungültige Anmeldedaten' 
        });
    }

    console.log('Login successful (fallback) for:', email);

    // Erfolgreiche Anmeldung
    res.json({
        success: true,
        message: 'Erfolgreich angemeldet (Fallback-Modus)',
        token: 'fallback-jwt-token-' + Date.now(),
        user: {
            id: user.id,
            email: user.email,
            name: user.name
        }
    });
}

// Status Route
router.get('/status', async (req, res) => {
    try {
        const dbStatus = database.getConnectionStatus();
        let userCount = 0;
        
        if (database.isConnected) {
            userCount = await User.countDocuments();
        } else {
            userCount = fallbackUsers.length;
        }
        
        res.json({
            database: {
                connected: dbStatus.isConnected,
                status: dbStatus.readyState,
                host: dbStatus.host,
                name: dbStatus.name
            },
            users: {
                total: userCount,
                storage: database.isConnected ? 'MongoDB' : 'Fallback Array'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout Route
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Erfolgreich abgemeldet'
    });
});

// Test Route - alle User anzeigen (nur für Development!)
router.get('/users', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'Nur in Development verfügbar' });
    }
    
    try {
        let users = [];
        
        if (database.isConnected) {
            const mongoUsers = await User.find({}, 'firstName lastName email createdAt').lean();
            users = mongoUsers.map(u => ({
                id: u._id,
                name: `${u.firstName} ${u.lastName}`,
                email: u.email,
                createdAt: u.createdAt
            }));
        } else {
            users = fallbackUsers.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                createdAt: u.createdAt
            }));
        }
        
        res.json({
            users: users,
            total: users.length,
            storage: database.isConnected ? 'MongoDB' : 'Fallback Array'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;