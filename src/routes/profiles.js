const express = require('express');
const router = express.Router();

console.log('✅ Profile routes: Basic setup complete');

// First, let's try adding dependencies one by one
try {
    const mongoose = require('mongoose');
    console.log('✅ Profile routes: mongoose imported');
    
    const Profile = require('../models/Profile');
    console.log('✅ Profile routes: Profile model imported');
    
    const User = require('../models/User');
    console.log('✅ Profile routes: User model imported');
    
    const openaiService = require('../services/openai');
    console.log('✅ Profile routes: OpenAI service imported');
    
    // Try to import Chat model - this might be the issue
    const Chat = require('../models/Chat');
    console.log('✅ Profile routes: Chat model imported');
    
} catch (error) {
    console.error('❌ Profile routes: Error importing dependencies:', error.message);
    console.error('❌ Full error:', error);
}

// Middleware to extract user from token
const getUserFromToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Kein Token bereitgestellt' });
        }

        const userEmail = req.headers['x-user-email'];
        
        if (!userEmail) {
            return res.status(401).json({ error: 'Benutzer nicht identifizierbar' });
        }

        const User = require('../models/User');
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(401).json({ error: 'Benutzer nicht gefunden' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Ungültiger Token' });
    }
};

console.log('✅ Profile routes: Middleware defined');

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Profile routes are working!' });
});

// Get all profiles for a user
router.get('/', getUserFromToken, async (req, res) => {
    try {
        const Profile = require('../models/Profile');
        const profiles = await Profile.find({ userId: req.user._id })
            .select('name category profileData stats createdAt updatedAt')
            .sort({ updatedAt: -1 });

        console.log(`Found ${profiles.length} profiles for user ${req.user.email}`);

        res.json({
            success: true,
            profiles: profiles,
            total: profiles.length
        });
    } catch (error) {
        console.error('Get Profiles Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Profile' });
    }
});

// Get specific profile
router.get('/:profileId', getUserFromToken, async (req, res) => {
    try {
        const Profile = require('../models/Profile');
        const profile = await Profile.findOne({
            _id: req.params.profileId,
            userId: req.user._id
        });

        if (!profile) {
            return res.status(404).json({ error: 'Profil nicht gefunden' });
        }

        res.json({
            success: true,
            profile: profile
        });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden des Profils' });
    }
});

// Helper function to extract topics from text
function extractTopics(text) {
    const commonTopics = [
        'arbeit', 'gesundheit', 'lernen', 'sport', 'kochen', 'reisen', 
        'technologie', 'beziehungen', 'finanzen', 'kreativität'
    ];
    
    const lowerText = text.toLowerCase();
    return commonTopics.filter(topic => 
        lowerText.includes(topic) || lowerText.includes(topic.slice(0, -1))
    );
}

console.log('✅ Profile routes: All routes and functions defined');

module.exports = router;

console.log('✅ Profile routes: Module exported successfully');