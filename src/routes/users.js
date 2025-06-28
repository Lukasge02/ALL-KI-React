/**
 * 👤 USER ROUTES
 * API Endpoints für User-Management
 * 
 * SEPARATION OF CONCERNS:
 * - User Preferences
 * - Profile Management
 * - Account Settings
 * - User Statistics
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Simple middleware for user authentication
const getUserFromToken = (req, res, next) => {
    // TODO: Implement proper JWT token validation
    // For now, mock user for development
    req.user = {
        _id: 'mock-user-id',
        email: 'ravellukas@gmx.de',
        firstName: 'Lukas',
        lastName: 'Geck'
    };
    next();
};

console.log('✅ User routes: Setting up routes...');

// ========================================
// USER PREFERENCES ROUTES
// ========================================

// Get user preferences
router.get('/preferences', getUserFromToken, async (req, res) => {
    try {
        console.log('📱 Get user preferences request');
        
        // Mock preferences for development
        const preferences = {
            theme: 'dark',
            language: 'de',
            notifications: {
                email: true,
                push: true,
                sms: false
            },
            privacy: {
                profileVisible: false,
                dataSharing: false
            },
            autoSave: true,
            autoRefresh: true,
            refreshInterval: 300000, // 5 minutes
            gridLayout: 'auto',
            compactMode: false,
            animationsEnabled: true
        };

        res.json({
            success: true,
            preferences: preferences
        });

    } catch (error) {
        console.error('Get User Preferences Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Benutzereinstellungen' });
    }
});

// Update user preferences
router.put('/preferences', getUserFromToken, async (req, res) => {
    try {
        console.log('💾 Update user preferences request:', req.body);
        
        const { preferences } = req.body;
        
        if (!preferences) {
            return res.status(400).json({ error: 'Preferences sind erforderlich' });
        }

        // TODO: Save to database
        // For now, just return success
        
        res.json({
            success: true,
            message: 'Einstellungen erfolgreich gespeichert',
            preferences: preferences
        });

    } catch (error) {
        console.error('Update User Preferences Error:', error);
        res.status(500).json({ error: 'Fehler beim Speichern der Benutzereinstellungen' });
    }
});

// ========================================
// USER PROFILE ROUTES
// ========================================

// Get user profile
router.get('/profile', getUserFromToken, async (req, res) => {
    try {
        console.log('👤 Get user profile request');
        
        // Mock user profile for development
        const userProfile = {
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            avatar: null,
            isActive: true,
            isVerified: false,
            lastLogin: new Date(),
            createdAt: new Date(),
            profileCount: 1,
            preferences: {
                theme: 'dark',
                language: 'de'
            }
        };

        res.json({
            success: true,
            user: userProfile
        });

    } catch (error) {
        console.error('Get User Profile Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden des Benutzerprofils' });
    }
});

// Update user profile
router.put('/profile', getUserFromToken, async (req, res) => {
    try {
        console.log('💾 Update user profile request:', req.body);
        
        const { firstName, lastName, avatar } = req.body;
        
        // TODO: Update user in database
        // For now, just return success
        
        const updatedUser = {
            id: req.user._id,
            firstName: firstName || req.user.firstName,
            lastName: lastName || req.user.lastName,
            email: req.user.email,
            avatar: avatar || null,
            updatedAt: new Date()
        };

        res.json({
            success: true,
            message: 'Profil erfolgreich aktualisiert',
            user: updatedUser
        });

    } catch (error) {
        console.error('Update User Profile Error:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Benutzerprofils' });
    }
});

// ========================================
// USER STATISTICS ROUTES
// ========================================

// Get user statistics
router.get('/stats', getUserFromToken, async (req, res) => {
    try {
        console.log('📊 Get user statistics request');
        
        // Mock statistics for development
        const stats = {
            totalProfiles: 1,
            totalChats: 5,
            totalMessages: 23,
            lastActivity: new Date(),
            favoriteCategory: 'fitness',
            averageSessionLength: 8.5, // minutes
            weeklyActivity: [
                { day: 'Mo', sessions: 2 },
                { day: 'Di', sessions: 1 },
                { day: 'Mi', sessions: 3 },
                { day: 'Do', sessions: 1 },
                { day: 'Fr', sessions: 2 },
                { day: 'Sa', sessions: 0 },
                { day: 'So', sessions: 1 }
            ]
        };

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('Get User Statistics Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Benutzerstatistiken' });
    }
});

// ========================================
// ACCOUNT MANAGEMENT ROUTES
// ========================================

// Delete user account (soft delete)
router.delete('/account', getUserFromToken, async (req, res) => {
    try {
        console.log('🗑️ Delete user account request');
        
        // TODO: Implement soft delete
        // For now, just return success
        
        res.json({
            success: true,
            message: 'Account erfolgreich deaktiviert'
        });

    } catch (error) {
        console.error('Delete Account Error:', error);
        res.status(500).json({ error: 'Fehler beim Löschen des Accounts' });
    }
});

// Export data (GDPR compliance)
router.get('/export', getUserFromToken, async (req, res) => {
    try {
        console.log('📤 Export user data request');
        
        // Mock export data
        const exportData = {
            user: {
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                email: req.user.email,
                createdAt: new Date(),
                lastLogin: new Date()
            },
            profiles: [
                {
                    name: 'Fitness Coach',
                    category: 'fitness',
                    createdAt: new Date(),
                    conversations: 5
                }
            ],
            preferences: {
                theme: 'dark',
                language: 'de'
            },
            exportedAt: new Date()
        };

        res.json({
            success: true,
            data: exportData,
            message: 'Daten erfolgreich exportiert'
        });

    } catch (error) {
        console.error('Export Data Error:', error);
        res.status(500).json({ error: 'Fehler beim Exportieren der Daten' });
    }
});

// ========================================
// DEVELOPMENT/DEBUG ROUTES
// ========================================

// Test route
router.get('/test', (req, res) => {
    res.json({ 
        message: 'User routes are working!',
        timestamp: new Date(),
        routes: [
            'GET /api/users/preferences',
            'PUT /api/users/preferences', 
            'GET /api/users/profile',
            'PUT /api/users/profile',
            'GET /api/users/stats',
            'DELETE /api/users/account',
            'GET /api/users/export'
        ]
    });
});

console.log('✅ User routes: All routes configured');

module.exports = router;