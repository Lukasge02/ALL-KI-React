const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    preferences: {
        theme: { type: String, default: 'dark' },
        language: { type: String, default: 'de' },
        notifications: { type: Boolean, default: true },
        aiModel: { type: String, default: 'gpt-4o-mini' }
    },
    globalMemories: [{
        type: { type: String }, // 'preference', 'fact', 'goal', 'interest'
        content: String,
        confidence: { type: Number, default: 0.8 },
        createdAt: { type: Date, default: Date.now },
        lastReinforced: { type: Date, default: Date.now }
    }],
    stats: {
        totalConversations: { type: Number, default: 0 },
        totalProfiles: { type: Number, default: 0 },
        lastActive: { type: Date, default: Date.now },
        favoriteProfile: String
    }
}, {
    timestamps: true
});

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', UserSchema);