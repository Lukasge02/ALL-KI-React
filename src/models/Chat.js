const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    profileId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Profile', 
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    title: { 
        type: String, 
        required: true, 
        default: 'Neuer Chat' 
    },
    messages: [{
        role: { 
            type: String, 
            enum: ['user', 'assistant'], 
            required: true 
        },
        content: { 
            type: String, 
            required: true 
        },
        timestamp: { 
            type: Date, 
            default: Date.now 
        }
    }],
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Update the updatedAt field before saving
ChatSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Chat', ChatSchema);