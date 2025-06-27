const mongoose = require('mongoose');

class DatabaseManager {
    constructor() {
        this.isConnected = false;
    }

    async connect() {
        if (this.isConnected) {
            console.log('📦 Database already connected');
            return;
        }

        if (!process.env.MONGODB_URI) {
            console.warn('⚠️ MONGODB_URI not found in environment variables');
            console.log('💡 Using in-memory storage (data will be lost on restart)');
            return;
        }

        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });

            this.isConnected = true;
            console.log('✅ Connected to MongoDB Atlas');
            
            // Handle connection events
            mongoose.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('📦 MongoDB disconnected');
                this.isConnected = false;
            });

            // Graceful shutdown
            process.on('SIGINT', async () => {
                await mongoose.connection.close();
                console.log('📦 MongoDB connection closed through app termination');
                process.exit(0);
            });

        } catch (error) {
            console.error('❌ Failed to connect to MongoDB:', error.message);
            console.log('💡 Continuing with in-memory storage');
        }
    }

    async disconnect() {
        if (this.isConnected) {
            await mongoose.connection.close();
            this.isConnected = false;
            console.log('📦 Disconnected from MongoDB');
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            name: mongoose.connection.name
        };
    }

    // Health check method
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return { status: 'disconnected', message: 'Not connected to database' };
            }

            // Simple ping to database
            await mongoose.connection.db.admin().ping();
            
            return { 
                status: 'healthy', 
                message: 'Database connection is working',
                details: this.getConnectionStatus()
            };
        } catch (error) {
            return { 
                status: 'error', 
                message: 'Database health check failed',
                error: error.message 
            };
        }
    }

    // Get database statistics
    async getStats() {
        try {
            if (!this.isConnected) {
                return { error: 'Not connected to database' };
            }

            const User = require('../models/User');
            const Profile = require('../models/Profile');

            const userCount = await User.countDocuments();
            const profileCount = await Profile.countDocuments();
            
            const recentUsers = await User.countDocuments({
                updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            });

            return {
                users: {
                    total: userCount,
                    active24h: recentUsers
                },
                profiles: {
                    total: profileCount,
                    avgPerUser: userCount > 0 ? (profileCount / userCount).toFixed(2) : 0
                },
                connection: this.getConnectionStatus()
            };
        } catch (error) {
            return { error: error.message };
        }
    }
}

module.exports = new DatabaseManager();