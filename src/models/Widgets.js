// NEUE DATEI: src/models/Widget.js
const mongoose = require('mongoose');

const widgetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['weather', 'news', 'calendar', 'tasks', 'notes', 'custom']
    },
    title: {
        type: String,
        required: true,
        maxlength: 100
    },
    question: {
        type: String,
        maxlength: 500
    },
    response: {
        type: String,
        maxlength: 2000
    },
    position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 }
    },
    size: {
        width: { type: Number, default: 4 },
        height: { type: Number, default: 3 }
    },
    settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Widget', widgetSchema);

// NEUE DATEI: src/models/Profile.js  
const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        maxlength: 50
    },
    category: {
        type: String,
        required: true,
        enum: ['general', 'fitness', 'cooking', 'work', 'study', 'health', 
               'travel', 'finance', 'tech', 'creative', 'support', 'entertainment']
    },
    description: {
        type: String,
        maxlength: 1000
    },
    goals: [{
        type: String,
        maxlength: 200
    }],
    preferences: [{
        type: String,
        maxlength: 200
    }],
    challenges: [{
        type: String,
        maxlength: 200
    }],
    experience: {
        type: String,
        enum: ['anfaenger', 'fortgeschritten', 'experte'],
        default: 'anfaenger'
    },
    frequency: {
        type: String,
        enum: ['taeglich', 'woechentlich', 'monatlich', 'gelegentlich'],
        default: 'woechentlich'
    },
    systemPrompt: {
        type: String,
        maxlength: 5000
    },
    avatar: String,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Profile', profileSchema);