/**
 * 🔐 AUTH ROUTES MIT BCRYPT DEBUG
 * ERSETZEN IN: src/routes/auth.js
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const database = require('../config/database');

console.log('✅ Auth routes: Setting up with debug...');

// Fallback-Speicher für den Fall, dass MongoDB nicht verfügbar ist
const fallbackUsers = [];

// ========================================
// REGISTER ROUTE MIT DEBUG
// ========================================
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword } = req.body;

        console.log('📝 Register attempt:', { 
            firstName, 
            lastName, 
            email, 
            passwordLength: password?.length,
            confirmPasswordLength: confirmPassword?.length,
            passwordsMatch: password === confirmPassword
        });

        // DETAILED Backend Validation
        if (!firstName || !lastName || !email || !password) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ 
                error: 'Alle Felder sind erforderlich' 
            });
        }

        // Password confirmation check (optional - frontend should handle this)
        if (confirmPassword && password !== confirmPassword) {
            console.log('❌ Backend password mismatch detected');
            console.log(`   Password: "${password}" (${password.length} chars)`);
            console.log(`   Confirm:  "${confirmPassword}" (${confirmPassword.length} chars)`);
            return res.status(400).json({ 
                error: 'Passwörter stimmen nicht überein' 
            });
        }

        if (password.length < 6) {
            console.log('❌ Password too short:', password.length);
            return res.status(400).json({ 
                error: 'Passwort muss mindestens 6 Zeichen haben' 
            });
        }

        // Check if database is connected
        if (!database.isConnected) {
            console.log('⚠️ Database not connected, using fallback storage');
            return handleRegistrationFallback(req, res);
        }

        // Prüfen ob User bereits existiert
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            console.log('❌ User already exists:', email);
            return res.status(409).json({ 
                error: 'Ein Benutzer mit dieser E-Mail existiert bereits' 
            });
        }

        // BCRYPT DEBUG
        console.log('🔐 Starting bcrypt hashing...');
        console.log(`   Original password: "${password}" (${password.length} chars)`);
        
        const saltRounds = 12;
        console.log(`   Salt rounds: ${saltRounds}`);
        
        const startTime = Date.now();
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const hashTime = Date.now() - startTime;
        
        console.log(`✅ Bcrypt hashing completed in ${hashTime}ms`);
        console.log(`   Hashed password: ${hashedPassword.substring(0, 20)}...`);
        console.log(`   Hash length: ${hashedPassword.length} chars`);

        // VERIFICATION TEST
        console.log('🔍 Testing bcrypt verification immediately...');
        const verifyTest = await bcrypt.compare(password, hashedPassword);
        console.log(`   Immediate verification test: ${verifyTest ? '✅ PASS' : '❌ FAIL'}`);
        
        if (!verifyTest) {
            console.error('🚨 CRITICAL: bcrypt verification failed immediately after hashing!');
            return res.status(500).json({ 
                error: 'Passwort-Verschlüsselung fehlgeschlagen' 
            });
        }

        // Neuen User erstellen
        const newUser = new User({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password: hashedPassword,
            preferences: {
                theme: 'dark',
                language: 'de',
                notifications: false,
                aiModel: 'gpt-3.5-turbo'
            }
        });

        console.log('💾 Saving user to MongoDB...');
        const savedUser = await newUser.save();
        console.log('✅ User saved with ID:', savedUser._id);

        // FINAL VERIFICATION TEST
        console.log('🔍 Final verification test with saved user...');
        const finalTest = await bcrypt.compare(password, savedUser.password);
        console.log(`   Final verification test: ${finalTest ? '✅ PASS' : '❌ FAIL'}`);

        console.log('✅ User registered successfully in MongoDB:', email);

        // Erfolgreiche Registrierung
        res.status(201).json({
            success: true,
            message: 'Erfolgreich registriert',
            token: 'jwt-token-' + Date.now(), // In Produktion: echtes JWT verwenden
            user: {
                id: savedUser._id,
                email: savedUser.email,
                name: savedUser.fullName || `${savedUser.firstName} ${savedUser.lastName}`
            }
        });

    } catch (error) {
        console.error('❌ Register error:', error);
        
        // MongoDB-spezifische Fehler behandeln
        if (error.code === 11000) {
            return res.status(409).json({ 
                error: 'Ein Benutzer mit dieser E-Mail existiert bereits' 
            });
        }
        
        res.status(500).json({ error: 'Server-Fehler bei der Registrierung: ' + error.message });
    }
});

// ========================================
// LOGIN ROUTE MIT DEBUG
// ========================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔑 Login attempt:', { 
            email, 
            passwordLength: password?.length,
            passwordPreview: password?.substring(0, 3) + '***'
        });

        // Validierung
        if (!email || !password) {
            console.log('❌ Missing email or password');
            return res.status(400).json({ 
                error: 'E-Mail und Passwort sind erforderlich' 
            });
        }

        // Check if database is connected
        if (!database.isConnected) {
            console.log('⚠️ Database not connected, using fallback storage');
            return handleLoginFallback(req, res);
        }

        // User suchen
        console.log('🔍 Searching for user:', email);
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ 
                error: 'Ungültige Anmeldedaten' 
            });
        }

        console.log('✅ User found:', {
            id: user._id,
            email: user.email,
            hasPassword: !!user.password,
            passwordLength: user.password?.length,
            passwordPreview: user.password?.substring(0, 20) + '...'
        });

        // BCRYPT VERIFICATION DEBUG
        console.log('🔐 Starting bcrypt verification...');
        console.log(`   Input password: "${password}" (${password.length} chars)`);
        console.log(`   Stored hash: ${user.password.substring(0, 20)}... (${user.password.length} chars)`);
        
        const startTime = Date.now();
        const isPasswordValid = await bcrypt.compare(password, user.password);
        const verifyTime = Date.now() - startTime;
        
        console.log(`🔍 Bcrypt verification completed in ${verifyTime}ms`);
        console.log(`   Result: ${isPasswordValid ? '✅ VALID' : '❌ INVALID'}`);
        
        if (!isPasswordValid) {
            console.log('❌ Password verification failed for user:', email);
            
            // EXTRA DEBUG: Manual character comparison
            console.log('🔍 Debug info:');
            console.log(`   Input chars: ${password.split('').map(c => c.charCodeAt(0)).join(',')}`);
            console.log(`   Input length: ${password.length}`);
            console.log(`   Hash format looks valid: ${user.password.startsWith('$2')}`);
            
            return res.status(401).json({ 
                error: 'Ungültige Anmeldedaten' 
            });
        }

        console.log('✅ Password verification successful for user:', email);

        // Erfolgreiche Anmeldung
        const loginResponse = {
            success: true,
            message: 'Erfolgreich angemeldet',
            token: 'jwt-token-' + Date.now(),
            user: {
                id: user._id,
                email: user.email,
                name: user.fullName || `${user.firstName} ${user.lastName}`,
                firstName: user.firstName,
                lastName: user.lastName
            }
        };

        console.log('✅ Login successful for:', email);
        console.log('📤 Sending response:', { ...loginResponse, token: 'jwt-token-***' });

        res.json(loginResponse);

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Server-Fehler beim Anmelden: ' + error.message });
    }
});

// ========================================
// FALLBACK FUNCTIONS (simplified)
// ========================================
function handleRegistrationFallback(req, res) {
    const { firstName, lastName, email, password } = req.body;
    
    console.log('📝 Fallback registration for:', email);
    
    // Prüfen ob User bereits existiert
    const existingUser = fallbackUsers.find(u => u.email === email.toLowerCase());
    if (existingUser) {
        return res.status(409).json({ 
            error: 'Ein Benutzer mit dieser E-Mail existiert bereits' 
        });
    }

    // Neuen User erstellen (OHNE bcrypt für Fallback)
    const newUser = {
        id: Date.now().toString(),
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email: email.toLowerCase(),
        password, // Plain text in fallback mode!
        createdAt: new Date()
    };

    fallbackUsers.push(newUser);

    console.log('✅ User registered successfully (fallback):', email);

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
    
    console.log('🔑 Fallback login for:', email);
    
    // User suchen (Plain text comparison in fallback)
    const user = fallbackUsers.find(u => 
        u.email === email.toLowerCase() && u.password === password
    );

    if (!user) {
        console.log('❌ Fallback login failed for:', email);
        return res.status(401).json({ 
            error: 'Ungültige Anmeldedaten' 
        });
    }

    console.log('✅ Fallback login successful for:', email);

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

// ========================================
// UTILITY ROUTES
// ========================================
router.get('/debug', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'Nur in Development verfügbar' });
    }
    
    try {
        let userCount = 0;
        let users = [];
        
        if (database.isConnected) {
            userCount = await User.countDocuments();
            users = await User.find({}, 'firstName lastName email createdAt').limit(5).lean();
        } else {
            userCount = fallbackUsers.length;
            users = fallbackUsers.slice(0, 5);
        }
        
        res.json({
            database: {
                connected: database.isConnected,
                type: database.isConnected ? 'MongoDB' : 'Fallback Array'
            },
            users: {
                total: userCount,
                sample: users.map(u => ({
                    id: u._id || u.id,
                    name: u.fullName || u.name || `${u.firstName} ${u.lastName}`,
                    email: u.email,
                    hasPassword: !!u.password,
                    passwordLength: u.password?.length,
                    createdAt: u.createdAt
                }))
            },
            bcrypt: {
                version: require('bcryptjs/package.json').version,
                test: await bcrypt.compare('test123', await bcrypt.hash('test123', 12))
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/status', async (req, res) => {
    try {
        let userCount = 0;
        
        if (database.isConnected) {
            userCount = await User.countDocuments();
        } else {
            userCount = fallbackUsers.length;
        }
        
        res.json({
            database: {
                connected: database.isConnected,
                status: database.isConnected ? 'connected' : 'disconnected'
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

router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Erfolgreich abgemeldet'
    });
});

console.log('✅ Auth routes: All routes configured with debug');

module.exports = router;