const mongoose = require('mongoose');

class DatabaseManager {
    constructor() {
        this.isConnected = false;
        this.connection = null;
        this.connectionAttempts = 0;
        this.maxRetryAttempts = 5;
        this.retryDelay = 5000; // 5 seconds
        
        // MongoDB connection configuration
        this.mongoConfig = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // 10 seconds
            socketTimeoutMS: 45000, // 45 seconds
            maxPoolSize: 10, // Maintain up to 10 socket connections
            minPoolSize: 5, // Maintain a minimum of 5 socket connections
            maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
            bufferMaxEntries: 0 // Disable mongoose buffering
        };
        
        console.log('🗄️ DatabaseManager initialisiert');
    }

    // Get MongoDB connection string from environment
    getConnectionString() {
        // Try different environment variable names
        const mongoUri = 
            process.env.MONGODB_URI || 
            process.env.MONGO_URI || 
            process.env.DATABASE_URL ||
            'mongodb://localhost:27017/all-ki-dev';
        
        return mongoUri;
    }

    // Main connection method
    async connect() {
        try {
            const connectionString = this.getConnectionString();
            console.log(`🔌 Verbinde mit MongoDB...`);
            console.log(`📍 Connection String: ${connectionString.replace(/\/\/.*:.*@/, '//***:***@')}`); // Hide credentials in logs
            
            // Connect to MongoDB
            this.connection = await mongoose.connect(connectionString, this.mongoConfig);
            
            this.isConnected = true;
            this.connectionAttempts = 0;
            
            console.log('✅ MongoDB erfolgreich verbunden!');
            console.log(`📊 Database: ${this.connection.connection.name}`);
            console.log(`🏠 Host: ${this.connection.connection.host}:${this.connection.connection.port}`);
            
            // Set up connection event listeners
            this.setupEventListeners();
            
            // Test the connection with a simple operation
            await this.testConnection();
            
            return true;
            
        } catch (error) {
            console.error('❌ MongoDB Verbindungsfehler:', error.message);
            this.isConnected = false;
            this.connectionAttempts++;
            
            // Retry connection if under max attempts
            if (this.connectionAttempts < this.maxRetryAttempts) {
                console.log(`🔄 Retry ${this.connectionAttempts}/${this.maxRetryAttempts} in ${this.retryDelay/1000} Sekunden...`);
                setTimeout(() => this.connect(), this.retryDelay);
            } else {
                console.error('🚫 Maximale Anzahl von Verbindungsversuchen erreicht');
                console.log('⚡ Fallback-Modus aktiv - System läuft ohne Datenbank');
            }
            
            return false;
        }
    }

    // Set up MongoDB event listeners
    setupEventListeners() {
        const db = mongoose.connection;
        
        db.on('connected', () => {
            console.log('📡 MongoDB Verbindung hergestellt');
        });
        
        db.on('error', (error) => {
            console.error('💥 MongoDB Verbindungsfehler:', error);
            this.isConnected = false;
        });
        
        db.on('disconnected', () => {
            console.log('📴 MongoDB Verbindung getrennt');
            this.isConnected = false;
            
            // Try to reconnect
            if (this.connectionAttempts < this.maxRetryAttempts) {
                console.log('🔄 Versuche Reconnect...');
                this.connect();
            }
        });
        
        db.on('reconnected', () => {
            console.log('🔄 MongoDB erfolgreich reconnected');
            this.isConnected = true;
        });
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    // Test connection with a simple operation
    async testConnection() {
        try {
            await mongoose.connection.db.admin().ping();
            console.log('🏓 Database Ping erfolgreich');
            return true;
        } catch (error) {
            console.error('🏓 Database Ping fehlgeschlagen:', error.message);
            return false;
        }
    }

    // Disconnect from MongoDB
    async disconnect() {
        try {
            if (this.isConnected) {
                await mongoose.connection.close();
                this.isConnected = false;
                console.log('👋 MongoDB Verbindung geschlossen');
            }
        } catch (error) {
            console.error('❌ Fehler beim Schließen der MongoDB Verbindung:', error);
        }
    }

    // Get connection status details
    getConnectionStatus() {
        const connection = mongoose.connection;
        
        return {
            isConnected: this.isConnected,
            readyState: connection.readyState,
            readyStateText: this.getReadyStateText(connection.readyState),
            host: connection.host || 'unknown',
            port: connection.port || 'unknown',
            name: connection.name || 'unknown',
            collections: Object.keys(connection.collections || {}),
            connectionAttempts: this.connectionAttempts,
            maxRetryAttempts: this.maxRetryAttempts
        };
    }

    // Convert MongoDB ready state to human readable text
    getReadyStateText(state) {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        return states[state] || 'unknown';
    }

    // Health check method
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return { 
                    status: 'disconnected', 
                    message: 'Database not connected',
                    details: this.getConnectionStatus()
                };
            }

            // Perform ping test
            const pingResult = await this.testConnection();
            
            if (!pingResult) {
                return { 
                    status: 'error', 
                    message: 'Database ping failed',
                    details: this.getConnectionStatus()
                };
            }

            return { 
                status: 'healthy', 
                message: 'Database connection is working',
                details: this.getConnectionStatus()
            };
        } catch (error) {
            return { 
                status: 'error', 
                message: 'Database health check failed',
                error: error.message,
                details: this.getConnectionStatus()
            };
        }
    }

    // Get database statistics
    async getStats() {
        try {
            if (!this.isConnected) {
                return { error: 'Not connected to database' };
            }

            // Import models - only when needed to avoid circular dependencies
            const User = require('../models/User');
            const Profile = require('../models/Profile');
            const Chat = require('../models/Chat');

            // Parallel queries for better performance
            const [
                userCount,
                profileCount,
                chatCount,
                recentUsers,
                recentProfiles,
                recentChats
            ] = await Promise.all([
                User.countDocuments(),
                Profile.countDocuments(),
                Chat.countDocuments(),
                User.countDocuments({
                    'stats.lastActive': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }),
                Profile.countDocuments({
                    'stats.lastUsed': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }),
                Chat.countDocuments({
                    'stats.lastActivity': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                })
            ]);

            // Database size and collection stats
            const dbStats = await mongoose.connection.db.stats();
            
            return {
                users: {
                    total: userCount,
                    active24h: recentUsers
                },
                profiles: {
                    total: profileCount,
                    active24h: recentProfiles,
                    avgPerUser: userCount > 0 ? (profileCount / userCount).toFixed(2) : 0
                },
                chats: {
                    total: chatCount,
                    active24h: recentChats
                },
                database: {
                    name: dbStats.db,
                    collections: dbStats.collections,
                    documents: dbStats.objects,
                    avgObjSize: Math.round(dbStats.avgObjSize || 0),
                    dataSize: Math.round((dbStats.dataSize || 0) / 1024 / 1024), // MB
                    storageSize: Math.round((dbStats.storageSize || 0) / 1024 / 1024), // MB
                    indexes: dbStats.indexes,
                    indexSize: Math.round((dbStats.indexSize || 0) / 1024 / 1024) // MB
                },
                connection: this.getConnectionStatus(),
                performance: {
                    connectionAttempts: this.connectionAttempts,
                    uptime: Math.round(process.uptime()),
                    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) // MB
                }
            };
        } catch (error) {
            console.error('Database stats error:', error);
            return { 
                error: error.message,
                connection: this.getConnectionStatus()
            };
        }
    }

    // Advanced database operations
    async createIndexes() {
        try {
            if (!this.isConnected) {
                console.log('⚠️ Keine Datenbankverbindung - Indexes können nicht erstellt werden');
                return false;
            }

            console.log('🏗️ Erstelle Database-Indexes...');
            
            // Import models
            const User = require('../models/User');
            const Profile = require('../models/Profile');
            const Chat = require('../models/Chat');

            // Create indexes for all models
            await Promise.all([
                User.createIndexes(),
                Profile.createIndexes(),
                Chat.createIndexes()
            ]);

            console.log('✅ Database-Indexes erfolgreich erstellt');
            return true;
        } catch (error) {
            console.error('❌ Fehler beim Erstellen der Indexes:', error);
            return false;
        }
    }

    // Cleanup old data
    async cleanup() {
        try {
            if (!this.isConnected) {
                console.log('⚠️ Keine Datenbankverbindung für Cleanup');
                return false;
            }

            console.log('🧹 Starte Database Cleanup...');
            
            const Chat = require('../models/Chat');
            
            // Archive old chats (older than retention period)
            const oldChats = await Chat.updateMany(
                {
                    'stats.lastActivity': { 
                        $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days
                    },
                    status: 'active'
                },
                {
                    $set: { 
                        status: 'archived',
                        'archival.isArchived': true,
                        'archival.archivedAt': new Date()
                    }
                }
            );

            console.log(`🗂️ ${oldChats.modifiedCount} alte Chats archiviert`);
            
            // Remove very old archived chats (older than 1 year)
            const deletedChats = await Chat.deleteMany({
                'archival.isArchived': true,
                'archival.archivedAt': { 
                    $lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year
                }
            });

            console.log(`🗑️ ${deletedChats.deletedCount} sehr alte Chats gelöscht`);
            console.log('✅ Database Cleanup abgeschlossen');
            
            return true;
        } catch (error) {
            console.error('❌ Fehler beim Database Cleanup:', error);
            return false;
        }
    }
}

// Create and export singleton instance
const databaseManager = new DatabaseManager();

// Auto-create indexes on startup (with delay to allow connection)
setTimeout(async () => {
    if (databaseManager.isConnected) {
        await databaseManager.createIndexes();
    }
}, 5000);

// Schedule cleanup every 24 hours
setInterval(async () => {
    if (databaseManager.isConnected) {
        await databaseManager.cleanup();
    }
}, 24 * 60 * 60 * 1000); // 24 hours

module.exports = databaseManager;